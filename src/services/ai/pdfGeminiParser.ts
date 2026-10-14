import { callLLM } from './geminiProcessor';
import type {
  ProcessedDocument,
  ExtractedHorse,
  ExtractedEntry,
  ExtractedRaceBlock,
  ExtractedMeeting,
} from '../pdfProcessor';
import { simpleHash, preprocessText, parseMeeting, splitIntoRaceBlocks, parseRaceHeader, parseVEDate } from '../pdfProcessor';

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

// ─── HINAVA (Valencia) — Gemini hybrid parser ─────────────────────────────────
// Race headers (number, distance, time, games) → regex (reliable, never changes)
// Horse entries → Gemini (format-agnostic, survives any PDF layout change)

function buildHinavaHorsesPrompt(block: string): string {
  return `Eres un extractor de programas hípicos venezolanos del Hipódromo Nacional de Valencia (HINAVA).
Analiza el siguiente bloque de una carrera y extrae ÚNICAMENTE los ejemplares inscritos y las condiciones.

EXTRAE:
- conditions: string con el texto de condiciones/clase de la carrera (puede estar vacío "")
- horses: array con todos los ejemplares:
  - dorsalNumber: número entero (el número de partida, columna Nº)
  - horseName: nombre del caballo en MAYÚSCULAS, sin implementos ni metadata
  - medication: código de medicación (ej: "BUT-LAX", "LAX", "BUT") o ""
  - weightRaw: string EXACTO del peso incluyendo descuento si aplica (ej: "54", "55-1", "57,5")
  - jockeyName: nombre completo del jinete en mayúsculas
  - trainerName: nombre completo del entrenador en mayúsculas
  - postPosition: número entero de la posición de partida (P.P., columna al final)
  - implements: cadena de implementos con puntos (ej: "L.GR.LA.V.", "L.BB.M.") o "" si no tiene

REGLAS CRÍTICAS:
- El orden de campos puede variar entre PDFs: el peso puede ir antes o después del jinete
- Los implementos pueden ser una sola letra ("L") o múltiples códigos separados por puntos
- La posición de partida (P.P.) es siempre un entero entre 1 y 20
- Ignora líneas que empiecen con MED:, PROP:, CRIADOR:, STUD:, CT, CC, Y C — son metadata interna
- NUNCA incluyas implementos ni metadata en horseName
- weightRaw debe ser el texto original del PDF tal cual, sin calcular ni convertir
- Si el caballo está raspado/scratched pero aparece en el PDF, inclúyelo igual

FORMATO DE SALIDA: Solo JSON válido, sin markdown ni explicaciones.
Objeto raíz con "conditions" (string) y "horses" (array).

Bloque de carrera:
${block}`;
}

async function processHinavaRaceBlock(
  block: string,
  index: number,
  warnings: string[],
): Promise<ExtractedRaceBlock | null> {
  const { parseHinavaRaceHeader } = await import('../parsers/hinava');
  const raceHeader = parseHinavaRaceHeader(block, warnings);
  if (!raceHeader || !raceHeader.raceNumber) return null;

  const prompt = buildHinavaHorsesPrompt(block);
  try {
    const responseText = await callLLM(prompt);
    const jsonText = extractJSON(responseText);
    const parsed = JSON.parse(jsonText) as GeminiHorsesResponse;
    if (!Array.isArray(parsed.horses)) throw new Error('horses array faltante en respuesta Gemini HINAVA');

    const { entries, failedLines } = buildEntries(parsed.horses);
    const race = parsed.conditions
      ? { ...raceHeader, conditions: clean(parsed.conditions) }
      : raceHeader;

    return { race, entries, failedLines: failedLines.length > 0 ? failedLines : undefined };
  } catch (err) {
    console.error(`[GeminiParser HINAVA] Error bloque ${index + 1} (carrera ${raceHeader.raceNumber}):`, err);
    return null;
  }
}

export async function parseHinavaDocumentWithGemini(rawText: string): Promise<ProcessedDocument> {
  const warnings: string[] = [];
  const hash = simpleHash(rawText);

  // Meeting info — HINAVA specific patterns
  const reunionMatch = rawText.match(/^REUNION:\s*(\d+)/m);
  const fechaMatch   = rawText.match(/^FECHA:\s*(\d{1,2}\/\d{1,2}\/\d{4})/m);
  const diaMatch     = rawText.match(/^DIA:\s*(LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO)/im);

  const meeting: ExtractedMeeting = {
    track: { name: 'NACIONAL DE VALENCIA', location: 'VALENCIA', country: 'VE' },
    date: fechaMatch ? parseVEDate(fechaMatch[1]) : new Date().toISOString(),
    meetingNumber: reunionMatch ? parseInt(reunionMatch[1]) : 0,
    dayOfWeek: diaMatch ? diaMatch[1].toUpperCase() : undefined,
  };

  if (!meeting.meetingNumber) warnings.push('HINAVA: no se detectó número de reunión.');
  if (!fechaMatch)            warnings.push('HINAVA: no se detectó fecha.');

  // Split into REUNION: blocks
  const blocks = rawText.split(/(?=^REUNION:)/m).filter(b => /^REUNION:/m.test(b));
  if (blocks.length === 0) warnings.push('HINAVA: no se detectaron bloques de carrera.');

  // Process all race blocks in parallel — one Gemini call per race
  const results = await Promise.all(
    blocks.map((block, i) => processHinavaRaceBlock(block, i, warnings))
  );

  const races: ExtractedRaceBlock[] = results
    .filter((r): r is ExtractedRaceBlock => r !== null)
    .sort((a, b) => a.race.raceNumber - b.race.raceNumber);

  const failed = results.filter(r => r === null).length;
  if (failed > 0) {
    warnings.push(`${failed} de ${blocks.length} bloques fallaron con Gemini HINAVA.`);
  }

  return { meeting, races, rawText, hash, warnings };
}
