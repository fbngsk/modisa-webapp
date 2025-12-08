import { GoogleGenAI } from '@google/genai'; 
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const SPECIES: Record<string, { common: string; scientific: string }> = {
  'aardvark': { common: 'Aardvark', scientific: 'Orycteropus afer' },
  'aardwolf': { common: 'Aardwolf', scientific: 'Proteles cristata' },
  'african-civet': { common: 'African Civet', scientific: 'Civettictis civetta' },
  'african-wildcat': { common: 'African Wildcat', scientific: 'Felis lybica' },
  'bat-eared-fox': { common: 'Bat-eared Fox', scientific: 'Otocyon megalotis' },
  'black-backed-jackal': { common: 'Black-backed Jackal', scientific: 'Lupulella mesomelas' },
  'black-footed-cat': { common: 'Black-footed Cat', scientific: 'Felis nigripes' },
  'brown-hyena': { common: 'Brown Hyena', scientific: 'Parahyaena brunnea' },
  'cape-fox': { common: 'Cape Fox', scientific: 'Vulpes chama' },
  'caracal': { common: 'Caracal', scientific: 'Caracal caracal' },
  'cheetah': { common: 'Cheetah', scientific: 'Acinonyx jubatus' },
  'common-duiker': { common: 'Common Duiker', scientific: 'Sylvicapra grimmia' },
  'common-genet': { common: 'Common Genet', scientific: 'Genetta genetta' },
  'eland': { common: 'Eland', scientific: 'Taurotragus oryx' },
  'elephant': { common: 'African Elephant', scientific: 'Loxodonta africana' },
  'gemsbok': { common: 'Gemsbok', scientific: 'Oryx gazella' },
  'giraffe': { common: 'Giraffe', scientific: 'Giraffa camelopardalis' },
  'ground-squirrel': { common: 'Ground Squirrel', scientific: 'Xerus inauris' },
  'hartebeest': { common: 'Red Hartebeest', scientific: 'Alcelaphus buselaphus' },
  'honey-badger': { common: 'Honey Badger', scientific: 'Mellivora capensis' },
  'kudu': { common: 'Greater Kudu', scientific: 'Tragelaphus strepsiceros' },
  'large-spotted-genet': { common: 'Large-spotted Genet', scientific: 'Genetta tigrina' },
  'leopard': { common: 'Leopard', scientific: 'Panthera pardus' },
  'lion': { common: 'Lion', scientific: 'Panthera leo' },
  'meerkat': { common: 'Meerkat', scientific: 'Suricata suricatta' },
  'porcupine': { common: 'Cape Porcupine', scientific: 'Hystrix africaeaustralis' },
  'scrub-hare': { common: 'Scrub Hare', scientific: 'Lepus saxatilis' },
  'serval': { common: 'Serval', scientific: 'Leptailurus serval' },
  'slender-mongoose': { common: 'Slender Mongoose', scientific: 'Herpestes sanguineus' },
  'spotted-hyena': { common: 'Spotted Hyena', scientific: 'Crocuta crocuta' },
  'springbok': { common: 'Springbok', scientific: 'Antidorcas marsupialis' },
  'springhare': { common: 'Springhare', scientific: 'Pedetes capensis' },
  'steenbok': { common: 'Steenbok', scientific: 'Raphicerus campestris' },
  'striped-polecat': { common: 'Striped Polecat', scientific: 'Ictonyx striatus' },
  'warthog': { common: 'Warthog', scientific: 'Phacochoerus africanus' },
  'wild-dog': { common: 'African Wild Dog', scientific: 'Lycaon pictus' },
  'wildebeest': { common: 'Blue Wildebeest', scientific: 'Connochaetes taurinus' },
  'yellow-mongoose': { common: 'Yellow Mongoose', scientific: 'Cynictis penicillata' },
  'zebra': { common: 'Plains Zebra', scientific: 'Equus quagga' },
  'ostrich': { common: 'Ostrich', scientific: 'Struthio camelus' },
  'kori-bustard': { common: 'Kori Bustard', scientific: 'Ardeotis kori' },
  'secretarybird': { common: 'Secretarybird', scientific: 'Sagittarius serpentarius' },
  'spotted-eagle-owl': { common: 'Spotted Eagle-Owl', scientific: 'Bubo africanus' },
  'barn-owl': { common: 'Barn Owl', scientific: 'Tyto alba' },
};

const SPECIES_LIST = Object.keys(SPECIES).join(',');

const PROMPT = `Kalahari camera trap image. Identify all animals.
Valid species: ${SPECIES_LIST}
Return ONLY JSON: {"a":[["species-id",quantity,confidence]],"t":"day|night|dawn|dusk"}
Example: {"a":[["porcupine",1,0.95],["lion",2,0.8]],"t":"night"}
If no animals: {"a":[],"t":"day"}`;

function extractJSON(text: string): any {
  try { return JSON.parse(text); } catch {}
  const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) try { return JSON.parse(match[0]); } catch {}
  return null;
}

function parseAnimals(data: any): any[] {
  const animals: any[] = [];
  
  // Handle compact format: {"a":[["porcupine",1,0.95]]}
  if (Array.isArray(data.a)) {
    for (const item of data.a) {
      if (Array.isArray(item) && item.length >= 1) {
        const [id, qty, conf] = item;
        const species = SPECIES[id];
        animals.push({
          species_id: id,
          common_name: species?.common || id,
          scientific_name: species?.scientific || '',
          quantity: typeof qty === 'number' ? qty : 1,
          confidence: typeof conf === 'number' ? conf : 0.5,
        });
      }
    }
  }
  
  // Handle object format: {"a":[{"id":"porcupine","qty":1,"conf":0.95}]}
  if (animals.length === 0 && Array.isArray(data.a)) {
    for (const item of data.a) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const id = item.id || item.species_id || item.species;
        if (id) {
          const species = SPECIES[id];
          animals.push({
            species_id: id,
            common_name: species?.common || item.common_name || id,
            scientific_name: species?.scientific || item.scientific_name || '',
            quantity: item.qty || item.quantity || 1,
            confidence: item.conf || item.confidence || 0.5,
          });
        }
      }
    }
  }
  
  // Handle full format: {"animals":[{...}]}
  if (animals.length === 0 && Array.isArray(data.animals)) {
    for (const item of data.animals) {
      const id = item.species_id || item.id || item.species;
      if (id) {
        const species = SPECIES[id];
        animals.push({
          species_id: id,
          common_name: species?.common || item.common_name || id,
          scientific_name: species?.scientific || item.scientific_name || '',
          quantity: item.quantity || item.qty || 1,
          confidence: item.confidence || item.conf || 0.5,
        });
      }
    }
  }
  
  return animals;
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ success: false, error: 'No image' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'No API key' }, { status: 500 });
    }

    const base64Data = image.includes('base64,') ? image.split('base64,')[1] : image;
    const mimeType = image.includes('data:') ? image.split(';')[0].split(':')[1] : 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { text: PROMPT },
        { inlineData: { mimeType, data: base64Data } }
      ],
    });

    const responseText = response.text || '';
    console.log('Gemini response:', responseText); // Debug log
    
    const data = extractJSON(responseText);
    
    if (!data) {
      console.error('Failed to parse:', responseText);
      return NextResponse.json({ success: false, error: 'Parse failed', needs_review: true });
    }

    const animals = parseAnimals(data);
    const timeOfDay = data.t || data.time_of_day || data.time || 'unknown';

    return NextResponse.json({
      success: true,
      detected: animals.length > 0,
      animals,
      time_of_day: timeOfDay,
      date_time: data.d || data.date_time || data.date || null,
      needs_review: animals.length === 0 || animals.some(a => a.confidence < 0.6),
    });

  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed',
      needs_review: true,
    }, { status: 500 });
  }
}
