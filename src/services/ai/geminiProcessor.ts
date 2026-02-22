/**
 * geminiProcessor.ts
 *
 * Multimodal AI extraction using Google Gemini.
 * Handles: YouTube links, raw text (X/Telegram), images (revista/screenshot).
 *
 * Returns structured forecast data ready for human review before publishing.
 */

import { FORECAST_LABELS, ForecastLabel } from '@/models/Forecast';

const GEMINI_API_KEY = process.env.GOOGLE_AI_KEY ?? '';
const GEMINI_TEXT_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_VISION_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export type InputType = 'youtube' | 'social_text' | 'image_ocr';

export interface RawExtractedMark {
  preferenceOrder: number;
  rawName: string;
  dorsalNumber?: number;
  label: ForecastLabel;
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
    ? `\n\nCONTEXTO DE CARRERAS EN DB (usa esto para mapear nombres):\n${
        raceEntries.map(r =>
          `Carrera ${r.raceNumber}: ${r.entries.map(e => `#${e.dorsal} ${e.horseName}`).join(', ')}`
        ).join('\n')
      }`
    : '';

  return `Eres un experto en pronósticos hípicos venezolanos. Analiza el siguiente contenido y extrae TODOS los pronósticos mencionados.

REGLAS ESTRICTAS:
1. Extrae la fecha o número de reunión si se menciona (formato YYYY-MM-DD o número entero).
2. Para cada carrera mencionada, extrae hasta 5 ejemplares en orden de preferencia.
3. Asigna una etiqueta a cada ejemplar según el lenguaje usado:
   - "Línea" = favorito claro, seguro, fijo, el que va
   - "Casi Fijo" = casi seguro, muy probable, casi fija
   - "Súper Especial" = especial, super especial, destacado
   - "Buen Dividendo" = dividendo, paga bien, sorpresa controlada
   - "Batacazo" = batacazo, longshot, sorpresón, paga mucho
   Etiquetas válidas: ${labelsStr}
4. Si hay múltiples pronosticadores en el contenido, identifica a cada uno por nombre y agrupa sus pronósticos.
5. Extrae el número de dorsal si se menciona explícitamente.
6. Si el nombre del ejemplar es parcial o abreviado, devuélvelo tal cual (rawName).${entriesContext}

FORMATO DE RESPUESTA (JSON puro, sin markdown):
{
  "meetingDate": "YYYY-MM-DD o null",
  "meetingNumber": número o null,
  "forecasts": [
    {
      "raceNumber": 1,
      "expertName": "nombre del pronosticador o null",
      "marks": [
        {
          "preferenceOrder": 1,
          "rawName": "NOMBRE DEL EJEMPLAR",
          "dorsalNumber": 5,
          "label": "Línea",
          "note": "comentario opcional"
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

// ─── Main processor ───────────────────────────────────────────────────────────

export async function processText(
  text: string,
  raceEntries?: RaceEntriesContext[]
): Promise<GeminiExtractionResult> {
  if (!GEMINI_API_KEY) {
    return { success: false, inputType: 'social_text', forecasts: [], error: 'GOOGLE_AI_KEY no configurado.' };
  }

  const prompt = buildPrompt(text, raceEntries);

  try {
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
      return { success: false, inputType: 'social_text', forecasts: [], error: `Gemini API error: ${JSON.stringify(err)}` };
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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
  if (!GEMINI_API_KEY) {
    return { success: false, inputType: 'image_ocr', forecasts: [], error: 'GOOGLE_AI_KEY no configurado.' };
  }

  const prompt = buildPrompt('(contenido extraído de la imagen adjunta)', raceEntries);

  try {
    const res = await fetch(GEMINI_VISION_URL, {
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
      return { success: false, inputType: 'image_ocr', forecasts: [], error: `Gemini Vision error: ${JSON.stringify(err)}` };
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return parseGeminiResponse(rawText, 'image_ocr');
  } catch (e) {
    return { success: false, inputType: 'image_ocr', forecasts: [], error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

export async function processYouTube(
  url: string,
  raceEntries?: RaceEntriesContext[]
): Promise<GeminiExtractionResult> {
  if (!GEMINI_API_KEY) {
    return { success: false, inputType: 'youtube', forecasts: [], error: 'GOOGLE_AI_KEY no configurado.' };
  }

  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return { success: false, inputType: 'youtube', forecasts: [], error: 'URL de YouTube inválida.' };
  }

  const transcript = await fetchYouTubeTranscript(videoId);
  if (!transcript) {
    const prompt = buildPrompt(
      `Video de YouTube: ${url}\n\nNo se pudo obtener transcripción automática. Analiza el título/descripción si es posible.`,
      raceEntries
    );
    return processTextDirect(prompt, 'youtube', url);
  }

  const prompt = buildPrompt(`TRANSCRIPCIÓN DE VIDEO YOUTUBE (${url}):\n\n${transcript}`, raceEntries);
  return processTextDirect(prompt, 'youtube', transcript);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function processTextDirect(
  prompt: string,
  inputType: InputType,
  rawTranscript?: string
): Promise<GeminiExtractionResult> {
  try {
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
      return { success: false, inputType, forecasts: [], error: `Gemini error: ${JSON.stringify(err)}` };
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return parseGeminiResponse(rawText, inputType, rawTranscript);
  } catch (e) {
    return { success: false, inputType, forecasts: [], error: e instanceof Error ? e.message : 'Error desconocido' };
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
    // Attempt to fix truncated JSON by closing open structures
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to salvage partial JSON by truncating at last complete object
      const lastBrace = jsonStr.lastIndexOf('},');
      if (lastBrace > 0) {
        jsonStr = jsonStr.slice(0, lastBrace + 1) + ']}}'; // close marks array, forecast obj, forecasts array, root
        try { parsed = JSON.parse(jsonStr); } catch { parsed = null; }
      }
      if (!parsed) {
        return { success: false, inputType, forecasts: [], rawTranscript, error: `JSON truncado de Gemini. Intenta de nuevo o usa una imagen más pequeña.` };
      }
    }
    const forecasts: RawExtractedForecast[] = (parsed.forecasts ?? []).map((f: any) => ({
      raceNumber: Number(f.raceNumber),
      expertName: f.expertName ?? null,
      marks: (f.marks ?? []).slice(0, 5).map((m: any, idx: number) => ({
        preferenceOrder: m.preferenceOrder ?? idx + 1,
        rawName: String(m.rawName ?? '').trim().toUpperCase(),
        dorsalNumber: m.dorsalNumber ? Number(m.dorsalNumber) : undefined,
        label: FORECAST_LABELS.includes(m.label) ? m.label : 'Línea',
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
