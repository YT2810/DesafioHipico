import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const RESULTS_PROMPT = `Eres un extractor de resultados de carreras de caballos venezolanas. Analiza las imágenes adjuntas (pueden ser 1, 2 o 3 imágenes: orden de llegada, dividendos oficiales, foto finish) y extrae TODA la información estructurada.

═══ ORDEN DE LLEGADA ═══
Extrae cada puesto con:
- finishPosition: número de puesto oficial (1, 2, 3...)
- dorsalNumber: número de dorsal/camisilla
- horseName: nombre del ejemplar
- distanceMargin: cuerpos de diferencia respecto al anterior (ej: "1 cpo", "2 cpos", "Pzo", "Tz", "pescuezo", "nariz", "hocico"). null si no aparece.
- isDistanced: true si el ejemplar fue DISTANCIADO (llegó en una posición pero fue relegado oficialmente). Esto aparece como "Dist." o "Distanciado" en la imagen.
- isScratched: true si el ejemplar aparece como RETIRADO/NO CORRIÓ. false por defecto.

IMPORTANTE sobre distanciados: el orden en la imagen es el orden de cruce de meta. Si hay un distanciado, su posición OFICIAL cambia pero los dividendos ya son los oficiales. Marca isDistanced:true en el ejemplar distanciado.

═══ DIVIDENDOS OFICIALES ═══
Extrae los pagos para cada tipo de apuesta del INH venezolano:
- winner: GANADOR — array de {combination: "dorsal", amount: número en bolívares}
- place: PLACE — array de {combination: "dorsal", amount} (puede haber 2 o más entradas, una por cada dorsal)
- exacta: EXACTA — {combination: "D1-D2", amount}
- trifecta: TRIFECTA — {combination: "D1-D2-D3", amount}
- superfecta: SUPERFECTA — {combination: "D1-D2-D3-D4", amount}
- tripleApuesta: TRIPLE APUESTA — {combination: "D1-D2-D3", amount}
- poolDe4: POOL DE 4 — {combination: "D1-D2-D3-D4", amount}
- cincoYSeis: 5 Y 6 / CINCO Y SEIS — {combination: "D1-D2-D3-D4-D5-D6", amount}
- lotoHipico: LOTO HÍPICO — {combination: string, amount}

Los montos pueden ser "Bs. 1.234,56" → extrae 1234.56 como número. Si un tipo no aparece en la imagen, usa array vacío [].

═══ TIEMPOS ═══
- officialTime: tiempo oficial del GANADOR en formato venezolano "segundos.quintos" (ej: "97.4", "108.2"). Si aparece en formato minutos como "1:37.4" conviértelo a segundos: 1*60+37=97, quintos=4 → "97.4". null si no aparece.
- timeSplits: array de {distance: número en metros, time: string}. Vacío si no hay splits.

═══ NÚMERO DE CARRERA ═══
- raceNumber: número de JORNADA (1ra, 2da, 3ra carrera del día). NO uses el número correlativo anual (ej: C089 → ignora 89, usa el número ordinal del día como 3). null si no se puede determinar.

═══ JSON DE SALIDA (puro, sin markdown) ═══
{
  "raceNumber": 3,
  "officialTime": "97.4",
  "timeSplits": [{"distance": 400, "time": "0:23.1"}, {"distance": 800, "time": "0:46.3"}],
  "finishOrder": [
    {"finishPosition": 1, "dorsalNumber": 5, "horseName": "EJEMPLO", "distanceMargin": null, "isDistanced": false, "isScratched": false},
    {"finishPosition": 2, "dorsalNumber": 3, "horseName": "OTRO", "distanceMargin": "1 cpo", "isDistanced": false, "isScratched": false}
  ],
  "payouts": {
    "winner": [{"combination": "7", "amount": 192.28}],
    "place": [{"combination": "7", "amount": 124.01}, {"combination": "4", "amount": 125.97}],
    "exacta": [{"combination": "7-4", "amount": 461.29}],
    "trifecta": [],
    "superfecta": [],
    "tripleApuesta": [],
    "poolDe4": [],
    "cincoYSeis": [],
    "lotoHipico": []
  }
}`;

async function callGeminiVisionMulti(images: { base64: string; mimeType: string }[]): Promise<string> {
  const contentParts: object[] = [{ type: 'text', text: RESULTS_PROMPT }];
  for (const img of images) {
    contentParts.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${img.base64}` } });
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://desafiohipico.com',
      'X-Title': 'Desafío Hípico',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content: contentParts }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenRouter vision error: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

function parseResultsResponse(raw: string) {
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini no devolvió JSON válido');
  return JSON.parse(jsonMatch[0]);
}

export async function POST(req: NextRequest) {
  try {
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
    const roles: string[] = (token?.roles as string[]) ?? [];
    if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY no configurada.' }, { status: 500 });
    }

    const formData = await req.formData();
    const imageFiles = formData.getAll('images') as File[];
    if (!imageFiles || imageFiles.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos una imagen.' }, { status: 400 });
    }
    if (imageFiles.length > 3) {
      return NextResponse.json({ error: 'Máximo 3 imágenes por carrera.' }, { status: 400 });
    }

    const images: { base64: string; mimeType: string }[] = [];
    for (const file of imageFiles) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      images.push({ base64, mimeType: file.type || 'image/jpeg' });
    }

    const rawResponse = await callGeminiVisionMulti(images);
    const parsed = parseResultsResponse(rawResponse);

    return NextResponse.json({ success: true, result: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
