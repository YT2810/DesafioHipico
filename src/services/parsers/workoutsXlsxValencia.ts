/**
 * Parser de Excel (.xlsx) de trabajos INH — Valencia
 *
 * Layouts detectados en los archivos reales:
 *
 *   Layout A (5 cols, header): [nombre, trabajo, RM, jockey, entrenador]
 *     Header row: ['EJEMPLARES', 'PARCIALES...', 'RM', 'JOCKEY', 'ENTRENADOR']
 *     Archivos: 130326, 200226, 27022026
 *
 *   Layout B (10 cols sparse): col0=nombre, col1=trabajo, col4=RM, col6=jockey, col8=entrenador
 *     Header row: ['EJEMPLARES', 'PARCIALES...', '', '', 'RM', '', 'JOCKEY', '', 'ENTRENADOR', '']
 *     Archivo: 060326
 *
 *   Layout C (5 cols transpuesto): col0=trabajo, col1=RM, col2=jockey, col3=entrenador, col4=nombre
 *     El nombre en col4[i] corresponde a los datos de la fila i (mismo row).
 *     Header row: ['PARCIALES...', 'RM', 'JOCKEY', 'ENTRENADOR', primer_caballo]
 *     Archivo: 12022026
 *     Nota: algunas celdas de col1/col2/col3 contienen nombres de caballos (artefacto
 *     de dos bloques paralelos en el Excel original). Se filtran por parseRm/isJockey.
 */

import { ParsedWorkout } from './workouts';

// ── Helpers ────────────────────────────────────────────────────────────────

function cleanHorseName(name: string): string {
  return name
    .replace(/\s*\([+-]?[A-Z]{2,}(?:\s+y\s+[+-]?[A-Z]{2,})?\)/gi, '')
    .replace(/\s*\([+-]?[A-Z]{2,}-[A-Z]{2,}\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function isHeader(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (/^(EJEMPLARES?|PARCIALES?\s*Y\s*COMENTARIOS?|ENTRENADORES?|JINETES?|RM)$/i.test(t)) return true;
  if (/^EJERCICIOS\s+(?:EJEMPLARES\s+)?(?:TOMATIEMPO|VALENCIA)/i.test(t)) return true;
  if (/^DIVISION\s+DE\s+TOMATIEMPOS/i.test(t)) return true;
  if (/ESTADO\s+DE\s+LA\s+PISTA/i.test(t)) return true;
  if (/^INH\s*[/\\]/i.test(t)) return true;
  if (/^FECHA\s*[=:]/i.test(t)) return true;
  if (t.length > 80 && !/"/.test(t)) return true;
  return false;
}

function isValidHorseName(s: string): boolean {
  const t = s.trim();
  if (!t || t.length < 2) return false;
  if (isHeader(t)) return false;
  if (/^\d+"/.test(t)) return false;
  if (/^[A-Z]{1,4}\.[A-Z][A-Z]+$/.test(t)) return false;
  if (/^[\d\s".,\-]+$/.test(t)) return false;
  return true;
}

function isJockeyStr(s: string): boolean {
  return /^[A-Z]{1,4}\.[A-Z]/i.test(s.trim());
}

function parseRm(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/"/g, '.').replace(',', '.').replace(/\.+$/, '').trim();
  const v = parseFloat(cleaned);
  if (isNaN(v)) return null;
  return v >= 10 && v <= 30 ? v : null;
}

function splitPersonNames(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  const nameRx = /[A-Z]{1,3}\.\s*(?:[A-Z]{1,3}\.\s*)?[A-Z][A-Z\s]*/g;
  let m: RegExpExecArray | null;
  const matches: string[] = [];
  while ((m = nameRx.exec(raw)) !== null) {
    matches.push(m[0].trim());
  }
  if (matches.length > 1) return matches.filter(Boolean);
  return [raw.trim()];
}

function parseWorkLine(work: string): {
  distance: number | null;
  workoutType: 'EP' | 'ES' | 'AP' | 'galopo';
  splits: string;
  comment: string;
} {
  let workoutType: 'EP' | 'ES' | 'AP' | 'galopo' = 'galopo';
  if (/\bE\/P\b|\bE\.P\b|\(EP\)/i.test(work)) workoutType = 'EP';
  else if (/\bE\/S\b|\bE\.S\b|\(ES\)/i.test(work)) workoutType = 'ES';
  else if (/\bE\/A\b|\(AP\)/i.test(work)) workoutType = 'AP';

  let distance: number | null = null;
  const distMatch = work.match(/(\d[\d.,]+)\s*MTS?/i);
  if (distMatch) {
    const raw = distMatch[1].replace(',', '').replace('.', '');
    const v = parseInt(raw);
    if (v >= 100 && v <= 3000) distance = v;
  }

  const clean = work.trim();
  const splitRx = /^((?:\d+"[\d]?(?:\s*[-]\s*)?)+)/;
  const splitMatch = clean.match(splitRx);
  let splits = '';
  let comment = clean;
  if (splitMatch) {
    splits = splitMatch[1].trim().replace(/[-\s]+$/, '').trim();
    comment = clean.slice(splitMatch[1].length).trim();
  }

  return { distance, workoutType, splits, comment };
}

function countNonEmptyTrailing(lines: string[]): number {
  let last = lines.length;
  while (last > 0 && !lines[last - 1].trim()) last--;
  return last;
}

type SheetLayout = 'A' | 'B' | 'C';

/**
 * Detect which layout this sheet uses based on the first non-empty rows.
 *
 * Layout A: col0 = horse name (letters), col1 = workout (digits+")
 * Layout B: like A but 10 cols with RM at col4
 * Layout C: col0 = workout (digits+"), col4 = horse name (letters)
 */
function detectLayout(rows: string[][]): SheetLayout {
  // Find the first data row (skip headers)
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const r = rows[i];
    const c0 = (r[0] ?? '').trim();
    const c1 = (r[1] ?? '').trim();
    const c4 = (r[4] ?? '').trim();
    if (!c0) continue;

    // Layout C: col0 is a workout string and col4 has a horse name
    if (/^\d+"/.test(c0) && c4 && isValidHorseName(c4.split('\n')[0])) {
      return 'C';
    }
    // Layout B: col0 is horse name and there are 10 cols
    if (r.length >= 8 && isValidHorseName(c0) && /^\d+"/.test(c1)) {
      return 'B';
    }
    // Layout A: col0 is horse name, col1 is workout
    if (isValidHorseName(c0) && /^\d+"/.test(c1)) {
      return 'A';
    }
  }
  return 'A'; // default
}

/**
 * For Layout B (10-col sparse): compact to 5-col canonical.
 */
function compactLayoutB(row: string[]): string[] {
  while (row.length < 9) row.push('');
  return [
    row[0] ?? '',  // nombre
    row[1] ?? '',  // trabajo
    row[4] ?? '',  // RM
    row[6] ?? '',  // jockey
    row[8] ?? '',  // entrenador
  ];
}

// ── Main ───────────────────────────────────────────────────────────────────

export function parseWorkoutsXlsxValencia(buffer: Buffer): ParsedWorkout[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer', cellText: true, raw: false });
  const workouts: ParsedWorkout[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rawRows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    const allRows = rawRows.map(r => r.map(c => (c ?? '').toString()));

    const layout = detectLayout(allRows);

    if (layout === 'C') {
      parseLayoutC(allRows, workouts);
    } else {
      parseLayoutAB(allRows, layout, workouts);
    }
  }

  return workouts;
}

// ── Layout C parser ────────────────────────────────────────────────────────
// col4=nombre, col0=trabajo, col1=RM, col2=jockey, col3=entrenador
// The name in col4[i] goes with data in the SAME row i.
// Skip rows where col1 is not RM-like (artefact rows from parallel block).

function parseLayoutC(allRows: string[][], workouts: ParsedWorkout[]): void {
  for (let ri = 0; ri < allRows.length; ri++) {
    const r = allRows[ri];
    const work  = (r[0] ?? '').trim();
    const rmRaw = (r[1] ?? '').trim();
    const c2    = (r[2] ?? '').trim();
    const c3    = (r[3] ?? '').trim();
    const name  = (r[4] ?? '').trim();

    // Must have a workout in col0 and a horse name in col4
    if (!work || !/^\d+"/.test(work)) continue;
    if (!name || !isValidHorseName(name)) continue;

    // col1 must be RM-like; if it's a name/jockey, this row is an artefact
    const rm = parseRm(rmRaw);
    if (rm === null && rmRaw && !isJockeyStr(rmRaw)) {
      // rmRaw is something else (maybe a horse name from parallel block) — skip RM, keep row
    }

    // col2: jockey if it looks like one, otherwise skip
    const jockeyName  = isJockeyStr(c2) ? c2 : '';
    // col3: entrenador if it doesn't look like a horse name
    const trainerName = (!isValidHorseName(c3) || isJockeyStr(c3)) ? c3 : '';

    const horseName = cleanHorseName(name);
    if (!horseName || horseName.length < 2) continue;

    const { distance, workoutType, splits, comment } = parseWorkLine(work);

    workouts.push({
      horseName,
      daysRest: null,
      distance,
      workoutType,
      splits,
      comment,
      rm: rm,
      jockeyName,
      trainerName,
      rawBlock: `${horseName}|${work}|${rmRaw}|${jockeyName}|${trainerName}`,
    });
  }
}

// ── Layout A/B parser ──────────────────────────────────────────────────────

function parseLayoutAB(allRows: string[][], layout: SheetLayout, workouts: ParsedWorkout[]): void {
  for (let ri = 0; ri < allRows.length; ri++) {
    const rawRow = allRows[ri];
    const row = layout === 'B' ? compactLayoutB(rawRow) : (() => {
      const r = [...rawRow];
      while (r.length < 5) r.push('');
      return r.slice(0, 5);
    })();

    let [col0, col1, col2, col3, col4] = row;

    // Skip empty / header rows
    if (!col0.trim() && !col1.trim()) continue;
    if (isHeader(col0.split('\n')[0]) && (isHeader(col1.split('\n')[0]) || !col1.trim())) continue;

    // Handle shifted row: trabajo in col2, col1 empty
    if (!col1.trim() && col2.trim() && /^\d+"/.test(col2.split('\n')[0].trim())) {
      col1 = col2; col2 = col3; col3 = col4; col4 = '';
    }

    // Handle malformed row: everything in col0, other cols empty
    // e.g. "HONOR AND GLORY   16"2 - 32" - ...  13"1  J. PRADO  J. BRICEÑO"
    if (col0.trim() && !col1.trim() && !col2.trim()) {
      const mf = col0.trim().match(
        /^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{1,35}?)\s{2,}(\d+"[\s\S]{5,}?)\s{2,}(\d+"[\d]?)\s{2,}([A-Z]{1,4}\.[\s\S]+?)\s{2,}([A-Z]{1,4}\.[\s\S]*)$/
      );
      if (mf) {
        const horseName = cleanHorseName(mf[1]);
        if (horseName && horseName.length >= 2 && isValidHorseName(horseName)) {
          const { distance, workoutType, splits, comment } = parseWorkLine(mf[2].trim());
          workouts.push({
            horseName,
            daysRest: null,
            distance,
            workoutType,
            splits,
            comment,
            rm: parseRm(mf[3]),
            jockeyName: mf[4].trim(),
            trainerName: mf[5].trim(),
            rawBlock: `[MALFORMED]|${col0.slice(0, 120)}`,
          });
        }
      }
      continue;
    }

    // ── Multi-horse logic ──────────────────────────────────────────────────
    const rmLines   = col2.split('\n').map(s => s.trim());
    const workLines = col1.split('\n').map(s => s.trim());
    const nameLines = col0.split('\n').map(s => s.trim());

    const nHorses = Math.max(
      countNonEmptyTrailing(rmLines),
      countNonEmptyTrailing(workLines),
      countNonEmptyTrailing(nameLines),
      1
    );

    const jockeyList  = splitPersonNames(col3);
    const trainerList = splitPersonNames(col4);

    let horseNames: string[];
    if (nameLines.length === nHorses) {
      horseNames = nameLines;
    } else if (nameLines.length === 1 && nHorses > 1) {
      // Concatenated names — tag for AI resolution
      horseNames = Array.from({ length: nHorses }, (_, i) =>
        `[GRUPO ${i + 1}/${nHorses}] ${col0.trim()}`
      );
    } else {
      horseNames = nameLines.slice(0, nHorses);
      while (horseNames.length < nHorses) {
        horseNames.push(horseNames[horseNames.length - 1] ?? col0.trim());
      }
    }

    const workAssigned = workLines.slice(0, nHorses);
    while (workAssigned.length < nHorses) workAssigned.push(workLines[0] ?? '');

    for (let hi = 0; hi < nHorses; hi++) {
      const rawName   = horseNames[hi] ?? '';
      const isGroup   = rawName.startsWith('[GRUPO');
      const horseName = isGroup ? rawName : cleanHorseName(rawName);
      if (!horseName || horseName.length < 2) continue;
      if (!isGroup && !isValidHorseName(horseName)) continue;

      const workStr     = workAssigned[hi] ?? '';
      const rm          = parseRm(rmLines[hi] ?? '');
      const jockeyName  = jockeyList[hi]  ?? '';
      const trainerName = trainerList[hi] ?? '';
      const jockMismatch = jockeyList.length !== nHorses || trainerList.length !== nHorses;

      const { distance, workoutType, splits, comment } = parseWorkLine(workStr);

      workouts.push({
        horseName,
        daysRest: null,
        distance,
        workoutType,
        splits,
        comment,
        rm,
        jockeyName,
        trainerName,
        rawBlock: `${isGroup ? '[GRUPO] ' : ''}${jockMismatch ? '[JOCK?] ' : ''}${horseName}|${workStr}|${rmLines[hi] ?? ''}|${jockeyName}|${trainerName}`,
      });
    }
  }
}
