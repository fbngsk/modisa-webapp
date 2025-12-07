import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SPECIES_LIST } from '@/lib/species';

// ============================================
// CONFIGURATION
// ============================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const CONFIG = {
  model: 'gemini-2.5-flash',
  maxRetries: 2,
  retryDelayMs: 1000,
  temperature: 0.1,
  // Confidence thresholds
  highConfidence: 0.7,
  lowConfidence: 0.4,
  // Night image penalty
  infraredPenalty: 0.15,
  flashOnlyPenalty: 0.2,
};

// ============================================
// VALIDATION SCHEMAS
// ============================================

const Stage1Schema = z.object({
  animal_present: z.boolean(),
  animal_count: z.number().int().min(0).default(0),
  multiple_species: z.boolean().default(false),
  image_type: z.enum(['daylight', 'infrared', 'flash']).default('daylight'),
  image_quality: z.enum(['good', 'moderate', 'poor']).default('moderate'),
  quality_issues: z.array(z.string()).default([]),
  animal_visible_features: z.object({
    body_visible: z.boolean().default(false),
    face_visible: z.boolean().default(false),
    eye_shine: z.boolean().default(false),
    approximate_size: z.enum(['small', 'medium', 'large', 'unknown']).default('unknown'),
    pattern_visible: z.enum(['spots', 'stripes', 'solid', 'unclear', 'none']).default('unclear'),
    body_percentage_visible: z.number().min(0).max(100).optional(),
  }).default({}),
  proceed_to_identification: z.boolean(),
  stage1_confidence: z.number().min(0).max(1).default(0),
  rejection_reason: z.string().optional(),
});

const Stage2Schema = z.object({
  species_id: z.string().nullable(),
  common_name: z.string().nullable(),
  scientific_name: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  identifying_features: z.array(z.string()).optional(),
  alternative_species: z.array(z.object({
    species_id: z.string(),
    common_name: z.string(),
    confidence: z.number().min(0).max(1),
  })).default([]),
  needs_review: z.boolean(),
  review_reason: z.string().nullable(),
});

type Stage1Data = z.infer<typeof Stage1Schema>;
type Stage2Data = z.infer<typeof Stage2Schema>;

// ============================================
// SPECIES REFERENCE
// ============================================

const speciesReference = SPECIES_LIST.map(s => 
  `- ${s.id}: ${s.commonName} (${s.scientificName})`
).join('\n');

// ============================================
// PROMPTS
// ============================================

const STAGE_1_PROMPT = `You are analyzing a camera trap image from the Kalahari Desert, Botswana.

TASK: Assess this image for animal presence and quality. Do NOT identify species yet.

COMMON SCENARIOS TO HANDLE:
1. CLEAR ANIMAL: Full or partial body visible, identifiable shape
2. PARTIAL ANIMAL: Only tail, leg, ear, or snout visible → animal_present: true, but may set proceed: false
3. DISTANT ANIMAL: Very small in frame → note in quality_issues, likely proceed: false
4. MOTION BLUR: Fast movement causing blur → note severity
5. MULTIPLE ANIMALS: Count individuals, note if different species likely
6. FALSE TRIGGER: Wind, shadows, vegetation, insects, sun glare → animal_present: false
7. EMPTY FRAME: No animal despite trigger → animal_present: false

INFRARED/NIGHT IMAGE RULES:
- Eye shine alone is NOT sufficient for animal_present: true
- Need body outline OR silhouette OR movement blur to confirm
- Bright spots could be reflections from rocks/vegetation
- Very dark images with only eyes: set proceed_to_identification: false

MINIMUM REQUIREMENTS FOR proceed_to_identification: true:
- At least 25-30% of animal body visible
- Can distinguish general body shape (not just eyes)
- Image not completely overexposed or underexposed
- Animal large enough in frame (not just distant dots)

RESPONSE FORMAT (JSON only):
{
  "animal_present": true/false,
  "animal_count": 0-10,
  "multiple_species": true/false,
  "image_type": "daylight" | "infrared" | "flash",
  "image_quality": "good" | "moderate" | "poor",
  "quality_issues": ["list specific issues"],
  "animal_visible_features": {
    "body_visible": true/false,
    "face_visible": true/false,
    "eye_shine": true/false,
    "approximate_size": "small" | "medium" | "large" | "unknown",
    "pattern_visible": "spots" | "stripes" | "solid" | "unclear" | "none",
    "body_percentage_visible": 0-100
  },
  "proceed_to_identification": true/false,
  "stage1_confidence": 0.0-1.0,
  "rejection_reason": "why not proceeding, if applicable"
}

CRITICAL: Respond with ONLY the JSON object. No markdown, no explanation, no text before or after.`;

const STAGE_2_PROMPT = `You are identifying wildlife species from a camera trap image from the Kalahari Desert, Botswana.

CONTEXT FROM IMAGE ANALYSIS:
{stage1_context}

KNOWN SPECIES IN THIS AREA (use these IDs):
${speciesReference}

IDENTIFICATION TASK: Determine which species is visible.

KEY DISTINGUISHING FEATURES BY SPECIES:

SMALL CARNIVORES:
- Genet (African/Small-spotted): Long body, very long banded tail (longer than body), spotted pattern, pointed face, small (1-2kg)
- African Wildcat: Cat-shaped, tabby/solid grey-brown, shorter tail, larger than genet
- Civet: Larger than genet, banded/spotted pattern, shorter legs, mask-like face markings
- Caracal: Distinctive ear tufts (black), solid tawny color, medium cat size, no spots

MEDIUM CARNIVORES:
- Honey Badger: Low stocky build, distinctive white stripe from head down back, dark legs
- Aardwolf: Vertical stripes on body, pointed snout, mane along spine, hyena-like but smaller
- Black-backed Jackal: Dog-like, dark saddle on back, bushy tail, pointed ears
- Bat-eared Fox: Enormous ears (diagnostic), small body, dark legs, grey-brown fur

HERBIVORES/OTHERS:
- Scrub Hare: Long upright ears, sitting/hopping posture, brown, no tail visible
- Springhare: Kangaroo-like posture, huge hind legs, long tail, hopping locomotion
- Porcupine: Quills visible (white-tipped), stocky, waddles
- Aardvark: Long snout, large ears, grey skin, digging posture

BIRDS:
- Secretary Bird: Very long legs, crest feathers, usually walking
- Kori Bustard: Large ground bird, thick neck, grey-brown
- Various owls: Round head, forward-facing eyes, nocturnal

CONFIDENCE CALIBRATION (be conservative):
- 0.85-1.0: Perfect daylight image, multiple diagnostic features clearly visible
- 0.70-0.85: Good visibility, key features visible, high certainty
- 0.50-0.70: Partial view OR infrared with clear silhouette, moderate certainty
- 0.30-0.50: Limited features visible, educated guess
- 0.00-0.30: Cannot reliably identify, set species_id to null

NIGHT IMAGE ADJUSTMENTS:
- Infrared images: Reduce your initial confidence by 0.15
- Flash images with mainly eye shine: Maximum confidence 0.55
- If only silhouette visible: Maximum confidence 0.60

RESPONSE FORMAT (JSON only):
{
  "species_id": "id-from-list or null if unknown",
  "common_name": "name or null",
  "scientific_name": "scientific name or null",
  "confidence": 0.0-1.0,
  "reasoning": "specific features observed that led to identification",
  "identifying_features": ["list", "of", "features", "seen"],
  "alternative_species": [
    {"species_id": "id", "common_name": "name", "confidence": 0.0-1.0}
  ],
  "needs_review": true/false,
  "review_reason": "reason or null"
}

FORCED REVIEW TRIGGERS (set needs_review: true):
- Confidence below 0.65
- Species not in the provided list
- Only 1-2 features visible
- Animal partially out of frame (>40% cut off)
- Significant motion blur
- Alternative species within 0.15 confidence of primary

CRITICAL: Respond with ONLY the JSON object. No markdown, no explanation, no text before or after.`;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract JSON from potentially messy LLM output
 */
function extractJSON(text: string): object | null {
  if (!text || typeof text !== 'string') return null;
  
  const trimmed = text.trim();
  
  // Pattern 1: Markdown code block
  const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch?.[1]) {
    try {
      return JSON.parse(markdownMatch[1].trim());
    } catch { /* continue */ }
  }
  
  // Pattern 2: Raw JSON object
  const jsonMatch = trimmed.match(/(\{[\s\S]*\})/);
  if (jsonMatch?.[1]) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch { /* continue */ }
  }
  
  // Pattern 3: Direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/**
 * Retry wrapper for Gemini API calls
 */
async function generateWithRetry(
  model: GenerativeModel,
  content: (string | Part)[],
  maxRetries: number = CONFIG.maxRetries
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(content);
      const text = result.response.text();
      
      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from API');
      }
      
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const isRetryable = 
        lastError.message.includes('503') ||
        lastError.message.includes('500') ||
        lastError.message.includes('overloaded') ||
        lastError.message.includes('DEADLINE_EXCEEDED') ||
        lastError.message.includes('RESOURCE_EXHAUSTED');
      
      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = CONFIG.retryDelayMs * Math.pow(2, attempt);
      console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

/**
 * Validate and find species in database
 */
function validateSpecies(stage2Data: Stage2Data): Stage2Data {
  if (!stage2Data.species_id) return stage2Data;
  
  // Try exact ID match
  let validSpecies = SPECIES_LIST.find(s => s.id === stage2Data.species_id);
  
  // Try common name match
  if (!validSpecies && stage2Data.common_name) {
    validSpecies = SPECIES_LIST.find(
      s => s.commonName.toLowerCase() === stage2Data.common_name?.toLowerCase()
    );
    if (validSpecies) {
      stage2Data.species_id = validSpecies.id;
    }
  }
  
  // Try scientific name match
  if (!validSpecies && stage2Data.scientific_name) {
    validSpecies = SPECIES_LIST.find(
      s => s.scientificName.toLowerCase() === stage2Data.scientific_name?.toLowerCase()
    );
    if (validSpecies) {
      stage2Data.species_id = validSpecies.id;
      stage2Data.common_name = validSpecies.commonName;
    }
  }
  
  // No match found
  if (!validSpecies) {
    stage2Data.needs_review = true;
    stage2Data.review_reason = `Species "${stage2Data.common_name || stage2Data.species_id}" not in database`;
  }
  
  return stage2Data;
}

/**
 * Apply confidence adjustments based on image type
 */
function adjustConfidence(confidence: number, imageType: string, features: Stage1Data['animal_visible_features']): number {
  let adjusted = confidence;
  
  // Night image penalties
  if (imageType === 'infrared') {
    adjusted -= CONFIG.infraredPenalty;
  }
  
  // Eye shine only penalty
  if (imageType === 'flash' && features.eye_shine && !features.body_visible) {
    adjusted = Math.min(adjusted, 0.55);
  }
  
  // Silhouette only cap
  if (!features.face_visible && features.body_visible && imageType !== 'daylight') {
    adjusted = Math.min(adjusted, 0.60);
  }
  
  // Ensure bounds
  return Math.max(0, Math.min(1, adjusted));
}

/**
 * Build context string for Stage 2
 */
function buildStage1Context(stage1: Stage1Data): string {
  const features = stage1.animal_visible_features;
  
  return `
- Animal count: ${stage1.animal_count}
- Multiple species likely: ${stage1.multiple_species}
- Image type: ${stage1.image_type}
- Image quality: ${stage1.image_quality}
- Quality issues: ${stage1.quality_issues.join(', ') || 'none'}
- Body visible: ${features.body_visible}
- Face visible: ${features.face_visible}
- Eye shine: ${features.eye_shine}
- Approximate size: ${features.approximate_size}
- Pattern: ${features.pattern_visible}
- Body percentage visible: ${features.body_percentage_visible || 'unknown'}%
- Stage 1 confidence: ${stage1.stage1_confidence}`.trim();
}

/**
 * Structured logging for debugging
 */
function logIdentification(
  stage1Raw: string,
  stage1Data: Stage1Data | null,
  stage2Raw: string | null,
  stage2Data: Stage2Data | null,
  needsReview: boolean
) {
  if (process.env.NODE_ENV === 'development' || needsReview) {
    console.log('\n========== IDENTIFICATION LOG ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('\n--- Stage 1 Raw (first 800 chars) ---');
    console.log(stage1Raw.substring(0, 800));
    console.log('\n--- Stage 1 Parsed ---');
    console.log(JSON.stringify(stage1Data, null, 2));
    
    if (stage2Raw) {
      console.log('\n--- Stage 2 Raw (first 800 chars) ---');
      console.log(stage2Raw.substring(0, 800));
      console.log('\n--- Stage 2 Parsed ---');
      console.log(JSON.stringify(stage2Data, null, 2));
    }
    
    console.log('\n--- Needs Review:', needsReview, '---');
    console.log('==========================================\n');
  }
}

// ============================================
// MAIN API HANDLER
// ============================================

export async function POST(request: NextRequest) {
  let stage1Raw = '';
  let stage1Data: Stage1Data | null = null;
  let stage2Raw: string | null = null;
  let stage2Data: Stage2Data | null = null;
  
  try {
    // ===== INPUT VALIDATION =====
    const body = await request.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No image provided or invalid format' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    // ===== SETUP MODEL =====
    const model = genAI.getGenerativeModel({
      model: CONFIG.model,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: CONFIG.temperature,
      },
    });

    // ===== PREPARE IMAGE =====
    const base64Data = image.includes('base64,') 
      ? image.split('base64,')[1] 
      : image;
    
    const mimeType = image.includes('data:')
      ? image.split(';')[0].split(':')[1]
      : 'image/jpeg';

    const imagePart: Part = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    // ===== STAGE 1: Image Analysis =====
    stage1Raw = await generateWithRetry(model, [STAGE_1_PROMPT, imagePart]);
    
    const stage1Extracted = extractJSON(stage1Raw);
    if (!stage1Extracted) {
      logIdentification(stage1Raw, null, null, null, true);
      return NextResponse.json({
        success: false,
        error: 'Failed to parse image analysis',
        stage: 1,
        needs_review: true,
        raw_response: process.env.NODE_ENV === 'development' ? stage1Raw : undefined,
      });
    }

    // Validate Stage 1 schema
    const stage1Parsed = Stage1Schema.safeParse(stage1Extracted);
    if (!stage1Parsed.success) {
      console.error('Stage 1 validation error:', stage1Parsed.error.errors);
      logIdentification(stage1Raw, null, null, null, true);
      return NextResponse.json({
        success: false,
        error: 'Invalid image analysis structure',
        stage: 1,
        needs_review: true,
        validation_errors: stage1Parsed.error.errors,
      });
    }
    
    stage1Data = stage1Parsed.data;

    // ===== CHECK IF PROCEED TO STAGE 2 =====
    if (!stage1Data.proceed_to_identification) {
      logIdentification(stage1Raw, stage1Data, null, null, stage1Data.animal_present);
      
      return NextResponse.json({
        success: true,
        stage1: stage1Data,
        species: null,
        needs_review: stage1Data.animal_present, // Review if animal present but couldn't proceed
        review_reason: stage1Data.rejection_reason || 
          (stage1Data.animal_present 
            ? 'Image quality insufficient for reliable identification'
            : 'No animal detected in image'),
        confidence: 0,
      });
    }

    // ===== STAGE 2: Species Identification =====
    const stage1Context = buildStage1Context(stage1Data);
    const stage2Prompt = STAGE_2_PROMPT.replace('{stage1_context}', stage1Context);

    stage2Raw = await generateWithRetry(model, [stage2Prompt, imagePart]);

    const stage2Extracted = extractJSON(stage2Raw);
    if (!stage2Extracted) {
      logIdentification(stage1Raw, stage1Data, stage2Raw, null, true);
      return NextResponse.json({
        success: true,
        stage1: stage1Data,
        species: null,
        needs_review: true,
        review_reason: 'Species identification response parsing failed',
        confidence: 0,
      });
    }

    // Validate Stage 2 schema
    const stage2Parsed = Stage2Schema.safeParse(stage2Extracted);
    if (!stage2Parsed.success) {
      console.error('Stage 2 validation error:', stage2Parsed.error.errors);
      logIdentification(stage1Raw, stage1Data, stage2Raw, null, true);
      return NextResponse.json({
        success: true,
        stage1: stage1Data,
        species: null,
        needs_review: true,
        review_reason: 'Invalid identification structure',
        confidence: 0,
      });
    }

    stage2Data = stage2Parsed.data;

    // ===== POST-PROCESSING =====
    
    // Validate species against database
    stage2Data = validateSpecies(stage2Data);

    // Adjust confidence based on image conditions
    const adjustedConfidence = adjustConfidence(
      stage2Data.confidence,
      stage1Data.image_type,
      stage1Data.animal_visible_features
    );
    stage2Data.confidence = adjustedConfidence;

    // Force review if confidence dropped below threshold
    if (adjustedConfidence < CONFIG.highConfidence && !stage2Data.needs_review) {
      stage2Data.needs_review = true;
      stage2Data.review_reason = stage2Data.review_reason || 
        `Confidence ${adjustedConfidence.toFixed(2)} below threshold`;
    }

    // Check if alternatives are too close in confidence
    const topAlternative = stage2Data.alternative_species[0];
    if (topAlternative && 
        stage2Data.confidence - topAlternative.confidence < 0.15 &&
        !stage2Data.needs_review) {
      stage2Data.needs_review = true;
      stage2Data.review_reason = `Close alternative: ${topAlternative.common_name} (${topAlternative.confidence.toFixed(2)})`;
    }

    // ===== LOG AND RESPOND =====
    logIdentification(stage1Raw, stage1Data, stage2Raw, stage2Data, stage2Data.needs_review);

    return NextResponse.json({
      success: true,
      stage1: stage1Data,
      species: stage2Data.species_id,
      common_name: stage2Data.common_name,
      scientific_name: stage2Data.scientific_name,
      confidence: stage2Data.confidence,
      confidence_raw: stage2Parsed.data.confidence, // Before adjustment
      reasoning: stage2Data.reasoning,
      identifying_features: stage2Data.identifying_features,
      alternatives: stage2Data.alternative_species,
      needs_review: stage2Data.needs_review,
      review_reason: stage2Data.review_reason,
    });

  } catch (error) {
    console.error('Identification error:', error);
    
    // Log whatever we have
    logIdentification(
      stage1Raw || 'N/A',
      stage1Data,
      stage2Raw,
      stage2Data,
      true
    );

    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const isRateLimit = 
      errorMessage.includes('429') || 
      errorMessage.includes('quota') ||
      errorMessage.includes('RESOURCE_EXHAUSTED');
    
    const isTimeout =
      errorMessage.includes('DEADLINE_EXCEEDED') ||
      errorMessage.includes('timeout');

    return NextResponse.json(
      {
        success: false,
        error: isRateLimit 
          ? 'Rate limit exceeded. Please try again in a few minutes.'
          : isTimeout
          ? 'Request timed out. Please try again.'
          : 'Identification failed',
        retryable: isRateLimit || isTimeout,
        needs_review: true,
        stage1: stage1Data, // Include partial data if available
      },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
