/**
 * geminiProcessor.ts
 *
 * Multimodal AI extraction using Google Gemini.
 * Handles: YouTube links, raw text (X/Telegram), images (revista/screenshot).
 *
 * Returns structured forecast data ready for human review before publishing.
 */


const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY ?? '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001';
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

const USE_OPENROUTER = !!OPENROUTER_API_KEY;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GEMINI_TEXT_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_AI_KEY}`;


export type InputType = 'youtube' | 'social_text' | 'image_ocr';

export interface RawExtractedMark {
  preferenceOrder: number;
  rawName?: string;
  rawLabel?: string;
  dorsalNumber?: number;
}

export interface RawExtractedForecast {
  raceNumber: number;
  hasOrder: boolean;
  expertName?: string;
  marks: RawExtractedMark[];
}

export interface GeminiExtractionResult {
  success: boolean;
  inputType: InputType;
  meetingDate?: string;
  meetingNumber?: number;
  forecasts: RawExtractedForecast[];
  rawTranscript?: string;
  error?: string;
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(content: string): string {
  return `Eres un extractor de datos de pronósticos hípicos. Convierte el texto a JSON extrayendo SOLO lo escrito.

FORMATOS POSIBLES (pueden mezclarse en el mismo texto):
A) Solo dorsales con orden: "1) 3/2/1/4" → carrera 1, dorsales 3,2,1,4 en ese orden de preferencia.
B) Dorsal con sufijo-etiqueta pegado: "8Oro", "1Fijo", "5SF", "3F" → dorsalNumber=8, rawLabel="Oro". Separar el número del sufijo.
C) Nombre con etiqueta: "COSMOS (SF)" o "COSMOS fijo" → rawName="COSMOS", rawLabel="SF".
D) Solo nombre sin etiqueta: "NEPTUNO" → rawName="NEPTUNO", sin rawLabel.
E) Listas separadas por / o , o espacios.

CAMPOS POR MARCA:
- preferenceOrder: posición en la lista (1=primero, 2=segundo…). Máx 5.
- dorsalNumber: número de dorsal si está explícito. Omitir si no hay.
- rawName: nombre del caballo si aparece. Omitir si solo hay dorsal.
- rawLabel: sufijo/etiqueta exacta del pronosticador ("Oro","SF","F","fijo","opción", etc.). Omitir si no hay.

POR CARRERA:
- raceNumber: entero. "1)" o "primera" = 1, etc.
- hasOrder: true si el orden de la lista indica preferencia (listas con /, numeradas, "primero/segundo"). false si son equivalentes.
- (VIP) u otras anotaciones de la carrera: ignorar, no afectan los campos.

REGLA IMPORTANTE: Si una lista es "3/2/1/4" con orden explícito por posición → hasOrder: true.

JSON puro sin markdown:
{"meetingNumber":null,"forecasts":[{"raceNumber":1,"hasOrder":true,"marks":[{"preferenceOrder":1,"dorsalNumber":3},{"preferenceOrder":2,"dorsalNumber":2},{"preferenceOrder":3,"dorsalNumber":1,"rawLabel":"Oro"},{"preferenceOrder":4,"dorsalNumber":4}]}]}

TEXTO:
${content}`;
}

// ─── Context types ────────────────────────────────────────────────────────────

export interface RaceEntryItem {
  dorsal: number;
  horseName: string;
}

export interface RaceEntriesContext {
  raceNumber: number;
  entries: RaceEntryItem[];
}

// ─── Core LLM caller (OpenRouter or Google direct) ────────────────────────────

async function callLLM(prompt: string): Promise<string> {
  if (USE_OPENROUTER) {
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
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 8192,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OpenRouter error: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    const choice = data?.choices?.[0];
    const finishReason = choice?.finish_reason;
    const content = choice?.message?.content ?? '';
    if (finishReason === 'length') {
      // Model hit token limit — append sentinel so parseGeminiResponse knows
      return content + '__TRUNCATED__';
    }
    return content;
  }

  // Fallback: Google Generative Language API
  if (!GOOGLE_AI_KEY) throw new Error('No AI key configured. Set OPENROUTER_API_KEY or GOOGLE_AI_KEY.');
  const res = await fetch(GEMINI_TEXT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

async function callLLMVision(prompt: string, imageBase64: string, mimeType: string): Promise<string> {
  if (USE_OPENROUTER) {
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
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        }],
        temperature: 0.1,
        max_tokens: 8192,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OpenRouter vision error: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }

  // Fallback: Google direct (vision)
  if (!GOOGLE_AI_KEY) throw new Error('No AI key configured.');
  const res = await fetch(GEMINI_TEXT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gemini Vision error: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ─── Main processor ───────────────────────────────────────────────────────────

export async function processText(
  text: string
): Promise<GeminiExtractionResult> {
  const prompt = buildPrompt(text);
  try {
    const rawText = await callLLM(prompt);
    return parseGeminiResponse(rawText, 'social_text', text);
  } catch (e) {
    return { success: false, inputType: 'social_text', forecasts: [], error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function processImage(
  imageBase64: string,
  mimeType: string
): Promise<GeminiExtractionResult> {
  const prompt = buildPrompt('(contenido extraído de la imagen adjunta)');
  try {
    const rawText = await callLLMVision(prompt, imageBase64, mimeType);
    return parseGeminiResponse(rawText, 'image_ocr');
  } catch (e) {
    return { success: false, inputType: 'image_ocr', forecasts: [], error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function processYouTube(
  url: string
): Promise<GeminiExtractionResult> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return { success: false, inputType: 'youtube', forecasts: [], error: 'URL de YouTube inválida.' };
  }

  const transcript = await fetchYouTubeTranscript(videoId);
  const content = transcript
    ? `TRANSCRIPCIÓN DE VIDEO YOUTUBE (${url}):\n\n${transcript}`
    : `Video de YouTube: ${url}\n\nNo se pudo obtener transcripción automática.`;

  const prompt = buildPrompt(content);
  return processTextDirect(prompt, 'youtube', transcript ?? url);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function processTextDirect(
  prompt: string,
  inputType: InputType,
  rawTranscript?: string
): Promise<GeminiExtractionResult> {
  try {
    const rawText = await callLLM(prompt);
    return parseGeminiResponse(rawText, inputType, rawTranscript);
  } catch (e) {
    return { success: false, inputType, forecasts: [], rawTranscript, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}


function parseGeminiResponse(
  rawText: string,
  inputType: InputType,
  rawTranscript?: string
): GeminiExtractionResult {
  try {
    console.log('[Gemini raw response]', rawText.slice(0, 500));
    const wasTruncated = rawText.includes('__TRUNCATED__');
    // Strip sentinel and markdown code fences
    const cleaned = rawText
      .replace('__TRUNCATED__', '')
      .replace(/^\s*```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, inputType, forecasts: [], rawTranscript, error: `Gemini no devolvió JSON válido. Respuesta: ${rawText.slice(0, 200)}` };
    }

    let jsonStr = jsonMatch[0];
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Salvage truncated JSON: try progressively shorter cuts until parseable
      let salvaged = false;
      // Strategy 1: close at last complete mark object
      const lastMarkEnd = jsonStr.lastIndexOf('"note"');
      if (lastMarkEnd > 0) {
        // find closing brace after last note value
        const closeAfter = jsonStr.indexOf('}', lastMarkEnd);
        if (closeAfter > 0) {
          const candidate = jsonStr.slice(0, closeAfter + 1) + ']}]}';
          try { parsed = JSON.parse(candidate); salvaged = true; } catch { /* next */ }
        }
      }
      // Strategy 2: cut at last },  boundary
      if (!salvaged) {
        const lastBrace = jsonStr.lastIndexOf('},');
        if (lastBrace > 0) {
          const candidate = jsonStr.slice(0, lastBrace + 1) + ']}}'; 
          try { parsed = JSON.parse(candidate); salvaged = true; } catch { /* next */ }
        }
      }
      // Strategy 3: cut at last complete forecast
      if (!salvaged) {
        const lastForecast = jsonStr.lastIndexOf('"raceNumber"');
        const prevForecast = jsonStr.lastIndexOf('"raceNumber"', lastForecast - 1);
        if (prevForecast > 0) {
          const cutAt = jsonStr.lastIndexOf('},', lastForecast);
          if (cutAt > 0) {
            const candidate = jsonStr.slice(0, cutAt + 1) + ']}}';
            try { parsed = JSON.parse(candidate); salvaged = true; } catch { /* give up */ }
          }
        }
      }
      if (!parsed) {
        return { success: false, inputType, forecasts: [], rawTranscript, error: `JSON truncado — el texto es demasiado largo. Divide el texto en partes más pequeñas (por ejemplo, por carrera) e inténtalo de nuevo.` };
      }
    }
    const forecasts: RawExtractedForecast[] = (parsed.forecasts ?? []).map((f: any) => ({
      raceNumber: Number(f.raceNumber),
      expertName: f.expertName ?? null,
      marks: (f.marks ?? []).slice(0, 5).map((m: any, idx: number) => ({
        preferenceOrder: m.preferenceOrder ?? idx + 1,
        rawName: m.rawName ? String(m.rawName).trim().toUpperCase() : undefined,
        rawLabel: m.rawLabel ?? undefined,
        dorsalNumber: m.dorsalNumber ? Number(m.dorsalNumber) : undefined,
      })).filter((m: any) => (m.rawName && m.rawName.length > 0) || m.dorsalNumber),
      hasOrder: f.hasOrder === true,
    })).filter((f: RawExtractedForecast) => f.raceNumber > 0 && f.marks.length > 0);

    const truncatedWarning = wasTruncated && forecasts.length > 0
      ? `⚠️ Respuesta parcial (texto muy largo) — se recuperaron ${forecasts.length} carrera(s). Verifica que estén todas las carreras esperadas.`
      : undefined;

    return {
      success: forecasts.length > 0,
      inputType,
      meetingDate: parsed.meetingDate ?? undefined,
      meetingNumber: parsed.meetingNumber ?? undefined,
      forecasts,
      rawTranscript,
      error: forecasts.length === 0
        ? (wasTruncated ? 'Respuesta truncada sin datos recuperables. Divide el texto por secciones e intenta de nuevo.' : 'No se detectaron pronósticos en el contenido.')
        : truncatedWarning,
    };
  } catch {
    return { success: false, inputType, forecasts: [], rawTranscript, error: 'Error al parsear respuesta de Gemini.' };
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      { headers: { 'Accept-Language': 'es-VE,es;q=0.9' } }
    );
    const html = await res.text();
    const captionMatch = html.match(/"captionTracks":\[.*?"baseUrl":"(.*?)"/);
    if (!captionMatch) return null;

    const captionUrl = captionMatch[1].replace(/\\u0026/g, '&');
    const captionRes = await fetch(captionUrl);
    const captionXml = await captionRes.text();

    const texts = captionXml.match(/<text[^>]*>(.*?)<\/text>/g) ?? [];
    const transcript = texts
      .map(t => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'"))
      .join(' ');

    return transcript.length > 100 ? transcript : null;
  } catch {
    return null;
  }
}

// ─── Name similarity (Levenshtein) ───────────────────────────────────────────

export function similarityScore(a: string, b: string): number {
  const s1 = a.toUpperCase().trim();
  const s2 = b.toUpperCase().trim();
  if (s1 === s2) return 1.0;
  if (s2.includes(s1) || s1.includes(s2)) return 0.85;

  const m = s1.length, n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = s1[i - 1] === s2[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  const maxLen = Math.max(m, n);
  return maxLen === 0 ? 1 : 1 - dp[m][n] / maxLen;
}

export function findBestMatch(
  rawName: string,
  entries: RaceEntryItem[]
): { horseName: string; entryIdx: number; confidence: number } | null {
  let best = { horseName: '', entryIdx: -1, confidence: 0 };
  for (let i = 0; i < entries.length; i++) {
    const score = similarityScore(rawName, entries[i].horseName);
    if (score > best.confidence) {
      best = { horseName: entries[i].horseName, entryIdx: i, confidence: score };
    }
  }
  return best.confidence >= 0.6 ? best : null;
}
