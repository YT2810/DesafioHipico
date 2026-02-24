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
export function parseVEDate(raw: string): string {
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
// pdf-parse format: labels and values on separate lines.
//   "Reunión:\n9\nDía:\nDOMINGO"
//   "22/02/2026\nFecha:"  (date appears before its label)

function parseMeeting(text: string, warnings: string[]): ExtractedMeeting {
  const trackMatch = text.match(/Hip[oó]dromo\s+(.+?)(?:\n|Direcci[oó]n)/i);
  const trackName = trackMatch ? clean(trackMatch[1]) : 'LA RINCONADA';

  // "Reunión:\n9" or "Reunión: 9"
  const reunionMatch = text.match(/Reuni[oó]n[:\s]*\n?(\d+)/i);
  // "Día:\nDOMINGO" or inline
  const diaMatch = text.match(/D[ií]a[:\s]*\n?(LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO)/i);
  const fechaMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);

  if (!reunionMatch) warnings.push('No se detectó número de reunión.');
  if (!fechaMatch) warnings.push('No se detectó fecha.');

  return {
    track: { name: trackName.toUpperCase(), location: trackName.toUpperCase(), country: 'VE' },
    date: fechaMatch ? parseVEDate(fechaMatch[1]) : new Date().toISOString(),
    meetingNumber: reunionMatch ? parseInt(reunionMatch[1]) : 0,
    dayOfWeek: diaMatch ? diaMatch[1].toUpperCase() : undefined,
  };
}

// ─── Race Header Parser ───────────────────────────────────────────────────────
// pdf-parse format — labels and values on separate lines:
//   "Distancia:\n1400 mts.1"  ← distance + raceNumber concatenated
//   "Carrera Nro:Llamado:\n476"  ← raceNro + llamado concatenated
//   "Carrera Anual Nro.:Hora:\n01:25 p. m."
//   "Premio Bs.:\n3600\nBono $:\n37180"

function parseRaceHeader(block: string, warnings: string[]): ExtractedRace {
  let raceNumber = 0, llamado = 0, annualRaceNumber = 0, distance = 0, scheduledTime = '';

  // Distance line: "1400 mts.1" or "1200 mts.2" — distance + raceNumber glued
  const distLine = block.match(/(\d{3,4})\s*mts\.(\d{1,2})(?:\s|$)/);
  if (distLine) {
    distance = parseInt(distLine[1]);
    raceNumber = parseInt(distLine[2]);
  } else {
    const dm = block.match(/Distancia[:\s]*\n?(\d{3,4})\s*mts\./i);
    if (dm) distance = parseInt(dm[1]);
  }

  // "Carrera Nro:Llamado:\n476" — value line has raceNro and llamado glued
  // Pattern: after "Carrera Nro:Llamado:" there's a line like "476"
  // raceNro is 1-2 digits, llamado is 1-2 digits, rest is annualNro
  const carreraLlamadoLine = block.match(/Carrera\s+Nro:Llamado:\s*\n?(\d{1,2})(\d{1,2})(\d{1,3})?/i);
  if (carreraLlamadoLine) {
    if (!raceNumber) raceNumber = parseInt(carreraLlamadoLine[1]);
    llamado = parseInt(carreraLlamadoLine[2]);
  } else {
    // Fallback: value line after the combined label is a short number string
    const valLine = block.match(/Carrera\s+Nro:Llamado:\s*\n(\d+)/i);
    if (valLine) {
      const val = valLine[1];
      // e.g. "476" → raceNro=4, llamado=7, annualNro=6? No — "476" = raceNro=4, llamado=7, annual=6
      // But "2077" = raceNro=2, llamado=0, annual=77? Let's use: first 1-2 digits = raceNro
      if (!raceNumber) raceNumber = parseInt(val.slice(0, val.length > 3 ? 1 : 1));
      llamado = parseInt(val.slice(raceNumber.toString().length, raceNumber.toString().length + 2)) || 0;
    }
  }

  // "Carrera Anual Nro.:Hora:\n01:25 p. m."
  const horaLine = block.match(/Carrera\s+Anual\s+Nro\.:Hora:\s*\n?(\d{1,2}:\d{2}\s*[aApP]\.\s*[mM]\.)/i);
  if (horaLine) {
    scheduledTime = clean(horaLine[1]);
  } else {
    const hm = block.match(/(\d{1,2}:\d{2}\s*[aApP]\.?\s*[mM]\.?)/);
    if (hm) scheduledTime = clean(hm[1]);
  }

  if (!raceNumber) {
    // Last fallback: look for standalone raceNumber
    const rm = block.match(/Carrera\s+Nro[:\s.]+(\d+)/i);
    if (rm) raceNumber = parseInt(rm[1]);
  }
  if (!raceNumber) warnings.push('No se detectó número de carrera en un bloque.');

  // Conditions
  const condMatch = block.match(/Condici[oó]n:\s*\n?([\s\S]+?)(?=Reuni[oó]n:|Premio\s+Bs\.|N[°o]Ejemplar)/i);
  const conditions = condMatch ? clean(condMatch[1]) : '';

  // Prize: "Premio Bs.:\n3600" and "Bono $:\n37180"
  const bsMatch = block.match(/Premio\s+Bs\.[:\s]*\n?(\d{3,6})/i);
  const bonoMatch = block.match(/Bono\s+\$[:\s]*\n?(\d{4,6})/i);
  const bs = bsMatch ? parseInt(bsMatch[1]) : 0;
  const bono = bonoMatch ? parseInt(bonoMatch[1]) : undefined;

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
// pdf-parse v1 produces entries WITHOUT column separators:
//   "1QUALITY PRINCESSBUT-LAX53RODRIGUEZ JEAN CL.BZ.V.GR.LA.RODRIGUEZ JOSE G8"
// Strategy: use medication (BUT-LAX|BUT|LAX|etc) and implements (L.XX.YY.) as anchors.
// Lines may wrap — preprocessText joins them.

// Known exact medication codes — order matters: longest first to avoid partial matches
const MED_CODES = ['BUT-LAX', 'BUT', 'LAX', 'COR-FUR', 'COR', 'FUR', 'ACE', 'DIC', 'OXY', 'ATR', 'DIM'];
// Implements: always starts with L. (látigo) followed by more codes — "L.BZ.CC.V.M.LA."
// Starting with L. prevents last letter of jockey name from being captured
const IMPL_PATTERN = /L\.(?:[A-Z]{1,3}\.)+/;

function parseEntryLine(line: string): ExtractedEntry | null {
  // Must start with 1-2 digit dorsal immediately followed by uppercase letter
  const dorsalMatch = line.match(/^(\d{1,2})([A-ZÁÉÍÓÚÑ'(].*)/);
  if (!dorsalMatch) return null;
  const dorsal = parseInt(dorsalMatch[1]);
  const rest = dorsalMatch[2];

  // Find medication anchor — search for each known code preceded by a letter (end of horse name)
  // This prevents partial name fragments (GO, MA) from being captured as medication prefix
  let medMatch: RegExpMatchArray | null = null;
  for (const code of MED_CODES) {
    // The medication code must be immediately preceded by a letter or space (end of horse name)
    // and immediately followed by digits (the weight)
    const pattern = new RegExp(`^(.*?[A-ZÁÉÍÓÚÑ'\\)\\s])(${code.replace('-', '\\-')})(\\d+(?:[\\.,]\\d+)?(?:-\\d+(?:[\\.,]\\d+)?)?)(.*)$`);
    const m = rest.match(pattern);
    if (m) { medMatch = m; break; }
  }
  if (!medMatch) return null;

  const horseName = clean(medMatch[1]);
  const medication = clean(medMatch[2]);
  const weightRaw = medMatch[3].replace(',', '.');
  const afterWeight = medMatch[4];

  // Parse weight
  let weight: number;
  const allowanceMatch = weightRaw.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (allowanceMatch) {
    weight = parseFloat(allowanceMatch[1]) - parseFloat(allowanceMatch[2]);
  } else {
    weight = parseFloat(weightRaw) || 0;
  }

  // Find implements anchor in afterWeight — pattern like "L.BZ.V.GR.LA."
  const implMatch = afterWeight.match(new RegExp(`(.*?)(${IMPL_PATTERN.source})(.*)`));
  if (!implMatch) return null;

  const jockeyName = clean(implMatch[1]);
  const implements_ = clean(implMatch[2]);
  const trainerAndPP = implMatch[3];

  // Last 1-2 digits are post position
  const ppMatch = trainerAndPP.match(/^(.*?)(\d{1,2})\s*$/);
  if (!ppMatch) return null;

  const trainerName = clean(ppMatch[1]);
  const pp = parseInt(ppMatch[2]);

  if (!horseName || !jockeyName || !trainerName || isNaN(pp) || pp > 30) return null;

  return {
    dorsalNumber: dorsal,
    postPosition: pp,
    weight,
    weightRaw,
    medication: medication || undefined,
    implements: implements_ || undefined,
    horse: { name: horseName, pedigree: {} },
    jockey: { name: jockeyName, type: 'jockey', licenseId: makePersonLicenseId(jockeyName, 'jockey') },
    trainer: { name: trainerName, type: 'trainer', licenseId: makePersonLicenseId(trainerName, 'trainer') },
  };
}

function parseEntries(block: string): ExtractedEntry[] {
  const entries: ExtractedEntry[] = [];
  // Normalize: join lines that are continuations of a wrapped entry
  // A continuation line starts with spaces or a lowercase letter or a digit that is NOT a new dorsal
  const rawLines = block.split('\n');
  const joinedLines: string[] = [];
  for (const raw of rawLines) {
    const line = raw.trim();
    if (!line) continue;
    // New entry: starts with 1-2 digits immediately followed by uppercase letter
    if (/^\d{1,2}[A-ZÁÉÍÓÚÑ'(]/.test(line)) {
      joinedLines.push(line);
    } else if (joinedLines.length > 0 && !/^(JUEGOS|OBSERVACI|GANADOR|Carrera\s+Prog|N[°o]Ejemplar)/i.test(line)) {
      // Continuation of previous line
      joinedLines[joinedLines.length - 1] += line;
    }
  }

  for (let line of joinedLines) {
    if (/JUEGOS|OBSERVACI[OÓ]N/i.test(line)) continue;
    // Strip OBSERVACION/GANADOR text that bleeds in from next section
    line = line.replace(/GANADOR\s+UN\s+EJE.*$/i, '').replace(/OBSERVACI[OÓ]N.*$/i, '').trim();
    // Remove pipe chars and surrounding spaces (PDF line-break artifact)
    line = line.replace(/\s*\|\s*/g, '');
    const entry = parseEntryLine(line);
    if (entry) entries.push(entry);
  }

  return entries;
}

// ─── Block Splitter ───────────────────────────────────────────────────────────
// Each race page starts with "Carrera Programada:" — split on that.

function splitIntoRaceBlocks(text: string): string[] {
  return text.split(/(?=Carrera Programada:)/i).filter(p => /Carrera Programada:/i.test(p));
}

// ─── Source detector ──────────────────────────────────────────────────────────

function detectSource(rawText: string): 'inh' | 'hinava' {
  if (/HIPODROMO NACIONAL DE VALENCIA/i.test(rawText)) return 'hinava';
  return 'inh';
}

// ─── Main Processor ───────────────────────────────────────────────────────────

export function processDocument(rawText: string): ProcessedDocument {
  if (detectSource(rawText) === 'hinava') {
    const { parseHinavaDocument } = require('./parsers/hinava');
    return parseHinavaDocument(rawText);
  }

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
