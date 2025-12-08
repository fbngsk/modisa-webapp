import { GoogleGenAI } from '@google/genai'; 
import { NextRequest, NextResponse } from 'next/server';

// Initialize Gemini with new SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Kalahari species database
const KALAHARI_SPECIES = [
  { id: 'aardvark', common_name: 'Aardvark', scientific_name: 'Orycteropus afer' },
  { id: 'aardwolf', common_name: 'Aardwolf', scientific_name: 'Proteles cristata' },
  { id: 'african-civet', common_name: 'African Civet', scientific_name: 'Civettictis civetta' },
  { id: 'african-wildcat', common_name: 'African Wildcat', scientific_name: 'Felis lybica' },
  { id: 'bat-eared-fox', common_name: 'Bat-eared Fox', scientific_name: 'Otocyon megalotis' },
  { id: 'black-backed-jackal', common_name: 'Black-backed Jackal', scientific_name: 'Lupulella mesomelas' },
  { id: 'black-footed-cat', common_name: 'Black-footed Cat', scientific_name: 'Felis nigripes' },
  { id: 'brown-hyena', common_name: 'Brown Hyena', scientific_name: 'Parahyaena brunnea' },
  { id: 'cape-fox', common_name: 'Cape Fox', scientific_name: 'Vulpes chama' },
  { id: 'caracal', common_name: 'Caracal', scientific_name: 'Caracal caracal' },
  { id: 'cheetah', common_name: 'Cheetah', scientific_name: 'Acinonyx jubatus' },
  { id: 'common-duiker', common_name: 'Common Duiker', scientific_name: 'Sylvicapra grimmia' },
  { id: 'common-genet', common_name: 'Common Genet', scientific_name: 'Genetta genetta' },
  { id: 'eland', common_name: 'Eland', scientific_name: 'Taurotragus oryx' },
  { id: 'elephant', common_name: 'African Elephant', scientific_name: 'Loxodonta africana' },
  { id: 'gemsbok', common_name: 'Gemsbok', scientific_name: 'Oryx gazella' },
  { id: 'giraffe', common_name: 'Giraffe', scientific_name: 'Giraffa camelopardalis' },
  { id: 'ground-squirrel', common_name: 'Ground Squirrel', scientific_name: 'Xerus inauris' },
  { id: 'hartebeest', common_name: 'Red Hartebeest', scientific_name: 'Alcelaphus buselaphus' },
  { id: 'honey-badger', common_name: 'Honey Badger', scientific_name: 'Mellivora capensis' },
  { id: 'kudu', common_name: 'Greater Kudu', scientific_name: 'Tragelaphus strepsiceros' },
  { id: 'large-spotted-genet', common_name: 'Large-spotted Genet', scientific_name: 'Genetta tigrina' },
  { id: 'leopard', common_name: 'Leopard', scientific_name: 'Panthera pardus' },
  { id: 'lion', common_name: 'Lion', scientific_name: 'Panthera leo' },
  { id: 'meerkat', common_name: 'Meerkat', scientific_name: 'Suricata suricatta' },
  { id: 'porcupine', common_name: 'Cape Porcupine', scientific_name: 'Hystrix africaeaustralis' },
  { id: 'scrub-hare', common_name: 'Scrub Hare', scientific_name: 'Lepus saxatilis' },
  { id: 'serval', common_name: 'Serval', scientific_name: 'Leptailurus serval' },
  { id: 'slender-mongoose', common_name: 'Slender Mongoose', scientific_name: 'Herpestes sanguineus' },
  { id: 'spotted-hyena', common_name: 'Spotted Hyena', scientific_name: 'Crocuta crocuta' },
  { id: 'springbok', common_name: 'Springbok', scientific_name: 'Antidorcas marsupialis' },
  { id: 'springhare', common_name: 'Springhare', scientific_name: 'Pedetes capensis' },
  { id: 'steenbok', common_name: 'Steenbok', scientific_name: 'Raphicerus campestris' },
  { id: 'striped-polecat', common_name: 'Striped Polecat', scientific_name: 'Ictonyx striatus' },
  { id: 'warthog', common_name: 'Warthog', scientific_name: 'Phacochoerus africanus' },
  { id: 'wild-dog', common_name: 'African Wild Dog', scientific_name: 'Lycaon pictus' },
  { id: 'wildebeest', common_name: 'Blue Wildebeest', scientific_name: 'Connochaetes taurinus' },
  { id: 'yellow-mongoose', common_name: 'Yellow Mongoose', scientific_name: 'Cynictis penicillata' },
  { id: 'zebra', common_name: 'Plains Zebra', scientific_name: 'Equus quagga' },
  // Birds
  { id: 'ostrich', common_name: 'Ostrich', scientific_name: 'Struthio camelus' },
  { id: 'kori-bustard', common_name: 'Kori Bustard', scientific_name: 'Ardeotis kori' },
  { id: 'secretarybird', common_name: 'Secretarybird', scientific_name: 'Sagittarius serpentarius' },
  { id: 'spotted-eagle-owl', common_name: 'Spotted Eagle-Owl', scientific_name: 'Bubo africanus' },
  { id: 'barn-owl', common_name: 'Barn Owl', scientific_name: 'Tyto alba' },
];

const SPECIES_IDS = KALAHARI_SPECIES.map(s => s.id);

// Compact species guide for the prompt
const SPECIES_GUIDE = `
PREDATORS:
- lion: Large tawny cat, males have mane
- leopard: Yellow with black rosettes, stocky
- cheetah: Slender, black tear lines on face, solid spots
- wild-dog: Mottled black/brown/white patches, large round ears
- spotted-hyena: Spotted coat, sloping back, rounded ears
- brown-hyena: Shaggy brown coat, striped legs
- caracal: Reddish-brown, distinctive black ear tufts
- african-wildcat: Tabby pattern, longer legs than domestic cat
- black-footed-cat: Tiny (smallest African cat), spotted, black foot pads
- serval: Tall, large ears, spotted coat
- aardwolf: Striped, mane along back, small and shy

CANIDS:
- bat-eared-fox: Huge ears, grey-brown, small
- cape-fox: Silver-grey, bushy tail
- black-backed-jackal: Reddish with distinctive black saddle on back

SMALL CARNIVORES:
- honey-badger: Black body, white stripe from head to tail
- common-genet: Long banded tail, spotted body, pointed face
- large-spotted-genet: Larger spots, black tail tip
- african-civet: Larger than genets, banded body
- striped-polecat: Bold black and white stripes
- meerkat: Stands upright, social groups
- yellow-mongoose: Yellowish, white-tipped tail
- slender-mongoose: Dark brown, curved tail tip

LARGE HERBIVORES:
- elephant: Unmistakable, large ears, trunk
- giraffe: Extremely tall, patches, long neck
- zebra: Black and white stripes
- wildebeest: Beard, curved horns, gnu shape
- gemsbok: Long straight horns, black and white face mask
- kudu: Spiral horns (males), vertical white stripes
- eland: Massive, dewlap, tan color
- hartebeest: Bracket-shaped horns, elongated face

SMALL HERBIVORES:
- springbok: White face, dark side stripe, pronking behavior
- steenbok: Small, rufous color, large ears
- common-duiker: Small, hunched posture, short horns

OTHER MAMMALS:
- aardvark: Long snout, big ears, pig-like body
- warthog: Tusks, warts on face, runs with tail up
- porcupine: Covered in quills
- springhare: Kangaroo-like, long hind legs, nocturnal
- scrub-hare: Long ears, typical hare shape
- ground-squirrel: Uses bushy tail as sunshade

BIRDS:
- ostrich: Huge flightless bird, long neck
- kori-bustard: Large walking bird, grey-brown
- secretarybird: Long legs, crest feathers, raptor
- spotted-eagle-owl: Ear tufts, yellow eyes
- barn-owl: Heart-shaped white face

NIGHT IMAGE TIPS:
- Infrared makes animals appear grey/white
- Eye shine helps ID: cats=green, antelope=blue/white, rodents=red, carnivores=yellow-green
- Look at body shape, ear shape, tail length, movement patterns
`;

const IDENTIFICATION_PROMPT = `You are a wildlife identification expert for the Kalahari Desert, Botswana.

SPECIES IN THIS REGION:
${SPECIES_GUIDE}

TASK: Identify the animal in this camera trap image.

IMPORTANT:
- This is from the Kalahari Desert - only species native to this region
- Night images use infrared (animals appear grey/white)
- Be conservative with confidence - uncertain = lower score
- If no animal visible or image is unclear, say so

Respond with ONLY this JSON (no other text):
{
  "detected": true/false,
  "species_id": "id-from-list-above or null",
  "common_name": "common name or null",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of key features observed",
  "needs_review": true/false
}

Set needs_review=true if confidence < 0.6 or you're uncertain.
Valid species_id values: ${SPECIES_IDS.join(', ')}`;

function extractJSON(text: string): any {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // Remove markdown code blocks
  let cleaned = text
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {}

  // Try to find JSON object in text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Extract base64 data
    const base64Data = image.includes('base64,') 
      ? image.split('base64,')[1] 
      : image;
    
    const mimeType = image.includes('data:') 
      ? image.split(';')[0].split(':')[1] 
      : 'image/jpeg';

    // Call Gemini API with new SDK
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: IDENTIFICATION_PROMPT },
        { 
          inlineData: { 
            mimeType: mimeType, 
            data: base64Data 
          } 
        }
      ],
    });

    const responseText = response.text || '';
    
    // Parse response
    const data = extractJSON(responseText);
    
    if (!data) {
      console.error('Failed to parse response:', responseText);
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI response',
        needs_review: true,
      });
    }

    // Validate species_id
    let validatedSpeciesId = data.species_id;
    let speciesInfo = null;
    
    if (validatedSpeciesId && !SPECIES_IDS.includes(validatedSpeciesId)) {
      // Try to find closest match
      const lowerInput = validatedSpeciesId.toLowerCase().replace(/[^a-z]/g, '');
      const match = KALAHARI_SPECIES.find(s => 
        s.id.replace(/-/g, '') === lowerInput ||
        s.common_name.toLowerCase().replace(/[^a-z]/g, '') === lowerInput
      );
      validatedSpeciesId = match ? match.id : null;
    }

    if (validatedSpeciesId) {
      speciesInfo = KALAHARI_SPECIES.find(s => s.id === validatedSpeciesId);
    }

    return NextResponse.json({
      success: true,
      detected: data.detected || false,
      species: validatedSpeciesId,
      common_name: speciesInfo?.common_name || data.common_name || null,
      scientific_name: speciesInfo?.scientific_name || null,
      confidence: data.confidence || 0,
      reasoning: data.reasoning || null,
      needs_review: data.needs_review || data.confidence < 0.6,
    });

  } catch (error: any) {
    console.error('Identification error:', error);
    
    const errorMessage = error?.message || 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: `Identification failed: ${errorMessage}`,
      needs_review: true,
    }, { status: 500 });
  }
}
