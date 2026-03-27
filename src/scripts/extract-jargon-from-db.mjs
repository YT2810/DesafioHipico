/**
 * Extrae jerga hípica de las URLs de YouTube almacenadas en ExpertSource.
 * 1 video por pronosticador único (dedup por videoId).
 *
 * Ejecutar:
 *   export $(grep -v '^#' .env | xargs) && node src/scripts/extract-jargon-from-db.mjs
 */
import mongoose from 'mongoose';
import OpenAI from 'openai';

const MONGO_URI = process.env.MONGODB_URI || '';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

// ── YouTube transcript via native fetch ──────────────────────────────────────
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchTranscript(videoId) {
  // 1. Obtener la página del video para extraer caption tracks
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'es' },
  });
  const html = await pageRes.text();

  // 2. Extraer captionTracks del ytInitialPlayerResponse
  const match = html.match(/"captionTracks":\s*(\[.*?\])/);
  if (!match) return null;

  let tracks;
  try { tracks = JSON.parse(match[1]); } catch { return null; }
  if (!tracks.length) return null;

  // 3. Preferir español, si no el primero disponible
  const esTrack = tracks.find(t => t.languageCode === 'es') || tracks[0];
  const captionUrl = esTrack.baseUrl;
  if (!captionUrl) return null;

  // 4. Fetch el XML de la transcripción
  const capRes = await fetch(captionUrl, { headers: { 'User-Agent': UA } });
  const xml = await capRes.text();

  // 5. Parsear XML simple → texto plano
  const textRegex = /<text[^>]*>([^<]*)<\/text>/g;
  const segments = [];
  let m;
  while ((m = textRegex.exec(xml)) !== null) {
    const decoded = m[1]
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
      .replace(/&#\d+;/g, '').trim();
    if (decoded) segments.push(decoded);
  }

  return segments.join(' ');
}

if (!MONGO_URI) { console.error('Falta MONGODB_URI'); process.exit(1); }
if (!OPENROUTER_KEY) { console.error('Falta OPENROUTER_API_KEY'); process.exit(1); }

const openai = new OpenAI({
  apiKey: OPENROUTER_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://www.desafiohipico.com',
    'X-Title': 'DesafíoHípico Jergario',
  },
});

// ── Schemas inline (no podemos importar TS desde .mjs) ──────────────────────

const ExpertSourceSchema = new mongoose.Schema({
  name: String,
  platform: String,
  link: String,
}, { collection: 'expertsources' });

const JargonEntrySchema = new mongoose.Schema({
  phrase:      { type: String, unique: true, trim: true, lowercase: true },
  intent:      String,
  keywords:    [String],
  description: String,
  example:     String,
  synonyms:    [String],
  source:      { type: String, default: 'youtube' },
  public:      { type: Boolean, default: true },
  hitCount:    { type: Number, default: 0 },
}, { timestamps: true, collection: 'jargonentries' });

const ExpertSource = mongoose.model('ExpertSource', ExpertSourceSchema);
const JargonEntry = mongoose.model('JargonEntry', JargonEntrySchema);

function extractVideoId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
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

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Conectado a MongoDB\n');

  const sources = await ExpertSource.find({ platform: 'YouTube', link: { $exists: true, $ne: '' } }).lean();
  console.log(`${sources.length} fuentes YouTube encontradas`);

  const seen = new Set();
  const uniqueVideos = [];
  for (const s of sources) {
    const vid = extractVideoId(s.link);
    if (!vid || seen.has(vid)) continue;
    seen.add(vid);
    uniqueVideos.push({ name: s.name, videoId: vid });
  }
  console.log(`${uniqueVideos.length} videos únicos para procesar\n`);

  let totalCreated = 0;
  let processed = 0;
  let errors = 0;

  for (const video of uniqueVideos) {
    processed++;
    process.stdout.write(`[${processed}/${uniqueVideos.length}] ${video.name} (${video.videoId})... `);

    try {
      const fullText = await fetchTranscript(video.videoId);

      if (!fullText || fullText.length < 50) {
        console.log('⚠ transcripción muy corta, skip');
        continue;
      }

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
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log('⚠ sin JSON en respuesta');
        continue;
      }

      const extracted = JSON.parse(jsonMatch[0]);
      let created = 0;

      for (const item of extracted) {
        if (!item.phrase || !item.intent || !item.description) continue;
        const phrase = item.phrase.toLowerCase().trim();
        if (phrase.length < 2) continue;

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

      totalCreated += created;
      console.log(`✅ ${created} nuevas (${fullText.length} chars)`);
    } catch (err) {
      errors++;
      console.log(`❌ ${(err.message ?? '').slice(0, 80)}`);
    }

    // Pausa entre videos
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n=== RESUMEN ===`);
  console.log(`Procesados: ${processed}`);
  console.log(`Errores: ${errors}`);
  console.log(`Nuevas entradas: ${totalCreated}`);
  console.log(`Total en jergario: ${await JargonEntry.countDocuments()}`);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
