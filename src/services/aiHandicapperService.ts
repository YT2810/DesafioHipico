/**
 * aiHandicapperService.ts
 *
 * Multi-channel ingestion stubs for AI-assisted forecast extraction.
 * Each channel parses its source and returns a normalized ExtractedForecast
 * ready to be saved as a Forecast document.
 *
 * Channels:
 *   1. YouTube link  → transcript via API → LLM extraction
 *   2. Social text   → raw text → LLM extraction
 *   3. Image (OCR)   → vision model → LLM extraction
 *   4. Audio file    → whisper transcription → LLM extraction
 */

import { FORECAST_LABELS, ForecastLabel, ForecastSource } from '@/models/Forecast';

export interface ExtractedMark {
  preferenceOrder: number;
  horseName: string;
  dorsalNumber?: number;
  label: ForecastLabel;
  note?: string;
}

export interface ExtractedForecastInput {
  raceNumber: number;
  marks: ExtractedMark[];
  source: ForecastSource;
  sourceRef?: string;
  rawContent?: string;
}

export interface AIExtractionResult {
  success: boolean;
  forecasts: ExtractedForecastInput[];
  rawTranscript?: string;
  error?: string;
}

// ─── Channel 1: YouTube ───────────────────────────────────────────────────────

/**
 * Given a YouTube URL, fetch the transcript and extract forecast marks.
 * TODO: integrate youtube-transcript or YouTube Data API v3 for captions,
 *       then pass to LLM with structured prompt.
 */
export async function extractFromYouTube(url: string): Promise<AIExtractionResult> {
  console.log('[aiHandicapper] YouTube stub called with:', url);
  return {
    success: false,
    forecasts: [],
    error: 'Canal YouTube: integración pendiente (youtube-transcript + LLM).',
  };
}

// ─── Channel 2: Social Media Text ────────────────────────────────────────────

/**
 * Given raw text from Twitter/Instagram/Telegram, extract forecast marks.
 * TODO: pass to LLM with prompt that maps horse names to dorsals and
 *       infers preference order from language cues ("mi favorita", "batacazo").
 */
export async function extractFromSocialText(text: string): Promise<AIExtractionResult> {
  console.log('[aiHandicapper] Social text stub called, length:', text.length);

  const forecasts = parseTextHeuristic(text);

  return {
    success: forecasts.length > 0,
    forecasts,
    rawTranscript: text,
    error: forecasts.length === 0 ? 'No se detectaron marcas en el texto.' : undefined,
  };
}

// ─── Channel 3: Image / OCR ───────────────────────────────────────────────────

/**
 * Given an image buffer (photo of a program, screenshot, etc.), run OCR
 * and extract forecast marks.
 * TODO: integrate Tesseract.js or a vision LLM (GPT-4o vision / Gemini).
 */
export async function extractFromImage(imageBuffer: Buffer, mimeType: string): Promise<AIExtractionResult> {
  console.log('[aiHandicapper] Image OCR stub called, size:', imageBuffer.length, mimeType);
  return {
    success: false,
    forecasts: [],
    error: 'Canal Imagen/OCR: integración pendiente (Tesseract.js o visión LLM).',
  };
}

// ─── Channel 4: Audio ─────────────────────────────────────────────────────────

/**
 * Given an audio buffer (voice note, podcast clip), transcribe with Whisper
 * and extract forecast marks.
 * TODO: integrate OpenAI Whisper API or local whisper.cpp.
 */
export async function extractFromAudio(audioBuffer: Buffer, mimeType: string): Promise<AIExtractionResult> {
  console.log('[aiHandicapper] Audio stub called, size:', audioBuffer.length, mimeType);
  return {
    success: false,
    forecasts: [],
    error: 'Canal Audio: integración pendiente (Whisper API).',
  };
}

// ─── Heuristic Text Parser ────────────────────────────────────────────────────
// Lightweight rule-based parser for common Spanish handicapper patterns.
// Used as fallback before LLM integration.

const LABEL_KEYWORDS: Record<ForecastLabel, RegExp> = {
  'Línea':          /\bl[ií]nea\b/i,
  'Casi Fijo':      /casi\s+fij[oa]/i,
  'Súper Especial': /s[uú]per\s+especial/i,
  'Buen Dividendo': /buen\s+dividendo/i,
  'Batacazo':       /batacazo/i,
};

function inferLabel(text: string): ForecastLabel {
  for (const [label, re] of Object.entries(LABEL_KEYWORDS)) {
    if (re.test(text)) return label as ForecastLabel;
  }
  return 'Línea';
}

function parseTextHeuristic(text: string): ExtractedForecastInput[] {
  const results: ExtractedForecastInput[] = [];

  // Pattern: "Carrera N:" or "C.N" followed by horse names
  const raceBlocks = text.split(/(?=carrera\s+\d+|c\.\d+\s*[-:])/i);

  for (const block of raceBlocks) {
    const raceMatch = block.match(/(?:carrera\s+|c\.)(\d+)/i);
    if (!raceMatch) continue;

    const raceNumber = parseInt(raceMatch[1]);
    const marks: ExtractedMark[] = [];

    // Look for lines with horse names (ALL CAPS words 3+ chars) and optional dorsal
    const lines = block.split('\n').filter(l => l.trim());
    let order = 1;

    for (const line of lines) {
      if (order > 5) break;
      // Horse name: sequence of uppercase words
      const horseMatch = line.match(/\b([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s'(]{2,})\b/);
      const dorsalMatch = line.match(/\b(\d{1,2})\b/);
      if (!horseMatch) continue;

      marks.push({
        preferenceOrder: order++,
        horseName: horseMatch[1].trim(),
        dorsalNumber: dorsalMatch ? parseInt(dorsalMatch[1]) : undefined,
        label: inferLabel(line),
      });
    }

    if (marks.length > 0) {
      results.push({ raceNumber, marks, source: 'social_text' });
    }
  }

  return results;
}
