import { NextRequest, NextResponse } from 'next/server';

// Species list - IDs must match exactly what AI returns
const SPECIES: Record<string, { common: string; scientific: string }> = {
  'aardvark': { common: 'Aardvark', scientific: 'Orycteropus afer' },
  'aardwolf': { common: 'Aardwolf', scientific: 'Proteles cristata' },
  'african-wild-cat': { common: 'African Wild Cat', scientific: 'Felis lybica' },
  'african-wild-dog': { common: 'African Wild Dog', scientific: 'Lycaon pictus' },
  'bat-eared-fox': { common: 'Bat-eared Fox', scientific: 'Otocyon megalotis' },
  'black-backed-jackal': { common: 'Black-backed Jackal', scientific: 'Lupulella mesomelas' },
  'brown-hyena': { common: 'Brown Hyena', scientific: 'Parahyaena brunnea' },
  'cape-fox': { common: 'Cape Fox', scientific: 'Vulpes chama' },
  'caracal': { common: 'Caracal', scientific: 'Caracal caracal' },
  'cheetah': { common: 'Cheetah', scientific: 'Acinonyx jubatus' },
  'duiker': { common: 'Common Duiker', scientific: 'Sylvicapra grimmia' },
  'eland': { common: 'Eland', scientific: 'Taurotragus oryx' },
  'gemsbok': { common: 'Gemsbok', scientific: 'Oryx gazella' },
  'genet': { common: 'Large-spotted Genet', scientific: 'Genetta tigrina' },
  'giraffe': { common: 'Giraffe', scientific: 'Giraffa camelopardalis' },
  'ground-squirrel': { common: 'Ground Squirrel', scientific: 'Xerus inauris' },
  'hartebeest': { common: 'Red Hartebeest', scientific: 'Alcelaphus buselaphus' },
  'honey-badger': { common: 'Honey Badger', scientific: 'Mellivora capensis' },
  'kudu': { common: 'Greater Kudu', scientific: 'Tragelaphus strepsiceros' },
  'leopard': { common: 'Leopard', scientific: 'Panthera pardus' },
  'lion': { common: 'Lion', scientific: 'Panthera leo' },
  'meerkat': { common: 'Meerkat', scientific: 'Suricata suricatta' },
  'ostrich': { common: 'Ostrich', scientific: 'Struthio camelus' },
  'pangolin': { common: 'Pangolin', scientific: 'Smutsia temminckii' },
  'porcupine': { common: 'Cape Porcupine', scientific: 'Hystrix africaeaustralis' },
  'scrub-hare': { common: 'Scrub Hare', scientific: 'Lepus saxatilis' },
  'secretarybird': { common: 'Secretarybird', scientific: 'Sagittarius serpentarius' },
  'serval': { common: 'Serval', scientific: 'Leptailurus serval' },
  'slender-mongoose': { common: 'Slender Mongoose', scientific: 'Herpestes sanguineus' },
  'spotted-hyena': { common: 'Spotted Hyena', scientific: 'Crocuta crocuta' },
  'springbok': { common: 'Springbok', scientific: 'Antidorcas marsupialis' },
  'springhare': { common: 'Springhare', scientific: 'Pedetes capensis' },
  'steenbok': { common: 'Steenbok', scientific: 'Raphicerus campestris' },
  'striped-polecat': { common: 'Striped Polecat', scientific: 'Ictonyx striatus' },
  'warthog': { common: 'Warthog', scientific: 'Phacochoerus africanus' },
  'wildebeest': { common: 'Blue Wildebeest', scientific: 'Connochaetes taurinus' },
  'yellow-mongoose': { common: 'Yellow Mongoose', scientific: 'Cynictis penicillata' },
  'kori-bustard': { common: 'Kori Bustard', scientific: 'Ardeotis kori' },
  'martial-eagle': { common: 'Martial Eagle', scientific: 'Polemaetus bellicosus' },
};

const SPECIES_IDS = Object.keys(SPECIES).join(',');

const PROMPT = `Camera trap image from Kalahari, Botswana. Identify ALL animals visible.

RESPOND ONLY WITH JSON: {"a":[["species-id",qty,conf]],"t":"day|night|dawn|dusk","d":"YYYY-MM-DD HH:MM"}

a = animals array: [species-id, quantity, confidence 0-1]
t = time of day based on lighting
d = date/time from image overlay text (if visible, usually at bottom of image)

VALID SPECIES IDs: ${SPECIES_IDS}

If no animal or unclear: {"a":[],"t":"day","d":""}
Multiple animals: {"a":[["springbok",3,0.9],["gemsbok",1,0.85]],"t":"day","d":"2024-03-15 14:32"}

Night/infrared: use eye shine, body shape, size for ID.`;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
    }

    // Remove data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return NextResponse.json({ success: false, error: 'AI service error' }, { status: 500 });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        success: true,
        detected: false,
        animals: [],
        time_of_day: 'unknown',
        date_time: null,
        needs_review: true,
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Parse compact format
    const rawAnimals = parsed.a || [];
    const timeOfDay = parsed.t || 'unknown';
    const dateTime = parsed.d || null;

    // Expand to full format with species lookup
    const animals = rawAnimals.map((item: [string, number, number]) => {
      const [speciesId, quantity, confidence] = item;
      const speciesInfo = SPECIES[speciesId];
      
      return {
        species_id: speciesId,
        common_name: speciesInfo?.common || speciesId,
        scientific_name: speciesInfo?.scientific || '',
        quantity: quantity || 1,
        confidence: confidence || 0,
      };
    });

    // Flag for review if no animals detected OR any animal has <85% confidence
    const needsReview = animals.length === 0 || animals.some((a: { confidence: number }) => a.confidence < 0.85);

    return NextResponse.json({
      success: true,
      detected: animals.length > 0,
      animals,
      time_of_day: timeOfDay,
      date_time: dateTime,
      needs_review: needsReview,
    });

  } catch (error) {
    console.error('Identification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to identify species' },
      { status: 500 }
    );
  }
}
