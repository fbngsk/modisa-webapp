import { NextRequest, NextResponse } from 'next/server';

const SPECIES_CONTEXT = `You are a wildlife identification expert for the Kalahari Desert in Botswana. 
Analyze camera trap images and identify the species.

Valid species IDs you can return:
- lion, leopard, cheetah, brown-hyena, spotted-hyena, african-wild-dog
- black-backed-jackal, cape-fox, bat-eared-fox, african-wildcat, caracal, aardwolf, honey-badger
- gemsbok, eland, blue-wildebeest, red-hartebeest, giraffe, greater-kudu
- springbok, steenbok, duiker, warthog
- aardvark, porcupine, springhare, ground-squirrel, suricate, yellow-mongoose, slender-mongoose
- ostrich, secretarybird, kori-bustard, martial-eagle, lappet-faced-vulture
- leopard-tortoise, rock-monitor, puff-adder, cape-cobra

Respond ONLY with valid JSON in this exact format:
{"species_id": "the-id-from-list", "confidence": 0.85, "reasoning": "brief explanation"}

If no animal is visible, return:
{"species_id": "empty", "confidence": 1.0, "reasoning": "No animal visible in image"}

If you cannot identify the species, return:
{"species_id": "unknown", "confidence": 0.0, "reasoning": "explanation"}`;

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: SPECIES_CONTEXT },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', error);
      return NextResponse.json({ error: 'AI identification failed' }, { status: 500 });
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Parse JSON from response
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Identification error:', error);
    return NextResponse.json({ error: 'Identification failed' }, { status: 500 });
  }
}
