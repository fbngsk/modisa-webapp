import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { SPECIES_LIST } from '@/lib/species';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Build species reference for prompt
const speciesReference = SPECIES_LIST.map(s => `- ${s.commonName} (${s.scientificName})`).join('\n');

const STAGE_1_PROMPT = `You are analyzing a camera trap image from the Kalahari Desert, Botswana.

TASK: Assess this image for animal presence and quality. Do NOT identify species yet.

Analyze and respond in this exact JSON format:
{
  "animal_present": true/false,
  "animal_count": number (0 if none),
  "multiple_species": true/false,
  "image_type": "daylight" | "infrared" | "flash",
  "image_quality": "good" | "moderate" | "poor",
  "quality_issues": ["list of issues if any"],
  "animal_visible_features": {
    "body_visible": true/false,
    "face_visible": true/false,
    "eye_shine": true/false,
    "approximate_size": "small" | "medium" | "large" | "unknown",
    "pattern_visible": "spots" | "stripes" | "solid" | "unclear" | "none"
  },
  "proceed_to_identification": true/false,
  "stage1_confidence": number between 0 and 1
}

RULES:
- For infrared/night images: eye shine (bright reflective eyes) is normal and helpful
- "poor" quality = animal barely visible, heavy blur, or extreme darkness
- Set proceed_to_identification to false if: no animal, quality is poor, or animal features insufficient
- Be conservative: if unsure whether animal is present, set animal_present to false

Respond ONLY with the JSON object, no other text.`;

const STAGE_2_PROMPT = `You are identifying wildlife species from a camera trap image from the Kalahari Desert, Botswana.

CONTEXT FROM STAGE 1:
{stage1_context}

KNOWN SPECIES IN THIS AREA:
${speciesReference}

TASK: Identify the species visible in this image.

IDENTIFICATION RULES:
1. ONLY identify species from the list above
2. For night/infrared images, use these clues:
   - Eye shine color and spacing
   - Body shape silhouette
   - Tail length and shape
   - Ear shape and position
   - Movement pattern if visible
   - Size relative to surroundings

3. KEY DISTINGUISHING FEATURES:
   - Genet: Long spotted body, very long banded tail, pointed face, small size
   - African Wildcat: Cat-like, solid/tabby pattern, shorter tail than genet
   - Civet: Larger than genet, banded pattern, shorter legs
   - Caracal: Ear tufts, solid color, medium size
   - Honey Badger: Low, stocky, white stripe on back
   - Aardwolf: Striped, pointed snout, mane along back
   - Scrub Hare: Long ears, sitting/hopping posture
   - Springhare: Kangaroo-like, large hind legs, hopping

4. CONFIDENCE THRESHOLDS:
   - Above 0.7: Confident identification
   - 0.4 to 0.7: Possible identification, needs review
   - Below 0.4: Cannot reliably identify

Respond in this exact JSON format:
{
  "species_id": "id-from-list or null",
  "common_name": "name or null",
  "scientific_name": "name or null", 
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation of identifying features observed",
  "alternative_species": [
    {"species_id": "id", "common_name": "name", "confidence": number}
  ],
  "needs_review": true/false,
  "review_reason": "why review needed, or null"
}

RULES:
- Set needs_review to true if confidence < 0.7
- Set needs_review to true if species might not be in the list
- If you cannot identify, set species_id to null and needs_review to true
- List up to 2 alternative species if uncertain
- Be honest about uncertainty - false positives are worse than "needs review"

Respond ONLY with the JSON object, no other text.`;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Extract base64 data
    const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
    const mimeType = image.includes('data:') 
      ? image.split(';')[0].split(':')[1] 
      : 'image/jpeg';

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    // ===== STAGE 1: Image Analysis =====
    const stage1Result = await model.generateContent([STAGE_1_PROMPT, imagePart]);
    const stage1Text = stage1Result.response.text();
    
    let stage1Data;
    try {
      const cleanedStage1 = stage1Text.replace(/```json\n?|\n?```/g, '').trim();
      stage1Data = JSON.parse(cleanedStage1);
    } catch {
      console.error('Stage 1 parse error:', stage1Text);
      return NextResponse.json({
        success: false,
        error: 'Failed to analyze image',
        stage: 1,
        needs_review: true,
      }, { status: 200 });
    }

    // Check if we should proceed to identification
    if (!stage1Data.proceed_to_identification) {
      return NextResponse.json({
        success: true,
        stage1: stage1Data,
        species: null,
        needs_review: !stage1Data.animal_present ? false : true,
        review_reason: stage1Data.animal_present 
          ? 'Image quality insufficient for reliable identification'
          : 'No animal detected in image',
        confidence: 0,
      });
    }

    // ===== STAGE 2: Species Identification =====
    const stage1Context = `
- Animal count: ${stage1Data.animal_count}
- Image type: ${stage1Data.image_type}
- Image quality: ${stage1Data.image_quality}
- Eye shine visible: ${stage1Data.animal_visible_features?.eye_shine}
- Approximate size: ${stage1Data.animal_visible_features?.approximate_size}
- Pattern: ${stage1Data.animal_visible_features?.pattern_visible}
- Body visible: ${stage1Data.animal_visible_features?.body_visible}
- Face visible: ${stage1Data.animal_visible_features?.face_visible}`;

    const stage2Prompt = STAGE_2_PROMPT.replace('{stage1_context}', stage1Context);
    
    const stage2Result = await model.generateContent([stage2Prompt, imagePart]);
    const stage2Text = stage2Result.response.text();

    let stage2Data;
    try {
      const cleanedStage2 = stage2Text.replace(/```json\n?|\n?```/g, '').trim();
      stage2Data = JSON.parse(cleanedStage2);
    } catch {
      console.error('Stage 2 parse error:', stage2Text);
      return NextResponse.json({
        success: true,
        stage1: stage1Data,
        species: null,
        needs_review: true,
        review_reason: 'Species identification failed',
        confidence: 0,
      });
    }

    // Validate species is in our list
    if (stage2Data.species_id) {
      const validSpecies = SPECIES_LIST.find(s => s.id === stage2Data.species_id);
      if (!validSpecies) {
        // Try to match by common name
        const matchByName = SPECIES_LIST.find(
          s => s.commonName.toLowerCase() === stage2Data.common_name?.toLowerCase()
        );
        if (matchByName) {
          stage2Data.species_id = matchByName.id;
        } else {
          stage2Data.needs_review = true;
          stage2Data.review_reason = 'Identified species not in database';
        }
      }
    }

    return NextResponse.json({
      success: true,
      stage1: stage1Data,
      species: stage2Data.species_id,
      common_name: stage2Data.common_name,
      scientific_name: stage2Data.scientific_name,
      confidence: stage2Data.confidence,
      reasoning: stage2Data.reasoning,
      alternatives: stage2Data.alternative_species,
      needs_review: stage2Data.needs_review,
      review_reason: stage2Data.review_reason,
    });

  } catch (error) {
    console.error('Identification error:', error);
    
    const isRateLimit = error instanceof Error && 
      (error.message.includes('429') || error.message.includes('quota'));
    
    return NextResponse.json(
      { 
        error: isRateLimit ? 'Rate limit exceeded' : 'Identification failed',
        retryable: isRateLimit,
        needs_review: true,
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
