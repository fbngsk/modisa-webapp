import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Species database for Kalahari region
const KALAHARI_SPECIES = [
  { id: 'aardvark', common_name: 'Aardvark', scientific_name: 'Orycteropus afer' },
  { id: 'aardwolf', common_name: 'Aardwolf', scientific_name: 'Proteles cristata' },
  { id: 'african_wildcat', common_name: 'African Wildcat', scientific_name: 'Felis lybica' },
  { id: 'baboon', common_name: 'Chacma Baboon', scientific_name: 'Papio ursinus' },
  { id: 'bat_eared_fox', common_name: 'Bat-eared Fox', scientific_name: 'Otocyon megalotis' },
  { id: 'black_backed_jackal', common_name: 'Black-backed Jackal', scientific_name: 'Lupulella mesomelas' },
  { id: 'brown_hyena', common_name: 'Brown Hyena', scientific_name: 'Parahyaena brunnea' },
  { id: 'cape_fox', common_name: 'Cape Fox', scientific_name: 'Vulpes chama' },
  { id: 'cape_hare', common_name: 'Cape Hare', scientific_name: 'Lepus capensis' },
  { id: 'caracal', common_name: 'Caracal', scientific_name: 'Caracal caracal' },
  { id: 'cheetah', common_name: 'Cheetah', scientific_name: 'Acinonyx jubatus' },
  { id: 'common_genet', common_name: 'Common Genet', scientific_name: 'Genetta genetta' },
  { id: 'duiker', common_name: 'Common Duiker', scientific_name: 'Sylvicapra grimmia' },
  { id: 'eland', common_name: 'Eland', scientific_name: 'Taurotragus oryx' },
  { id: 'elephant', common_name: 'African Elephant', scientific_name: 'Loxodonta africana' },
  { id: 'gemsbok', common_name: 'Gemsbok', scientific_name: 'Oryx gazella' },
  { id: 'giraffe', common_name: 'Giraffe', scientific_name: 'Giraffa camelopardalis' },
  { id: 'ground_squirrel', common_name: 'Cape Ground Squirrel', scientific_name: 'Xerus inauris' },
  { id: 'hartebeest', common_name: 'Red Hartebeest', scientific_name: 'Alcelaphus buselaphus' },
  { id: 'hedgehog', common_name: 'Southern African Hedgehog', scientific_name: 'Atelerix frontalis' },
  { id: 'honey_badger', common_name: 'Honey Badger', scientific_name: 'Mellivora capensis' },
  { id: 'hornbill', common_name: 'Southern Yellow-billed Hornbill', scientific_name: 'Tockus leucomelas' },
  { id: 'hyena_spotted', common_name: 'Spotted Hyena', scientific_name: 'Crocuta crocuta' },
  { id: 'impala', common_name: 'Impala', scientific_name: 'Aepyceros melampus' },
  { id: 'klipspringer', common_name: 'Klipspringer', scientific_name: 'Oreotragus oreotragus' },
  { id: 'kudu', common_name: 'Greater Kudu', scientific_name: 'Tragelaphus strepsiceros' },
  { id: 'leopard', common_name: 'Leopard', scientific_name: 'Panthera pardus' },
  { id: 'lion', common_name: 'Lion', scientific_name: 'Panthera leo' },
  { id: 'meerkat', common_name: 'Meerkat', scientific_name: 'Suricata suricatta' },
  { id: 'mongoose_banded', common_name: 'Banded Mongoose', scientific_name: 'Mungos mungo' },
  { id: 'mongoose_slender', common_name: 'Slender Mongoose', scientific_name: 'Herpestes sanguineus' },
  { id: 'mongoose_yellow', common_name: 'Yellow Mongoose', scientific_name: 'Cynictis penicillata' },
  { id: 'ostrich', common_name: 'Ostrich', scientific_name: 'Struthio camelus' },
  { id: 'pangolin', common_name: 'Ground Pangolin', scientific_name: 'Smutsia temminckii' },
  { id: 'porcupine', common_name: 'Cape Porcupine', scientific_name: 'Hystrix africaeaustralis' },
  { id: 'python', common_name: 'Southern African Python', scientific_name: 'Python natalensis' },
  { id: 'rabbit_riverine', common_name: 'Riverine Rabbit', scientific_name: 'Bunolagus monticularis' },
  { id: 'secretary_bird', common_name: 'Secretarybird', scientific_name: 'Sagittarius serpentarius' },
  { id: 'serval', common_name: 'Serval', scientific_name: 'Leptailurus serval' },
  { id: 'springbok', common_name: 'Springbok', scientific_name: 'Antidorcas marsupialis' },
  { id: 'springhare', common_name: 'Springhare', scientific_name: 'Pedetes capensis' },
  { id: 'steenbok', common_name: 'Steenbok', scientific_name: 'Raphicerus campestris' },
  { id: 'suricate', common_name: 'Suricate', scientific_name: 'Suricata suricatta' },
  { id: 'warthog', common_name: 'Warthog', scientific_name: 'Phacochoerus africanus' },
  { id: 'wildebeest', common_name: 'Blue Wildebeest', scientific_name: 'Connochaetes taurinus' },
  { id: 'wild_dog', common_name: 'African Wild Dog', scientific_name: 'Lycaon pictus' },
  { id: 'zebra', common_name: 'Plains Zebra', scientific_name: 'Equus quagga' },
  { id: 'bird_other', common_name: 'Bird (Other)', scientific_name: 'Aves' },
  { id: 'rodent_other', common_name: 'Rodent (Other)', scientific_name: 'Rodentia' },
  { id: 'snake_other', common_name: 'Snake (Other)', scientific_name: 'Serpentes' },
  { id: 'unknown', common_name: 'Unknown Species', scientific_name: 'Unknown' },
  { id: 'empty', common_name: 'Empty/No Animal', scientific_name: 'N/A' },
  { id: 'human', common_name: 'Human', scientific_name: 'Homo sapiens' },
  { id: 'vehicle', common_name: 'Vehicle', scientific_name: 'N/A' },
];

// Helper to find species by various identifiers
function findSpecies(identifier: string): typeof KALAHARI_SPECIES[0] | null {
  const normalized = identifier.toLowerCase().trim();
  
  // Try exact ID match first
  let match = KALAHARI_SPECIES.find(s => s.id === normalized);
  if (match) return match;
  
  // Try common name match
  match = KALAHARI_SPECIES.find(s => s.common_name.toLowerCase() === normalized);
  if (match) return match;
  
  // Try scientific name match
  match = KALAHARI_SPECIES.find(s => s.scientific_name.toLowerCase() === normalized);
  if (match) return match;
  
  // Try partial matches
  match = KALAHARI_SPECIES.find(s => 
    s.id.includes(normalized) || 
    normalized.includes(s.id) ||
    s.common_name.toLowerCase().includes(normalized) ||
    normalized.includes(s.common_name.toLowerCase())
  );
  if (match) return match;
  
  return null;
}

// Extract JSON from potentially wrapped response
function extractJSON(text: string): any {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Continue to extraction methods
  }
  
  // Try to find JSON in markdown code blocks
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]);
    } catch (e) {
      // Continue
    }
  }
  
  // Try to find JSON in generic code blocks
  const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch (e) {
      // Continue
    }
  }
  
  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Continue
    }
  }
  
  throw new Error(`Could not extract JSON from response: ${text.substring(0, 200)}`);
}

// Validate Stage 1 response
function validateStage1(data: any): { 
  image_type: string; 
  quality_score: number; 
  has_animal: boolean; 
  proceed_to_identification: boolean;
  animal_visible_percentage?: number;
  rejection_reason?: string;
} {
  return {
    image_type: data.image_type || 'unknown',
    quality_score: typeof data.quality_score === 'number' ? data.quality_score : 0.5,
    has_animal: Boolean(data.has_animal),
    proceed_to_identification: Boolean(data.proceed_to_identification),
    animal_visible_percentage: data.animal_visible_percentage,
    rejection_reason: data.rejection_reason,
  };
}

// Validate Stage 2 response
function validateStage2(data: any): {
  species_id: string;
  common_name: string;
  scientific_name: string;
  confidence: number;
  identifying_features: string[];
  behavior_observed: string;
  count: number;
  needs_review: boolean;
  review_reason?: string;
  alternative_species?: Array<{ species_id: string; confidence: number }>;
} {
  return {
    species_id: data.species_id || 'unknown',
    common_name: data.common_name || 'Unknown',
    scientific_name: data.scientific_name || 'Unknown',
    confidence: typeof data.confidence === 'number' ? Math.min(1, Math.max(0, data.confidence)) : 0.5,
    identifying_features: Array.isArray(data.identifying_features) ? data.identifying_features : [],
    behavior_observed: data.behavior_observed || 'Unknown',
    count: typeof data.count === 'number' ? data.count : 1,
    needs_review: Boolean(data.needs_review),
    review_reason: data.review_reason,
    alternative_species: Array.isArray(data.alternative_species) ? data.alternative_species : [],
  };
}

// Stage 1: Image Analysis
async function analyzeImage(model: any, imageData: string, mimeType: string): Promise<ReturnType<typeof validateStage1>> {
  const prompt = `You are analyzing a camera trap image from the Kalahari region of Botswana for the Modisa Wildlife Project.

TASK: Analyze the image quality and determine if animal identification is possible.

CRITICAL RULES FOR CAMERA TRAP IMAGES:
1. Infrared/night images often show only partial animals or eye shine - be conservative
2. Motion blur is common - if features are indistinguishable, mark as not identifiable
3. Partial animals (tail only, ear only, distant silhouette) should NOT proceed to identification
4. "Eye shine" alone (glowing eyes in darkness) is NOT sufficient for identification
5. Flash photos may wash out features - account for this

IMAGE TYPE DEFINITIONS:
- "daylight": Natural light, full color
- "infrared": Night vision, typically grayscale/greenish with possible eye shine
- "flash": Night photo with flash, may have washed-out areas
- "dusk_dawn": Low light transitional period

MINIMUM REQUIREMENTS TO PROCEED:
- At least 25-30% of the animal's body must be visible
- Key identifying features (head shape, body pattern, or distinctive markings) must be somewhat distinguishable
- Image quality must allow differentiation between similar species

Return ONLY valid JSON (no markdown, no explanation):
{
  "image_type": "daylight|infrared|flash|dusk_dawn",
  "quality_score": 0.0-1.0,
  "has_animal": true/false,
  "animal_visible_percentage": 0-100,
  "proceed_to_identification": true/false,
  "rejection_reason": "reason if not proceeding, null otherwise"
}`;

  const result = await model.generateContent([
    { text: prompt },
    { inlineData: { mimeType, data: imageData } }
  ]);
  
  const response = result.response.text();
  const parsed = extractJSON(response);
  return validateStage1(parsed);
}

// Stage 2: Species Identification
async function identifySpecies(model: any, imageData: string, mimeType: string, stage1: ReturnType<typeof validateStage1>): Promise<ReturnType<typeof validateStage2>> {
  const speciesList = KALAHARI_SPECIES.map(s => `- ${s.id}: ${s.common_name} (${s.scientific_name})`).join('\n');
  
  const prompt = `You are identifying wildlife in a camera trap image from the Kalahari, Botswana.

IMAGE CONTEXT:
- Type: ${stage1.image_type}
- Quality: ${stage1.quality_score}
- Animal visibility: approximately ${stage1.animal_visible_percentage || 'unknown'}%

SPECIES DATABASE (use exact species_id values):
${speciesList}

IDENTIFICATION RULES:

1. DISTINGUISHING SIMILAR SPECIES:
   - Genet vs African Wildcat: Genet has LONG banded tail, spotted body; Wildcat has shorter striped tail
   - Caracal vs African Wildcat: Caracal has distinctive EAR TUFTS and larger size
   - Cape Fox vs Bat-eared Fox: Bat-eared fox has HUGE distinctive ears
   - Black-backed Jackal vs Cape Fox: Jackal has black saddle marking on back
   - Brown Hyena vs Spotted Hyena: Brown has long shaggy coat, pointed ears; Spotted has rounded ears, spots

2. CONFIDENCE CALIBRATION:
   - 0.85-1.0: Perfect daylight image, all key features clearly visible
   - 0.70-0.85: Good image, most features visible, high certainty
   - 0.55-0.70: Decent image OR infrared with clear features
   - 0.40-0.55: Challenging image, educated guess based on partial features
   - Below 0.40: Should trigger needs_review=true

3. NIGHT/INFRARED IMAGE ADJUSTMENTS:
   - Reduce confidence by 0.10-0.15 for infrared images
   - Eye shine pattern can help but is not definitive
   - Body shape and size become more important than color/pattern

4. WHEN TO FLAG FOR REVIEW (needs_review=true):
   - Confidence below 0.65
   - Alternative species within 0.15 confidence of primary
   - Unusual behavior or appearance
   - Partial visibility affecting certainty

Return ONLY valid JSON:
{
  "species_id": "exact_id_from_list",
  "common_name": "Common Name",
  "scientific_name": "Scientific name",
  "confidence": 0.0-1.0,
  "identifying_features": ["feature1", "feature2"],
  "behavior_observed": "standing|walking|running|feeding|resting|hunting|unknown",
  "count": 1,
  "needs_review": true/false,
  "review_reason": "reason if needs_review is true",
  "alternative_species": [{"species_id": "id", "confidence": 0.0-1.0}]
}`;

  const result = await model.generateContent([
    { text: prompt },
    { inlineData: { mimeType, data: imageData } }
  ]);
  
  const response = result.response.text();
  console.log('Stage 2 raw response:', response.substring(0, 500));
  
  const parsed = extractJSON(response);
  const validated = validateStage2(parsed);
  
  // Adjust confidence based on image type
  if (stage1.image_type === 'infrared') {
    validated.confidence = Math.max(0, validated.confidence - 0.15);
  } else if (stage1.image_type === 'flash') {
    validated.confidence = Math.min(validated.confidence, 0.75);
  }
  
  // Validate species exists in database
  const species = findSpecies(validated.species_id);
  if (species) {
    validated.species_id = species.id;
    validated.common_name = species.common_name;
    validated.scientific_name = species.scientific_name;
  } else {
    console.warn(`Species not found in database: ${validated.species_id}`);
    validated.needs_review = true;
    validated.review_reason = `Species "${validated.species_id}" not in database`;
  }
  
  // Force review for low confidence
  if (validated.confidence < 0.65 && !validated.needs_review) {
    validated.needs_review = true;
    validated.review_reason = 'Low confidence identification';
  }
  
  return validated;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // ============================================
    // FIX: Accept both "imageBase64" and "image"
    // ============================================
    const imageData = body.imageBase64 || body.image;
    
    if (!imageData || typeof imageData !== 'string') {
      return NextResponse.json(
        { success: false, error: 'No image provided or invalid format' },
        { status: 400 }
      );
    }
    
    // Validate base64 image format
    const base64Match = imageData.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { success: false, error: 'Invalid image format. Expected base64 data URL.' },
        { status: 400 }
      );
    }
    
    const mimeType = `image/${base64Match[1] === 'jpg' ? 'jpeg' : base64Match[1]}`;
    const base64Data = base64Match[2];
    
    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return NextResponse.json(
        { success: false, error: 'API configuration error' },
        { status: 500 }
      );
    }
    
    // Initialize model with specific settings
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      }
    });
    
    // Stage 1: Analyze image
    console.log('Starting Stage 1: Image Analysis');
    const stage1Result = await analyzeImage(model, base64Data, mimeType);
    console.log('Stage 1 result:', stage1Result);
    
    // If no animal or can't identify, return early
    if (!stage1Result.has_animal) {
      return NextResponse.json({
        success: true,
        result: {
          species_id: 'empty',
          common_name: 'Empty/No Animal',
          scientific_name: 'N/A',
          confidence: stage1Result.quality_score,
          identifying_features: [],
          behavior_observed: 'none',
          count: 0,
          needs_review: false,
          image_analysis: stage1Result,
        }
      });
    }
    
    if (!stage1Result.proceed_to_identification) {
      return NextResponse.json({
        success: true,
        result: {
          species_id: 'unknown',
          common_name: 'Unknown - Poor Image Quality',
          scientific_name: 'Unknown',
          confidence: 0,
          identifying_features: [],
          behavior_observed: 'unknown',
          count: 1,
          needs_review: true,
          review_reason: stage1Result.rejection_reason || 'Image quality insufficient for identification',
          image_analysis: stage1Result,
        }
      });
    }
    
    // Stage 2: Identify species
    console.log('Starting Stage 2: Species Identification');
    const stage2Result = await identifySpecies(model, base64Data, mimeType, stage1Result);
    console.log('Stage 2 result:', stage2Result);
    
    return NextResponse.json({
      success: true,
      result: {
        ...stage2Result,
        image_analysis: stage1Result,
      }
    });
    
  } catch (error) {
    console.error('Identification error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for specific Gemini errors
    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'API key configuration error' },
        { status: 500 }
      );
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
      return NextResponse.json(
        { success: false, error: 'API rate limit reached. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: `Identification failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
