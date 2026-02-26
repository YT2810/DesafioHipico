/**
 * geminiProcessor.ts
 *
 * Multimodal AI extraction using Google Gemini.
 * Handles: YouTube links, raw text (X/Telegram), images (revista/screenshot).
 *
 * Returns structured forecast data ready for human review before publishing.
 */

import { FORECAST_LABELS, ForecastLabel } from '@/models/Forecast';

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
  hasExplicitOrder?: boolean;
  rawName: string;
  rawLabel?: string;
  dorsalNumber?: number;
  label?: ForecastLabel;
  note?: string;
}

export interface RawExtractedForecast {
  raceNumber: number;
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

function buildPrompt(content: string, raceEntries?: RaceEntriesContext[]): string {
  const labelsStr = FORECAST_LABELS.join(', ');
  const entriesContext = raceEntries && raceEntries.length > 0
    ? `\n\nCONTEXTO DE CARRERAS EN DB (usa esto para mapear nombres y dorsales):\n${
        raceEntries.map(r =>
          `Carrera ${r.raceNumber}: ${r.entries.map(e => `#${e.dorsal} ${e.horseName}`).join(', ')}`
        ).join('\n')
      }`
    : '';

  return `Eres un asistente de extracción de pronósticos hípicos venezolanos. Tu única tarea es extraer la información tal como está en el texto — NO interpretar, NO normalizar, NO cambiar etiquetas.

━━━ CAMPO rawLabel ━━━
Extrae la etiqueta/calificación EXACTA que usa el pronosticador, en sus propias palabras.
Ejemplos: "SF", "F", "CE", "fijo", "línea", "super fijo", "especial", "BD", "bat", "opción", "casi", o lo que diga el texto.
Si no hay etiqueta explícita para un caballo, usa null.
NO traduzcas ni mapees a otra cosa.

━━━ CAMPO label (normalizado para puntuación) ━━━
Este campo se asigna con las siguientes reglas ESTRICTAS:
• Si rawLabel indica claramente un solo ganador fijo ("fijo", "F", "SF", "línea", "línea fija", "el que va", "seguro") Y es el único con esa etiqueta en la carrera → "Línea"
• Si varios caballos de la misma carrera tienen etiqueta de "fijo" → todos van como "Casi Fijo" (no puede haber 2 líneas en una carrera)
• "casi", "casi fijo", "CF", "CE" → "Casi Fijo"
• "especial", "súper especial", "SE", "super" → "Súper Especial"
• "dividendo", "BD", "buen dividendo", "paga" → "Buen Dividendo"
• "batacazo", "bat", "sorpresa", "longshot" → "Batacazo"
• Sin etiqueta, lista plana sin calificación → null (dejar sin etiqueta, no asumas nada)
Etiquetas válidas: ${labelsStr}

━━━ CAMPO preferenceOrder / hasExplicitOrder ━━━
• preferenceOrder: 1 al 5 (1 = mayor preferencia). La "Línea" siempre es 1. Si no hay orden, usa el orden de aparición en el texto.
• hasExplicitOrder: true si el texto indica orden explícito (numeración, "primero", "luego", etc.). false si es lista sin jerarquía explícita.

━━━ OTRAS REGLAS ━━━
• Descartes: NO incluir en marks.
• Extrae dorsalNumber si aparece explícitamente ("#5", "el 5", dorsal).
• rawName: copia el nombre TAL COMO aparece en el texto.
• Máximo 5 marcas por carrera.
• Extrae fecha o número de reunión si se menciona.${entriesContext}

━━━ FORMATO DE RESPUESTA (JSON puro, sin markdown, sin texto extra) ━━━
{
  "meetingDate": "YYYY-MM-DD o null",
  "meetingNumber": número o null,
  "forecasts": [
    {
      "raceNumber": 1,
      "expertName": "nombre o null",
      "marks": [
        {
          "preferenceOrder": 1,
          "hasExplicitOrder": true,
          "rawName": "NOMBRE TAL COMO APARECE",
          "rawLabel": "SF",
          "dorsalNumber": 5,
          "label": "Línea",
          "note": "comentario opcional o null"
        },
        {
          "preferenceOrder": 2,
          "hasExplicitOrder": false,
          "rawName": "OTRO CABALLO",
          "rawLabel": null,
          "dorsalNumber": null,
          "label": null,
          "note": null
        }
      ]
    }
  ]
}

CONTENIDO A ANALIZAR:
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
        max_tokens: 4096,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`OpenRouter error: ${JSON.stringify(err)}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? '';
  }

  // Fallback: Google Generative Language API
  if (!GOOGLE_AI_KEY) throw new Error('No AI key configured. Set OPENROUTER_API_KEY or GOOGLE_AI_KEY.');
  const res = await fetch(GEMINI_TEXT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
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
  text: string,
  raceEntries?: RaceEntriesContext[]
): Promise<GeminiExtractionResult> {
  const prompt = buildPrompt(text, raceEntries);
  try {
    const rawText = await callLLM(prompt);
    return parseGeminiResponse(rawText, 'social_text', text);
  } catch (e) {
    return { success: false, inputType: 'social_text', forecasts: [], error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function processImage(
  imageBase64: string,
  mimeType: string,
  raceEntries?: RaceEntriesContext[]
): Promise<GeminiExtractionResult> {
  const prompt = buildPrompt('(contenido extraído de la imagen adjunta)', raceEntries);
  try {
    const rawText = await callLLMVision(prompt, imageBase64, mimeType);
    return parseGeminiResponse(rawText, 'image_ocr');
  } catch (e) {
    return { success: false, inputType: 'image_ocr', forecasts: [], error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function processYouTube(
  url: string,
  raceEntries?: RaceEntriesContext[]
): Promise<GeminiExtractionResult> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return { success: false, inputType: 'youtube', forecasts: [], error: 'URL de YouTube inválida.' };
  }

  const transcript = await fetchYouTubeTranscript(videoId);
  const content = transcript
    ? `TRANSCRIPCIÓN DE VIDEO YOUTUBE (${url}):\n\n${transcript}`
    : `Video de YouTube: ${url}\n\nNo se pudo obtener transcripción automática.`;

  const prompt = buildPrompt(content, raceEntries);
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
    // Strip markdown code fences if present
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
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
        hasExplicitOrder: m.hasExplicitOrder ?? false,
        rawName: String(m.rawName ?? '').trim().toUpperCase(),
        rawLabel: m.rawLabel ?? undefined,
        dorsalNumber: m.dorsalNumber ? Number(m.dorsalNumber) : undefined,
        label: FORECAST_LABELS.includes(m.label) ? m.label as ForecastLabel : (m.label === null ? undefined : FORECAST_LABELS[1] as ForecastLabel),
        note: m.note ?? undefined,
      })).filter((m: RawExtractedMark) => m.rawName.length > 0),
    })).filter((f: RawExtractedForecast) => f.raceNumber > 0 && f.marks.length > 0);

    return {
      success: forecasts.length > 0,
      inputType,
      meetingDate: parsed.meetingDate ?? undefined,
      meetingNumber: parsed.meetingNumber ?? undefined,
      forecasts,
      rawTranscript,
      error: forecasts.length === 0 ? 'No se detectaron pronósticos en el contenido.' : undefined,
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
