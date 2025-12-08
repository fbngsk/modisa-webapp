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
  'martial-eagle': { common: 'Martial Eagle', scientific: 'Polemaetus bellicosus' },
};

const SPECIES_LIST = Object.keys(SPECIES).join(',');

const PROMPT = `Kalahari camera trap image. Identify all animals.
Valid species: ${SPECIES_LIST}
Extract date/time from image overlay (usually bottom of image).
Return ONLY JSON: {"a":[["species-id",quantity,confidence]],"t":"day|night|dawn|dusk","d":"YYYY-MM-DD HH:MM"}
Example: {"a":[["porcupine",1,0.95]],"t":"night","d":"2024-03-15 22:47"}
If no date visible, omit "d". If no animals: {"a":[],"t":"day"}`;

function extractJSON(text: string): any {
  try { return JSON.parse(text); } catch {}
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) try { return JSON.parse(match[0]); } catch {}
  return null;
}

function safeNumber(val: any, fallback: number): number {
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

function parseAnimals(data: any): any[] {
  const animals: any[] = [];
  const rawArray = data.a || data.animals || [];
  
  if (!Array.isArray(rawArray)) return animals;
  
  for (const item of rawArray) {
    let id: string, qty: number, conf: number;
    
    if (Array.isArray(item)) {
      id = String(item[0] || 'unknown');
      qty = safeNumber(item[1], 1);
      conf = safeNumber(item[2], 0.5);
    } else if (item && typeof item === 'object') {
      id = String(item.id || item.species_id || item.species || 'unknown');
      qty = safeNumber(item.qty ?? item.quantity, 1);
      conf = safeNumber(item.conf ?? item.confidence, 0.5);
    } else {
      continue;
    }
    
    const species = SPECIES[id];
    animals.push({
      species_id: id,
      common_name: species?.common || id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
      scientific_name: species?.scientific || '',
      quantity: qty,
      confidence: conf,
    });
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
      model: 'gemini-2.0-flash',
      contents: [
        { text: PROMPT },
        { inlineData: { mimeType, data: base64Data } }
      ],
    });

    const responseText = response.text || '';
    console.log('Gemini response:', responseText);
    
    const data = extractJSON(responseText);
    
    if (!data) {
      console.error('Failed to parse JSON from:', responseText);
      return NextResponse.json({ success: false, error: 'Parse failed', needs_review: true });
    }

    const animals = parseAnimals(data);
    const timeOfDay = data.t || data.time_of_day || 'unknown';
    const dateTime = data.d || data.date_time || data.date || null;

    return NextResponse.json({
      success: true,
      detected: animals.length > 0,
      animals,
      time_of_day: timeOfDay,
      date_time: dateTime,
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
