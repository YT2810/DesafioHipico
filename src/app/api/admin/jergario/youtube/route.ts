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

const EXTRACTION_PROMPT = `Eres un experto en hipismo venezolano. Se te da un texto (transcripción o análisis hípico).

IMPORTANTE: El texto puede tener MUCHOS TYPOS en nombres de caballos, jinetes y entrenadores por errores de transcripción de voz. IGNORA completamente los nombres propios. NO extraigas nombres de personas ni de caballos.

Extrae SOLO frases, términos y JERGA HÍPICA genérica. Para cada una devuelve un JSON con:
- phrase: el término o frase genérica (en minúsculas, SIN nombres propios)
- intent: una de: consensus_pick, top_picks_all, pack_5y6, best_workout, workouts_all, horse_detail, eliminated, race_program, full_program, unknown
- keywords: array de palabras clave para matching
- description: explicación breve en español de qué significa el término
- synonyms: variantes de la misma frase

Responde SOLO con un JSON array. Sin explicaciones fuera del JSON.
Si no hay jerga hípica nueva, devuelve [].

Enfócate SOLO en:
- Formas de pedir pronósticos (clavito, fijo, línea, flecha, dato, casi fijo, súper especial, etc.)
- Términos genéricos para caballos (ejemplar, gualdrapa, penco, puntero, etc.)
- Términos de entrenamientos (traqueo, briseo, obra, split, remate, etc.)
- Términos de apuestas (5y6, cuadro, taquilla, línea base, etc.)
- Expresiones coloquiales del hipismo criollo venezolano
- Verbos y frases comunes ("viene bien", "corrió fuerte", "cerró bien", "se fue por fuera", etc.)

NO extraigas: nombres de caballos, nombres de jinetes, nombres de entrenadores, números de carrera.`;

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
