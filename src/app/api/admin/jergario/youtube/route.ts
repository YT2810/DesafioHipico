import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import JargonEntry from '@/models/JargonEntry';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://www.desafiohipico.com',
    'X-Title': 'DesafíoHípico Jergario',
  },
});

const EXTRACTION_PROMPT = `Eres un lingüista venezolano experto en hipismo criollo. Tu trabajo es DESCUBRIR VOCABULARIO.

Se te da un texto real de un pronosticador hípico venezolano (transcripción de YouTube, análisis, etc.). El texto tendrá TYPOS en nombres propios — ignóralos.

Tu misión: lee el texto como si estuvieras en la baranda del hipódromo escuchando hablar a la gente y EXTRAE toda palabra, frase o expresión que forme parte del lenguaje del hipismo venezolano o del español coloquial venezolano usado en ese contexto.

Incluye TODO lo que un extranjero no entendería:
- Jerga hípica técnica: "traqueo", "briseo", "remate", "parciales", "split", "línea base"
- Jerga hípica coloquial: "clavito", "penco", "gualdrapa", "fijo de la reunión", "el cuadro"
- Expresiones venezolanas usadas en hipismo: "viene volao", "ese bicho arranca como un tiro", "le meten la presión", "está pa' eso"
- Formas de referirse a apuestas: "el 5y6", "cuadro", "taquilla", "la jugada"
- Verbos y frases de acción: "cerró fuerte", "se fue por fuera", "lo montaron atrás", "le dieron cancha"
- Modismos del hipódromo: "lorito", "oficina", "dato de oficina", "la bulla"
- Cualquier expresión criolla que tenga sentido en contexto hípico

Para cada término devuelve un JSON con:
- phrase: la palabra o frase (minúsculas, sin nombres propios)
- intent: clasifícalo libremente con una etiqueta descriptiva (ej: "betting", "race_analysis", "slang", "general_hipismo", "track_conditions", "jockey_trainer", "consensus_pick", "workouts_all", etc.)
- keywords: array de palabras sueltas que ayuden a encontrar esta frase por búsqueda
- description: qué significa en español llano (como si le explicaras a alguien que nunca ha ido al hipódromo)
- synonyms: otras formas de decir lo mismo

Responde SOLO con un JSON array. Sin texto fuera del JSON.
NO extraigas nombres de caballos, jinetes, entrenadores ni números de carrera.
Sé GENEROSO extrayendo — es mejor tener de más que de menos.`;

// POST — extraer jerga de texto pegado
export async function POST(req: NextRequest) {
  const session = await auth();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { text, sourceName } = await req.json();
  if (!text || typeof text !== 'string' || text.trim().length < 20) {
    return NextResponse.json({ error: 'Pega un texto de al menos 20 caracteres' }, { status: 400 });
  }

  await connectMongo();

  try {
    // Truncar a 8000 chars por llamado, si es más largo procesamos en chunks
    const chunks: string[] = [];
    const clean = text.trim();
    for (let i = 0; i < clean.length; i += 8000) {
      chunks.push(clean.slice(i, i + 8000));
    }

    let totalCreated = 0;
    const allExtracted: string[] = [];

    for (const chunk of chunks.slice(0, 3)) { // máx 3 chunks (~24k chars)
      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: chunk },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content ?? '[]';
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const extracted: any[] = JSON.parse(jsonMatch[0]);

      for (const item of extracted) {
        if (!item.phrase || !item.intent || !item.description) continue;
        const phrase = item.phrase.toLowerCase().trim();
        if (phrase.length < 2) continue;

        const exists = await JargonEntry.findOne({ phrase });
        if (exists) {
          allExtracted.push(`⏭ ${phrase} (ya existe)`);
          continue;
        }

        await JargonEntry.create({
          phrase,
          intent: item.intent,
          keywords: item.keywords ?? [phrase],
          description: item.description,
          example: item.example ?? '',
          synonyms: item.synonyms ?? [],
          source: 'youtube',
          public: true,
        });
        totalCreated++;
        allExtracted.push(`✅ ${phrase}`);
      }
    }

    return NextResponse.json({
      totalCreated,
      textLength: clean.length,
      chunksProcessed: Math.min(chunks.length, 3),
      sourceName: sourceName ?? 'sin fuente',
      details: allExtracted,
    });
  } catch (err: any) {
    console.error('[jergario/extract]', err);
    return NextResponse.json({ error: err.message?.slice(0, 200) ?? 'Error desconocido' }, { status: 500 });
  }
}
