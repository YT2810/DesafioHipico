import { callLLM } from './geminiProcessor';
import type {
  ProcessedDocument,
  ExtractedMeeting,
  ExtractedRace,
  ExtractedPerson,
  ExtractedHorse,
  ExtractedEntry,
  ExtractedRaceBlock,
} from '../pdfProcessor';
import { simpleHash, parseVEDate, preprocessText, parseMeeting, splitIntoRaceBlocks } from '../pdfProcessor';

// ─── Types for Gemini single-race response ─────────────────────────────────

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

interface GeminiRace {
  raceNumber: number;
  annualRaceNumber?: number | null;
  distance: number;
  scheduledTime: string;
  conditions: string;
  games?: string[];
  horses: GeminiHorse[];
}

// ─── Prompt for a SINGLE race block ───────────────────────────────────────

function buildSingleRacePrompt(block: string): string {
  return `Eres un extractor de programas hípicos venezolanos (INH / La Rinconada).
Analiza el siguiente bloque de UNA SOLA CARRERA extraído de un PDF y devuélvelo como JSON.

EXTRAE:
- raceNumber: número entero de la carrera del día
- annualRaceNumber: número entero de la carrera del año, o null si no aparece
- distance: número entero de metros (ej: 1300)
- scheduledTime: string en formato "HH:mm" (24h). Ej: "01:25 p. m." → "13:25"
- conditions: string con las condiciones completas de la carrera
- games: array de strings con los tipos de apuesta. Si no aparece, []
- horses: array de ejemplares con los campos:
  - dorsalNumber: número entero
  - horseName: nombre SIN país entre paréntesis, SIN implementos, SIN precio de reclamo
  - nationality: código de país solo letras sin paréntesis ("USA","ARG","CHI","PER","PAN","COL") o null
  - medication: códigos de medicación (ej: "BUT-LAX") o ""
  - weightRaw: string EXACTO del PDF incluyendo descuentos (ej: "54", "55-1", "54.5-3")
  - jockeyName: nombre completo del jinete
  - trainerName: nombre completo del entrenador
  - postPosition: número entero de posición de partida
  - implements: códigos de implementos con puntos (ej: "L.CC.V.BB.M.LA.") o ""
  - claimPrice: número entero si es carrera de reclamo (ej: 8000), o null

REGLAS CRÍTICAS:
- NUNCA incluyas "(USA)","(ARG)","(CHI)","(PER)" en horseName. Pon el país en nationality.
- NUNCA incluyas "PRECIO $: 8.000,00" en horseName. Pon el número en claimPrice.
- NUNCA incluyas implementos en horseName.
- weightRaw debe ser el texto original del PDF, sin calcular.

FORMATO: Devuelve SOLO el JSON del objeto de la carrera, sin markdown, sin explicaciones.
La raíz es un objeto con los campos de arriba (NO un array, NO una clave "races").

Bloque de carrera:
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

function normalizeTime(raw: string): string {
  const m = raw.match(/(\d{1,2}):(\d{2})\s*([aApP])\.?\s*[mM]\.?/);
  if (!m) return raw;
  let h = parseInt(m[1]);
  const min = m[2];
  const meridiem = m[3].toLowerCase();
  if (meridiem === 'a' && h === 12) h = 0;
  if (meridiem === 'p' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${min}`;
}

function extractJSON(raw: string): string {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) return text.slice(firstBrace, lastBrace + 1);
  return text;
}

// ─── Convert a single GeminiRace to ExtractedRaceBlock ────────────────────

function convertRace(geminiRace: GeminiRace): ExtractedRaceBlock {
  const entries: ExtractedEntry[] = [];
  const failedLines: string[] = [];

  for (const h of geminiRace.horses) {
    try {
      const { weight, weightRaw } = parseWeight(String(h.weightRaw));
      const rawHorseName = clean(h.horseName);

      // Fallback: extraer nationality del nombre si Gemini no la separó
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

  const race: ExtractedRace = {
    raceNumber: Number(geminiRace.raceNumber),
    annualRaceNumber: geminiRace.annualRaceNumber ?? undefined,
    distance: Number(geminiRace.distance),
    scheduledTime: normalizeTime(geminiRace.scheduledTime),
    conditions: clean(geminiRace.conditions),
    prizePool: { bs: 0, usd: 0 },
    games: geminiRace.games || [],
  };

  return { race, entries, failedLines: failedLines.length > 0 ? failedLines : undefined };
}

// ─── Process a single race block with Gemini ──────────────────────────────

async function processRaceBlock(block: string, index: number): Promise<ExtractedRaceBlock | null> {
  const prompt = buildSingleRacePrompt(block);
  try {
    const responseText = await callLLM(prompt);
    const jsonText = extractJSON(responseText);
    const parsed = JSON.parse(jsonText) as GeminiRace;
    if (typeof parsed.raceNumber !== 'number') throw new Error('raceNumber faltante');
    return convertRace(parsed);
  } catch (err) {
    console.error(`[GeminiParser] Error en bloque ${index + 1}:`, err);
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
    warnings.push('No se detectaron bloques de carrera con el splitter. Verifica formato INH.');
  }

  // Process all race blocks in parallel — one small Gemini call per race
  const results = await Promise.all(blocks.map((block, i) => processRaceBlock(block, i)));

  const races: ExtractedRaceBlock[] = results
    .filter((r): r is ExtractedRaceBlock => r !== null)
    .sort((a, b) => a.race.raceNumber - b.race.raceNumber);

  const failed = results.filter((r) => r === null).length;
  if (failed > 0) {
    warnings.push(`${failed} de ${blocks.length} bloques de carrera fallaron con Gemini.`);
  }

  return { meeting, races, rawText, hash, warnings };
}
