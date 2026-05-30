/**
 * Parser for HINAVA (Hipódromo Nacional de Valencia) PDF format.
 *
 * Each race block starts with "REUNION: N" and entries are on separate lines:
 *   dorsalNumber
 *   HORSE NAME
 *   SIRE - DAM
 *   B.L (or L)
 *   0,00
 *   weight (e.g. 55, 54-2, 53,5-3,5)
 *   JOCKEY NAME
 *   implements (e.g. L.V.LA.OT.BB.GR)
 *   TRAINER NAME
 *   postPosition
 *   MED:
 *   year
 *   PROP: ...
 */

import { simpleHash, parseVEDate } from '../pdfProcessor';
import type {
  ProcessedDocument, ExtractedMeeting, ExtractedRaceBlock,
  ExtractedRace, ExtractedEntry, ExtractedPerson, ExtractedHorse,
} from '../pdfProcessor';

function clean(s: string): string { return s.replace(/\s+/g, ' ').trim(); }

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

function makePersonLicenseId(name: string, type: 'jockey' | 'trainer'): string {
  return `${type === 'jockey' ? 'J' : 'T'}-${name.replace(/\s+/g, '').toUpperCase().slice(0, 12)}`;
}

function parseWeight(raw: string): number {
  const s = raw.replace(',', '.').trim();
  const m = s.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (m) return parseFloat(m[1]) - parseFloat(m[2]);
  return parseFloat(s) || 0;
}

// ─── Race block parser ────────────────────────────────────────────────────────
// A block starts at "REUNION:" and ends before the next "REUNION:" or EOF.

function parseHinavaBlock(block: string, warnings: string[]): ExtractedRaceBlock | null {
  const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Meeting info
  const reunionMatch = block.match(/^REUNION:\s*(\d+)/m);
  const fechaMatch   = block.match(/^FECHA:\s*(\d{1,2}\/\d{1,2}\/\d{4})/m);
  const horaMatch    = block.match(/^HORA:\s*(\d{1,2}:\d{2}\s*[aApP]\.\s*[mM]\.)/m);
  const diaMatch     = block.match(/^DIA:\s*(LUNES|MARTES|MI[EÉ]RCOLES|JUEVES|VIERNES|S[AÁ]BADO|DOMINGO)/im);
  const carreraMatch = block.match(/^CARRERA DEL DIA:\s*\n(\d+)/m);
  const distMatch    = block.match(/^DISTANCIA:\s*\n([\d.]+)/m);
  const premioMatch  = block.match(/^Bs\s+([\d.,]+)/m);
  // Conditions: from HANDICAP/PESOS/etc. up to (but not including) PREMIO BS.
  const condMatch    = block.match(/^((?:HANDICAP|PESOS|P E\.|COPA)[\s\S]+?)(?=\nPREMIO BS\.)/m);
  const anualMatch   = block.match(/^CARRERA\s+DEL\s+(?:A[ÑN]O|ANUAL)[:\s]*\n?\s*(\d+)/im);

  const raceNumber = carreraMatch ? parseInt(carreraMatch[1]) : 0;
  if (!raceNumber) { warnings.push('HINAVA: no se detectó número de carrera.'); return null; }

  const distance = distMatch ? parseInt(distMatch[1].replace('.', '')) : 0;
  const scheduledTime = horaMatch ? normalizeTime(clean(horaMatch[1])) : '';
  const conditions = condMatch ? clean(condMatch[0]) : '';
  const bsRaw = premioMatch ? premioMatch[1].replace('.', '').replace(',', '.') : '0';
  const bs = parseFloat(bsRaw) || 0;
  const annualRaceNumber = anualMatch ? parseInt(anualMatch[1]) : undefined;

  // Prize distribution — HINAVA uses 60/28/7/3/2 or 60/20/9/6/5
  const pctMatches = [...block.matchAll(/^(\d+)\s*$/gm)];
  // After "% 1º ... % 5º" there are 5 consecutive single numbers
  const pctIdx = lines.findIndex(l => l === '% 1º');
  let prizeDistribution;
  if (pctIdx >= 0 && pctIdx + 9 < lines.length) {
    const pcts = [1,3,5,7,9].map(offset => parseInt(lines[pctIdx + offset]) || 0);
    prizeDistribution = { first: pcts[0], second: pcts[1], third: pcts[2], fourth: pcts[3], fifth: pcts[4], breederBonus: 0 };
  }

  // Games — from OBSERVACIONES block
  const games: string[] = [];
  if (/GANADOR\s*\nX/m.test(block))    games.push('GANADOR');
  if (/PLACE\s*\nX/m.test(block))      games.push('PLACE');
  if (/EXACTA\s*\nX/m.test(block))     games.push('EXACTA');
  if (/TRIFECTA\s*\nX/m.test(block))   games.push('TRIFECTA');
  if (/SUPERFECTA\s*\nX/m.test(block)) games.push('SUPERFECTA');
  if (/TRIPLE\s*APUESTA/m.test(block)) games.push('TRIPLE_APUESTA');
  if (/POOL\s*DE\s*4/m.test(block))    games.push('POOL_DE_4');
  if (/5\s*Y\s*6|CINCO\s*Y\s*SEIS/m.test(block)) games.push('CINCO_Y_SEIS');
  if (/LOTO/m.test(block))             games.push('LOTO_HIPICO');

  const race: ExtractedRace = {
    raceNumber,
    annualRaceNumber,
    distance,
    scheduledTime,
    conditions,
    prizePool: { bs, usd: 0 },
    prizeDistribution,
    games,
  };

  // ─── Entry parser ─────────────────────────────────────────────────────────
  // Find the table header line "NºEJEMPLARBsKgsJINETEENTRENADORP.P"
  // º is char 186 (not standard °), so use /^N.EJEMPLAR/ to match any char after N
  const tableStart = lines.findIndex(l => /^N.EJEMPLAR/i.test(l));
  const tableEnd   = lines.findIndex(l => /^OBSERVACIONES/i.test(l));
  if (tableStart < 0) return { race, entries: [] };

  // After the header there's a repeated block: PROGRAMACION, INSTITUTO, HIPODROMO, JUNTA,
  // CARRERA DEL DIA, number, Mtrs., % 1º, 60, % 2º, 28, % 3º, 7, % 4º, 3, % 5º, 2
  // Skip all of that — entries start at the first standalone 1-2 digit dorsal number
  const allLines = lines.slice(tableStart + 1, tableEnd > 0 ? tableEnd : undefined);

  // Find where actual entries start (first standalone dorsal after the header block)
  // The header block ends after the 5 percentage values
  let entryStart = 0;
  for (let j = 0; j < allLines.length; j++) {
    if (/^% 5/.test(allLines[j])) { entryStart = j + 2; break; } // skip "% 5º" and its value
  }
  const entryLines = allLines.slice(entryStart);

  // Each entry is exactly 10 lines:
  // [0] dorsal, [1] horse name, [2] pedigree, [3] med marker (B.L/L/B,L),
  // [4] price (0,00), [5] weight, [6] jockey, [7] implements, [8] trainer, [9] PP
  const entries: ExtractedEntry[] = [];
  const failedLines: string[] = [];
  let i = 0;
  while (i < entryLines.length) {
    const line = entryLines[i];

    // Entry starts: a standalone 1-2 digit number (dorsal)
    if (!/^\d{1,2}$/.test(line)) { i++; continue; }
    const dorsal = parseInt(line);
    if (dorsal < 1 || dorsal > 30) { i++; continue; }

    const horseName  = entryLines[i + 1] ? clean(entryLines[i + 1]).replace(/\s+Precio\s+\$[\s:,.\d]+$/i, '').trim() : '';
    if (!horseName || /^(PROGRAMACION|INSTITUTO|HIPODROMO|JUNTA|CARRERA|%|Mtrs)/i.test(horseName)) { i++; continue; }
    // Skip lines that are clearly STUD/metadata names (come after STUD: label in previous entry)
    if (i > 0 && /^(MED:|PROP:|CRIADOR:|STUD:|PESO|G:|C:|M:)/i.test(entryLines[i - 1] ?? '')) { i++; continue; }

    // Layout: [i]=dorsal, [i+1]=horse, [i+2]=pedigree (may span 2 lines), [i+3]=med OR price, ...
    // Medication line is B.L / B,L / L — optional. Price is always 0,00.
    // Find medication and price dynamically.
    // Handle split pedigree: if pedigree line ends with " -" the next line is the dam name
    let pedigreeOffset = 3;
    const pedigreeLine = entryLines[i + 2] ? clean(entryLines[i + 2]) : '';
    if (pedigreeLine.endsWith(' -') || pedigreeLine.endsWith('-')) {
      pedigreeOffset = 4; // pedigree split across 2 lines, skip both
    }
    let wi = i + pedigreeOffset;
    let medication: string | undefined;
    // Check if i+3 is a med marker (not a number)
    const maybeMed = entryLines[wi]?.trim() ?? '';
    // Accept all observed HINAVA medication variants:
    //   B.L  B.L.  B,L  B,L.  .L  .L.  L  L.  B  B.
    //   (PDF sometimes drops 'B' → ".L", sometimes adds trailing dot → "B.L.")
    if (/^\.?B?[.,]?L\.?$/.test(maybeMed) || /^\.?B[.,]L\.?$/i.test(maybeMed) || /^B\.?$/i.test(maybeMed)) {
      const normalized = maybeMed.replace(/^\.|\.$|,/g, match => match === ',' ? '.' : ''); // normalise
      const hasB = /B/i.test(normalized);
      const hasL = /L/i.test(normalized);
      medication = (hasB && hasL) ? 'BUT-LAX' : hasB ? 'BUT' : hasL ? 'LAX' : maybeMed;
      wi++; // skip med marker
    }
    // Now skip price (0,00)
    if (entryLines[wi]?.trim() === '0,00') wi++;
    // wi now points to weight
    const weightRaw  = entryLines[wi]     ? entryLines[wi].trim()     : '';
    const jockeyName = entryLines[wi + 1] ? clean(entryLines[wi + 1]) : '';
    const implements_= entryLines[wi + 2] ? clean(entryLines[wi + 2]) : '';
    const trainerName= entryLines[wi + 3] ? clean(entryLines[wi + 3]) : '';
    const ppRaw      = entryLines[wi + 4] ? entryLines[wi + 4].trim() : '';
    const pp         = parseInt(ppRaw);

    if (!weightRaw.match(/^\d/) || isNaN(pp) || pp < 1 || pp > 30 || !jockeyName || !trainerName) {
      const horseName2 = entryLines[i + 1] ? clean(entryLines[i + 1]) : '?';
      failedLines.push(`#${dorsal} ${horseName2} | med=${JSON.stringify(maybeMed)} weight=${JSON.stringify(weightRaw)} pp=${ppRaw}`);
      i++; continue;
    }

    const weight = parseWeight(weightRaw);
    const horse: ExtractedHorse = { name: horseName, pedigree: {} };
    const jockey: ExtractedPerson = { name: jockeyName, type: 'jockey', licenseId: makePersonLicenseId(jockeyName, 'jockey') };
    const trainer: ExtractedPerson = { name: trainerName, type: 'trainer', licenseId: makePersonLicenseId(trainerName, 'trainer') };

    entries.push({
      dorsalNumber: dorsal,
      postPosition: pp,
      weight,
      weightRaw,
      medication: medication || undefined,
      implements: implements_ || undefined,
      horse,
      jockey,
      trainer,
    });

    // Skip the post-PP metadata block: MED:, year, PROP:, CRIADOR:, ..., STUD:, stud name, PESO, colors...
    // Advance until we hit the next dorsal number or end of entries
    let skip = wi + 5;
    while (skip < entryLines.length) {
      const sl = entryLines[skip].trim();
      // Stop at the next standalone dorsal (1-2 digits, 1-30)
      if (/^\d{1,2}$/.test(sl) && parseInt(sl) >= 1 && parseInt(sl) <= 30) break;
      skip++;
    }
    i = skip;
  }

  return { race, entries, failedLines: failedLines.length > 0 ? failedLines : undefined };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseHinavaDocument(rawText: string): ProcessedDocument {
  const warnings: string[] = [];
  const hash = simpleHash(rawText);

  // Detect meeting info from first block
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
  if (!fechaMatch) warnings.push('HINAVA: no se detectó fecha.');

  // Split into race blocks — each starts with "REUNION:"
  const blocks = rawText.split(/(?=^REUNION:)/m).filter(b => /^REUNION:/m.test(b));

  const races: ExtractedRaceBlock[] = [];
  for (const block of blocks) {
    const result = parseHinavaBlock(block, warnings);
    if (result && result.race.raceNumber > 0) races.push(result);
  }

  if (races.length === 0) warnings.push('HINAVA: no se detectaron bloques de carrera.');

  return { meeting, races, rawText, hash, warnings };
}
