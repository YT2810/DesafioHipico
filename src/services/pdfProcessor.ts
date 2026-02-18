/**
 * PDF Processor — calibrated to the REAL pdfjs-extracted text from INH PDFs.
 *
 * Real extracted format per race page (pdfjs groups by Y coordinate):
 *
 *   Reunión:  Día:  Distancia:  Carrera Nro:  Llamado:  Carrera Anual Nro.:  Hora:  Fecha:
 *   1400 mts.  1  4  76  01:25 p. m.  22/02/2026
 *   9  DOMINGO
 *   HANDICAP LIBRE...  Condición:
 *   CARRERAS...
 *   Premio Bs.:  Bono $:
 *   50% al 1°  22% al 2°  12% al 3°  8% al 4°  6% al 5°  2% Prima Criador
 *   3600  37180
 *   N°  Ejemplar  Medic.  Kilos  Jinete  Implementos  Entrenador  P.P.
 *   1  QUALITY PRINCESS  BUT-LAX  53  RODRIGUEZ JEAN C  L.BZ.V.GR.LA.  RODRIGUEZ JOSE G  8
 *   JUEGOS: | GANADOR | PLACE | EXACTA | TRIFECTA | SUPERFECTA |
 *
 * Key insight: values and labels are on SEPARATE lines because pdfjs groups by Y position.
 * The values line for the race header contains: distance, raceNro, llamado, annualNro, hora, fecha
 * The reunion+dia line contains: meetingNumber  DAYOFWEEK
 * Entry lines may wrap — we pre-join them before parsing.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedTrack { name: string; location: string; country: string; }
export interface ExtractedMeeting { track: ExtractedTrack; date: string; meetingNumber: number; dayOfWeek?: string; }
export interface ExtractedRace {
  raceNumber: number; annualRaceNumber?: number; llamado?: number;
  distance: number; scheduledTime: string; conditions: string;
  prizePool: { bs: number; usd: number }; bonoPrimerCriador?: number;
  prizeDistribution?: { first: number; second: number; third: number; fourth: number; fifth: number; breederBonus: number; };
  games: string[];
}
export interface ExtractedPerson { name: string; type: 'jockey' | 'trainer'; licenseId: string; }
export interface ExtractedHorse { name: string; pedigree: { sire?: string; dam?: string }; registrationId?: string; }
export interface ExtractedEntry {
  dorsalNumber: number; postPosition: number; weight: number; weightRaw: string;
  medication?: string; implements?: string;
  horse: ExtractedHorse; jockey: ExtractedPerson; trainer: ExtractedPerson;
}
export interface ExtractedRaceBlock { race: ExtractedRace; entries: ExtractedEntry[]; }
export interface ProcessedDocument { meeting: ExtractedMeeting; races: ExtractedRaceBlock[]; rawText: string; hash: string; warnings: string[]; }

// ─── Utilities ────────────────────────────────────────────────────────────────

export function simpleHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) { h = Math.imul(31, h) + text.charCodeAt(i) | 0; }
  return Math.abs(h).toString(16);
}
function clean(s: string): string { return s.replace(/\s+/g, ' ').trim(); }
function parseVEDate(raw: string): string {
  const m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return new Date().toISOString();
  const [, d, mo, y] = m;
  const year = y.length === 2 ? '20' + y : y;
  return new Date(`${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`).toISOString();
}
function makePersonLicenseId(name: string, type: 'jockey' | 'trainer'): string {
  return `${type === 'jockey' ? 'J' : 'T'}-${name.replace(/\s+/g, '').toUpperCase().slice(0, 12)}`;
}

// ─── Text Pre-processor ───────────────────────────────────────────────────────
// pdfjs wraps long lines. Entry lines starting with "N  HORSE NAME..." may wrap.
// We join continuation lines back onto their parent entry line.

function preprocessText(raw: string): string {
  const lines = raw.split('\n').map(l => l.trimEnd());
  const result: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Entry line: starts with 1-2 digits + 2+ spaces + uppercase letter
    if (/^\d{1,2}\s{2,}[A-ZÁÉÍÓÚÑ´'(]/.test(line)) {
      let combined = line;
      // Absorb continuation lines (don't start a new entry or section keyword)
      while (
        i + 1 < lines.length &&
        lines[i + 1].trim() !== '' &&
        !/^\d{1,2}\s{2,}[A-ZÁÉÍÓÚÑ´'(]/.test(lines[i + 1]) &&
        !/^(JUEGOS|OBSERVACI|Junta|Hip[oó]dromo|Carrera\s+Prog|Reuni[oó]n|Premio|N[°o]\s+Ejemplar)/i.test(lines[i + 1].trim()) &&
        !/^\d+\s{2,}(?:LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO)/i.test(lines[i + 1])
      ) {
        i++;
        const cont = lines[i].trimStart().replace(/^\.\s*/, '');
        if (cont) combined = combined + ' ' + cont;
      }
      result.push(combined);
    } else {
      result.push(line);
    }
    i++;
  }
  return result.join('\n');
}

// ─── Meeting Parser ───────────────────────────────────────────────────────────
// Real format: "9  DOMINGO" appears as its own line (reunion + day of week).
// Date "22/02/2026" appears in the values line.

function parseMeeting(text: string, warnings: string[]): ExtractedMeeting {
  const trackMatch = text.match(/Hip[oó]dromo\s+(.+?)(?:\n|Direcci[oó]n)/i);
  const trackName = trackMatch ? clean(trackMatch[1]) : 'LA RINCONADA';

  // "9  DOMINGO" standalone line OR embedded in values line "9  DOMINGO  1200 mts. ..."
  const reunionDiaMatch = text.match(/^(\d+)\s{2,}(LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO)(?:\s|$)/im);
  const fechaMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);

  if (!reunionDiaMatch) warnings.push('No se detectó número de reunión.');
  if (!fechaMatch) warnings.push('No se detectó fecha.');

  return {
    track: { name: trackName.toUpperCase(), location: trackName.toUpperCase(), country: 'VE' },
    date: fechaMatch ? parseVEDate(fechaMatch[1]) : new Date().toISOString(),
    meetingNumber: reunionDiaMatch ? parseInt(reunionDiaMatch[1]) : 0,
    dayOfWeek: reunionDiaMatch ? reunionDiaMatch[2].toUpperCase() : undefined,
  };
}

// ─── Race Header Parser ───────────────────────────────────────────────────────
// Real values line (from pdfjs Y-grouping):
//   "1400 mts.  1  4  76  01:25 p. m.  22/02/2026"
//   order: Distancia  CarreraNro  Llamado  AnualNro  Hora  Fecha
// For carrera 2+, reunion+dia may be prepended on same line:
//   "9  DOMINGO  1200 mts.  2  20  77  01:50 p. m.  22/02/2026"

function parseRaceHeader(block: string, warnings: string[]): ExtractedRace {
  // Primary: match the values line containing distance + race fields + time + date
  const valuesMatch = block.match(
    /(\d{3,4})\s+mts\.\s{2,}(\d{1,2})\s{2,}(\d{1,2})\s{2,}(\d{1,3})\s{2,}(\d{1,2}:\d{2}\s*[aApP]\.\s*[mM]\.\s*)\s{2,}(\d{1,2}\/\d{1,2}\/\d{4})/
  );

  let raceNumber = 0, llamado = 0, annualRaceNumber = 0, distance = 0, scheduledTime = '';

  if (valuesMatch) {
    distance = parseInt(valuesMatch[1]);
    raceNumber = parseInt(valuesMatch[2]);
    llamado = parseInt(valuesMatch[3]);
    annualRaceNumber = parseInt(valuesMatch[4]);
    scheduledTime = clean(valuesMatch[5]);
  } else {
    // Fallback individual extraction
    const dm = block.match(/(\d{3,4})\s*mts\./i);
    const rm = block.match(/Carrera\s+Nro[:\s.]+(\d+)/i);
    const lm = block.match(/Llamado[:\s]+(\d+)/i);
    const am = block.match(/Carrera\s+Anual\s+Nro[.:\s]+(\d+)/i);
    const hm = block.match(/(\d{1,2}:\d{2}\s*[aApP]\.?\s*[mM]\.?)/);
    distance = dm ? parseInt(dm[1]) : 0;
    raceNumber = rm ? parseInt(rm[1]) : 0;
    llamado = lm ? parseInt(lm[1]) : 0;
    annualRaceNumber = am ? parseInt(am[1]) : 0;
    scheduledTime = hm ? clean(hm[1]) : '';
  }

  if (!raceNumber) warnings.push('No se detectó número de carrera en un bloque.');

  // Conditions: collect HANDICAP/PARA text lines, stop at Premio or table header
  const condMatch = block.match(/((?:HANDICAP|PARA\s+CABALLOS|PARA\s+YEGUAS)[\s\S]+?)(?=Premio\s+Bs\.|N[°o]\s+Ejemplar)/i);
  const conditions = condMatch ? clean(condMatch[1].replace(/Condici[oó]n\s*:/gi, '')) : '';

  // Prize line: "3600  37180" — a line with exactly two numbers after the % distribution line
  const prizeLineMatch = block.match(/^(\d{3,6})\s{2,}(\d{4,6})\s*$/m);
  const bs = prizeLineMatch ? parseInt(prizeLineMatch[1]) : 0;
  const bono = prizeLineMatch ? parseInt(prizeLineMatch[2]) : undefined;

  // Prize distribution percentages
  const distPcts = [...block.matchAll(/(\d+)%\s+al\s+(\d+)[°o]/gi)];
  const breederPct = block.match(/(\d+)%\s+Prima\s+Criador/i);
  let prizeDistribution;
  if (distPcts.length >= 3) {
    const pcts = distPcts.map(m => ({ pos: parseInt(m[2]), pct: parseInt(m[1]) }));
    prizeDistribution = {
      first: pcts.find(p => p.pos === 1)?.pct ?? 50,
      second: pcts.find(p => p.pos === 2)?.pct ?? 22,
      third: pcts.find(p => p.pos === 3)?.pct ?? 12,
      fourth: pcts.find(p => p.pos === 4)?.pct ?? 8,
      fifth: pcts.find(p => p.pos === 5)?.pct ?? 6,
      breederBonus: breederPct ? parseInt(breederPct[1]) : 2,
    };
  }

  // Games
  const juegosMatch = block.match(/JUEGOS\s*[:\|]\s*(.+?)(?:\n|$)/i);
  const games: string[] = [];
  if (juegosMatch) {
    const g = juegosMatch[1];
    if (/GANADOR/i.test(g)) games.push('GANADOR');
    if (/PLACE/i.test(g)) games.push('PLACE');
    if (/EXACTA/i.test(g)) games.push('EXACTA');
    if (/TRIFECTA/i.test(g)) games.push('TRIFECTA');
    if (/SUPERFECTA/i.test(g)) games.push('SUPERFECTA');
    if (/QUINELA/i.test(g)) games.push('QUINELA');
    if (/POOL\s+DE\s+4/i.test(g)) games.push('POOL_4');
    if (/DOBLE/i.test(g)) games.push('DOBLE_SELECCION');
  }

  return {
    raceNumber,
    annualRaceNumber: annualRaceNumber || undefined,
    llamado: llamado || undefined,
    distance,
    scheduledTime,
    conditions,
    prizePool: { bs, usd: 0 },
    bonoPrimerCriador: bono,
    prizeDistribution,
    games,
  };
}

// ─── Entry Table Parser ───────────────────────────────────────────────────────
// After preprocessText(), each entry is on a single line:
//   "1  QUALITY PRINCESS  BUT-LAX  53  RODRIGUEZ JEAN C  L.BZ.V.GR.LA.  RODRIGUEZ JOSE G  8"
// Columns separated by 2+ spaces. Weight may include penalty: "53-2", "55-4", "53.5"

function parseEntries(block: string): ExtractedEntry[] {
  const entries: ExtractedEntry[] = [];
  const lines = block.split('\n');
  let inTable = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/N[°o]?\s+Ejemplar/i.test(line)) { inTable = true; continue; }
    if (/JUEGOS|OBSERVACI[OÓ]N/i.test(line)) { inTable = false; }
    if (!inTable || !line) continue;

    // Must start with 1-2 digit dorsal
    if (!/^\d{1,2}\s/.test(line)) continue;

    // Split on 2+ spaces — this is the column separator after preprocessText
    const cols = line.split(/\s{2,}/);
    // Expected: [dorsal, horse, medication, weight, jockey, implements, trainer, pp]
    if (cols.length < 7) continue;

    const dorsal = parseInt(cols[0]);
    if (isNaN(dorsal)) continue;

    // Last column is P.P. (post position) — a 1-2 digit number
    const ppRaw = cols[cols.length - 1].trim();
    const pp = parseInt(ppRaw);
    if (isNaN(pp) || pp > 30) continue;

    // Weight is 3rd-from-last or at index 3 — it's a number possibly with penalty suffix
    // We find it by looking for a column matching weight pattern
    // cols[3] should be weight (e.g. "53", "53-2", "55-4", "53.5")
    const weightRaw = cols[3]?.trim() ?? '';
    // "53-3" = base 53 minus jockey allowance 3 → net 50kg
    // "55.5" = 55.5kg (half-kilo increment, no allowance)
    // "53"   = 53kg flat
    let weight: number;
    const allowanceMatch = weightRaw.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
    if (allowanceMatch) {
      weight = parseFloat(allowanceMatch[1]) - parseFloat(allowanceMatch[2]);
    } else {
      weight = parseFloat(weightRaw) || 0;
    }

    const horseName = clean(cols[1] ?? '');
    const medication = clean(cols[2] ?? '');
    const jockeyName = clean(cols[4] ?? '');
    const implements_ = clean(cols[5] ?? '');
    // Trainer may span multiple cols if split happened inside name — rejoin from col 6 to col length-2
    const trainerName = clean(cols.slice(6, cols.length - 1).join(' '));

    if (!horseName || !jockeyName || !trainerName) continue;

    entries.push({
      dorsalNumber: dorsal,
      postPosition: pp,
      weight,
      weightRaw,
      medication: medication || undefined,
      implements: implements_ || undefined,
      horse: { name: horseName, pedigree: {} },
      jockey: { name: jockeyName, type: 'jockey', licenseId: makePersonLicenseId(jockeyName, 'jockey') },
      trainer: { name: trainerName, type: 'trainer', licenseId: makePersonLicenseId(trainerName, 'trainer') },
    });
  }

  return entries;
}

// ─── Block Splitter ───────────────────────────────────────────────────────────
// Each race page starts with "Carrera Programada:" — split on that.

function splitIntoRaceBlocks(text: string): string[] {
  return text.split(/(?=Carrera Programada:)/i).filter(p => /Carrera Programada:/i.test(p));
}

// ─── Main Processor ───────────────────────────────────────────────────────────

export function processDocument(rawText: string): ProcessedDocument {
  const warnings: string[] = [];
  const hash = simpleHash(rawText);

  const processed = preprocessText(rawText);
  const meeting = parseMeeting(processed, warnings);
  const blocks = splitIntoRaceBlocks(processed);

  if (blocks.length === 0) {
    warnings.push('No se detectaron bloques de carrera. Verifica que el PDF sea del formato INH.');
  }

  const races: ExtractedRaceBlock[] = blocks.map((blockText) => {
    const race = parseRaceHeader(blockText, warnings);
    const entries = parseEntries(blockText);
    return { race, entries };
  });

  return { meeting, races, rawText, hash, warnings };
}
