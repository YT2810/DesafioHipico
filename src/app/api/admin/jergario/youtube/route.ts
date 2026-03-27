import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import JargonEntry from '@/models/JargonEntry';
import { YoutubeTranscript } from 'youtube-transcript';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://www.desafiohipico.com',
    'X-Title': 'DesafíoHípico Jergario',
  },
});

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const EXTRACTION_PROMPT = `Eres un experto en hipismo venezolano. Se te da la transcripción de un video de pronósticos hípicos.

Extrae TODAS las frases, términos y jerga hípica que encuentres. Para cada una devuelve un JSON con:
- phrase: el término o frase (en minúsculas)
- intent: una de estas categorías: consensus_pick, top_picks_all, pack_5y6, best_workout, workouts_all, horse_detail, eliminated, race_program, full_program, unknown
- keywords: array de palabras clave para matching
- description: explicación breve en español de qué significa
- synonyms: variantes de la misma frase

Responde SOLO con un JSON array. Sin explicaciones fuera del JSON.
Si no hay jerga hípica relevante, devuelve [].

Enfócate en:
- Formas de pedir pronósticos (clavito, fijo, línea, flecha, dato, etc.)
- Formas de referirse a caballos (ejemplar, gualdrapa, etc.)
- Formas de referirse a entrenamientos (traqueo, briseo, obra, etc.)
- Formas de referirse a apuestas (5y6, cuadro, taquilla, etc.)
- Términos técnicos (remate, split, speed rating, etc.)
- Expresiones coloquiales del hipismo criollo`;

// POST — procesar URLs de YouTube
export async function POST(req: NextRequest) {
  const session = await auth();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { urls } = await req.json();
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'Envía un array de URLs' }, { status: 400 });
  }

  await connectMongo();

  const results: { url: string; videoId: string | null; status: string; extracted: number; transcript_length?: number }[] = [];

  for (const url of urls.slice(0, 20)) { // máx 20 URLs por request
    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      results.push({ url, videoId: null, status: 'invalid_url', extracted: 0 });
      continue;
    }

    try {
      // 1. Extraer transcripción
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'es' });
      const fullText = transcriptItems.map(t => t.text).join(' ');

      if (fullText.length < 50) {
        results.push({ url, videoId, status: 'transcript_too_short', extracted: 0, transcript_length: fullText.length });
        continue;
      }

      // 2. Enviar a OpenAI para extraer jerga (un solo llamado, texto truncado a 8000 chars)
      const truncated = fullText.slice(0, 8000);
      const completion = await openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          { role: 'user', content: truncated },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content ?? '[]';
      // Extraer JSON del response (puede venir envuelto en ```json...```)
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        results.push({ url, videoId, status: 'no_json_extracted', extracted: 0, transcript_length: fullText.length });
        continue;
      }

      const extracted: any[] = JSON.parse(jsonMatch[0]);
      let created = 0;

      for (const item of extracted) {
        if (!item.phrase || !item.intent || !item.description) continue;
        const phrase = item.phrase.toLowerCase().trim();

        // No duplicar
        const exists = await JargonEntry.findOne({ phrase });
        if (exists) continue;

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
        created++;
      }

      results.push({ url, videoId, status: 'ok', extracted: created, transcript_length: fullText.length });
    } catch (err: any) {
      const msg = err?.message ?? 'unknown_error';
      // Si es error de transcript no disponible
      const status = msg.includes('Transcript') ? 'no_transcript_available' : 'error';
      results.push({ url, videoId, status: `${status}: ${msg.slice(0, 100)}`, extracted: 0 });
    }
  }

  const totalExtracted = results.reduce((sum, r) => sum + r.extracted, 0);
  return NextResponse.json({ results, totalExtracted });
}
