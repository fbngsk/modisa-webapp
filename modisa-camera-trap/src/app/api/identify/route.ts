import { GoogleGenAI } from '@google/genai'; 
import { NextRequest, NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Species lookup (not sent to API)
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

// Compact prompt (~200 tokens vs ~800)
const PROMPT = `Kalahari camera trap. ID all animals.
Species:aardvark,aardwolf,african-civet,african-wildcat,bat-eared-fox,black-backed-jackal,black-footed-cat,brown-hyena,cape-fox,caracal,cheetah,common-duiker,common-genet,eland,elephant,gemsbok,giraffe,ground-squirrel,hartebeest,honey-badger,kudu,large-spotted-genet,leopard,lion,meerkat,porcupine,scrub-hare,serval,slender-mongoose,spotted-hyena,springbok,springhare,steenbok,striped-polecat,warthog,wild-dog,wildebeest,yellow-mongoose,zebra,ostrich,kori-bustard,secretarybird,spotted-eagle-owl,barn-owl
JSON only:{"a":[[id,qty,conf]],"t":"day|night|dawn|dusk","d":"date if visible"}
a=animals array:[species-id,quantity,confidence 0-1]. Empty if none.`;

function extractJSON(text: string): any {
  try { return JSON.parse(text); } catch {}
  const cleaned = text.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) try { return JSON.parse(match[0]); } catch {}
  return null;
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

    const data = extractJSON(response.text || '');
    
    if (!data) {
      return NextResponse.json({ success: false, error: 'Parse failed', needs_review: true });
    }

    // Transform compact response to full format
    const animals = (data.a || []).map((item: [string, number, number]) => {
      const [id, qty, conf] = item;
      const species = SPECIES[id];
      return {
        species_id: id,
        common_name: species?.common || id,
        scientific_name: species?.scientific || '',
        quantity: qty || 1,
        confidence: conf || 0,
      };
    });

    return NextResponse.json({
      success: true,
      detected: animals.length > 0,
      animals,
      time_of_day: data.t || 'unknown',
      date_time: data.d || null,
      needs_review: animals.some((a: any) => a.confidence < 0.6),
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed',
      needs_review: true,
    }, { status: 500 });
  }
}
