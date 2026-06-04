import { callLLM } from './geminiProcessor';
import type {
  ProcessedDocument,
  ExtractedHorse,
  ExtractedEntry,
  ExtractedRaceBlock,
} from '../pdfProcessor';
import { simpleHash, preprocessText, parseMeeting, splitIntoRaceBlocks, parseRaceHeader } from '../pdfProcessor';

// ─── Types for Gemini horses-only response ─────────────────────────────────

interface GeminiHorse {
  dorsalNumber: number;
  horseName: string;
  nationality?: string | null;
  medication?: string;
  weightRaw: string;
  jockeyName: string;
  trainerName: string;
  postPosition: number;
  implements?: string;
  claimPrice?: number | null;
}

interface GeminiHorsesResponse {
  conditions?: string;
  horses: GeminiHorse[];
}

// ─── Prompt: only ask Gemini for horses + conditions ──────────────────────
// Header fields (raceNumber, annualRaceNumber, distance, scheduledTime, games)
// are extracted by the existing regex parser — never by Gemini.

function buildHorsesPrompt(block: string): string {
  return `Eres un extractor de programas hípicos venezolanos (INH / La Rinconada).
Analiza el siguiente bloque de una carrera y extrae ÚNICAMENTE los ejemplares y las condiciones de la carrera.

EXTRAE:
- conditions: string con el texto completo de condiciones/clase de la carrera (busca después de "Condición:")
- horses: array con todos los ejemplares inscritos:
  - dorsalNumber: número entero (el número de partida)
  - horseName: nombre del caballo SIN país entre paréntesis, SIN implementos, SIN precio de reclamo
  - nationality: código país sin paréntesis ("USA","ARG","CHI","PER","PAN","COL","GB","BRZ") o null
  - medication: códigos de medicación separados por guion (ej: "BUT-LAX", "LAX") o ""
  - weightRaw: string EXACTO del PDF incluyendo descuentos (ej: "54", "55-1", "54.5-3")
  - jockeyName: nombre completo del jinete
  - trainerName: nombre completo del entrenador
  - postPosition: número entero de posición de partida (P.P.)
  - implements: códigos de implementos con puntos (ej: "L.CC.V.BB.M.LA.") o ""
  - claimPrice: número entero si es carrera de reclamo (ej: 8000 para "8.000,00"), o null

REGLAS CRÍTICAS:
- NUNCA incluyas "(USA)", "(ARG)", "(CHI)", "(PER)", etc. en horseName. Pon el país en nationality.
- NUNCA incluyas "PRECIO $: 8.000,00" o similar en horseName. El número va en claimPrice.
- NUNCA incluyas implementos (L.CC., BZ., V., GR., etc.) en horseName.
- weightRaw debe ser el texto original del PDF, sin calcular ni modificar.

FORMATO: Devuelve SOLO JSON válido sin markdown ni explicaciones.
Raíz: objeto con "conditions" (string) y "horses" (array).

Bloque:
${block}`;
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function makePersonLicenseId(name: string, type: 'jockey' | 'trainer'): string {
  return `${type === 'jockey' ? 'J' : 'T'}-${name.replace(/\s+/g, '').toUpperCase().slice(0, 12)}`;
}

function parseWeight(weightRaw: string): { weight: number; weightRaw: string } {
  const cleanRaw = weightRaw.replace(',', '.');
  const allowanceMatch = cleanRaw.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (allowanceMatch) {
    return {
      weight: parseFloat(allowanceMatch[1]) - parseFloat(allowanceMatch[2]),
      weightRaw: cleanRaw,
    };
  }
  return { weight: parseFloat(cleanRaw) || 0, weightRaw: cleanRaw };
}

function clean(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function extractJSON(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) return text.slice(firstBrace, lastBrace + 1);
  return text;
}

function buildEntries(horses: GeminiHorse[]): { entries: ExtractedEntry[]; failedLines: string[] } {
  const entries: ExtractedEntry[] = [];
  const failedLines: string[] = [];

  for (const h of horses) {
    try {
      const { weight, weightRaw } = parseWeight(String(h.weightRaw));
      const rawHorseName = clean(h.horseName);

      // Fallback: extract nationality from name if Gemini missed it
      const countryMatch = rawHorseName.match(/\s*\(([A-Z]{2,4})\)\s*$/);
      let horseName = rawHorseName;
      let nationality = h.nationality ? clean(h.nationality) : undefined;
      if (countryMatch && !nationality) {
        nationality = countryMatch[1];
        horseName = rawHorseName.slice(0, countryMatch.index).trim();
      }

      const horse: ExtractedHorse = { name: horseName, pedigree: {} };
      if (nationality) horse.nationality = nationality;

      entries.push({
        dorsalNumber: Number(h.dorsalNumber),
        postPosition: Number(h.postPosition),
        weight,
        weightRaw,
        medication: h.medication || undefined,
        implements: h.implements || undefined,
        horse,
        jockey: {
          name: clean(h.jockeyName),
          type: 'jockey',
          licenseId: makePersonLicenseId(h.jockeyName, 'jockey'),
        },
        trainer: {
          name: clean(h.trainerName),
          type: 'trainer',
          licenseId: makePersonLicenseId(h.trainerName, 'trainer'),
        },
      });
    } catch (err) {
      failedLines.push(`dorsal ${h.dorsalNumber}: ${err}`);
    }
  }

  return { entries, failedLines };
}

// ─── Process a single race block (hybrid: regex header + Gemini horses) ───

async function processRaceBlock(block: string, index: number): Promise<ExtractedRaceBlock | null> {
  // 1. Extract header fields with regex (deterministic, never wrong)
  const headerWarnings: string[] = [];
  const raceHeader = parseRaceHeader(block, headerWarnings);

  // 2. Ask Gemini only for horses + conditions
  const prompt = buildHorsesPrompt(block);
  try {
    const responseText = await callLLM(prompt);
    const jsonText = extractJSON(responseText);
    const parsed = JSON.parse(jsonText) as GeminiHorsesResponse;
    if (!Array.isArray(parsed.horses)) throw new Error('horses array faltante en respuesta Gemini');

    const { entries, failedLines } = buildEntries(parsed.horses);

    // Use Gemini conditions if available, otherwise keep regex-parsed conditions
    const race = parsed.conditions
      ? { ...raceHeader, conditions: clean(parsed.conditions) }
      : raceHeader;

    return { race, entries, failedLines: failedLines.length > 0 ? failedLines : undefined };
  } catch (err) {
    console.error(`[GeminiParser] Error en bloque ${index + 1} (carrera ${raceHeader.raceNumber}):`, err);
    return null;
  }
}

// ─── Main export ───────────────────────────────────────────────────────────

export async function processDocumentWithGemini(rawText: string): Promise<ProcessedDocument> {
  const warnings: string[] = [];
  const hash = simpleHash(rawText);

  const processed = preprocessText(rawText);
  const meeting = parseMeeting(processed, warnings);
  const blocks = splitIntoRaceBlocks(processed);

  if (blocks.length === 0) {
    warnings.push('No se detectaron bloques de carrera. Verifica formato INH.');
  }

  // Process all race blocks in parallel — one small Gemini call per race
  const results = await Promise.all(blocks.map((block, i) => processRaceBlock(block, i)));

  const races: ExtractedRaceBlock[] = results
    .filter((r): r is ExtractedRaceBlock => r !== null)
    .sort((a, b) => a.race.raceNumber - b.race.raceNumber);

  const failed = results.filter((r) => r === null).length;
  if (failed > 0) {
    warnings.push(`${failed} de ${blocks.length} bloques fallaron con Gemini.`);
  }

  return { meeting, races, rawText, hash, warnings };
}
