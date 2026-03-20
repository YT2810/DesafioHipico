/**
 * Parser de Excel (.xlsx) de trabajos INH — Valencia
 *
 * Layouts conocidos:
 *   Layout A (5 cols):  [nombre, trabajo, RM, jockey, entrenador]        — mayoría de archivos
 *   Layout B (10 cols): [nombre, trabajo, '', '', RM, '', jockey, '', entrenador, ''] — 060326.xlsx
 *
 * Casos especiales:
 *   - Múltiples caballos separados por \n en la misma celda
 *   - Múltiples caballos en una sola línea sin separador → [GRUPO N/total]
 *   - Filas con columna de trabajo desplazada a col2 (col1 vacía)
 *   - Filas de cabecera del documento
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
  if (/^\d+["]\d*/.test(t)) return false;
  if (/^[A-Z]{1,4}\.[A-Z][A-Z]+$/.test(t)) return false;
  if (/^[\d\s".,\-]+$/.test(t)) return false;
  return true;
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
  const splitRx = /^((?:\d+["]\d*(?:\s*[-]\s*)?)+)/;
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

/**
 * Compact a sparse 10-col row (060326.xlsx layout) to canonical 5-col:
 * [nombre, trabajo, RM, jockey, entrenador]
 * Header for 060326: [0]=EJEMPLARES [1]=PARCIALES [4]=RM [6]=JOCKEY [8]=ENTRENADOR
 */
function compactRow(row: string[]): string[] {
  while (row.length < 5) row.push('');
  if (row.length <= 5) return row.slice(0, 5);

  // Detect 10-col layout: RM at col4, jockey at col6
  const col4IsRm = parseRm(row[4]?.split('\n')[0] ?? '') !== null;
  const col6IsJockey = /^[A-Z]{1,4}\.[A-Z]/i.test((row[6] ?? '').split('\n')[0].trim());

  if (col4IsRm || col6IsJockey) {
    return [
      row[0] ?? '',  // nombre
      row[1] ?? '',  // trabajo
      row[4] ?? '',  // RM
      row[6] ?? '',  // jockey
      row[8] ?? '',  // entrenador
    ];
  }

  // Fallback: take first 5 non-empty
  const compact = row.filter(c => c.trim());
  while (compact.length < 5) compact.push('');
  return compact.slice(0, 5);
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

    for (let ri = 0; ri < rawRows.length; ri++) {
      const rawRow = rawRows[ri].map(c => (c ?? '').toString());
      const row = compactRow(rawRow);

      let [col0, col1, col2, col3, col4] = row;

      // Skip empty / header rows
      if (!col0.trim() && !col1.trim()) continue;
      if (isHeader(col0.split('\n')[0]) && (isHeader(col1.split('\n')[0]) || !col1.trim())) continue;

      // Handle shifted row: trabajo in col2, col1 empty
      // e.g. "MONEY ROYAL" | "" | "16"1 - 31"2..." | "14"1" | jockey
      if (!col1.trim() && col2.trim() && /^\d+"/.test(col2.split('\n')[0].trim())) {
        col1 = col2; col2 = col3; col3 = col4; col4 = '';
      }

      // Authoritative horse count = max non-empty trailing lines across cols
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

      // Determine names array
      let horseNames: string[];
      if (nameLines.length === nHorses) {
        horseNames = nameLines;
      } else if (nameLines.length === 1 && nHorses > 1) {
        // Concatenated names without separator — tag as [GRUPO]
        horseNames = Array.from({ length: nHorses }, (_, i) =>
          `[GRUPO ${i + 1}/${nHorses}] ${col0.trim()}`
        );
      } else {
        horseNames = nameLines.slice(0, nHorses);
        while (horseNames.length < nHorses) {
          horseNames.push(horseNames[horseNames.length - 1] ?? col0.trim());
        }
      }

      // Pad work lines
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

  return workouts;
}
