/**
 * Parser de Excel (.xlsx) de trabajos INH — Valencia
 *
 * Diferencias vs La Rinconada:
 *   - Layout fijo de 5 columnas: [nombre, trabajo, RM, jockey, entrenador]
 *   - Sin columna de días de descanso
 *   - Una celda puede contener MÚLTIPLES caballos separados por \n
 *     (el INH de Valencia agrupa varios ejemplares en la misma fila)
 *   - En filas multi-caballo los jockeys/entrenadores pueden estar:
 *       a) separados por \n con mismo conteo → asignación 1:1
 *       b) mezclados en una celda con espacios → se intenta dividir por
 *          patrones de nombre de jockey (INICIAL.APELLIDO)
 *
 * Estrategia:
 *   1. Leer fila con openpyxl-style (raw cell values, preservar \n)
 *   2. Detectar filas con \n en col[0] (nombre) → "explotar" en N filas
 *   3. Para cada sub-fila individual, asignar campos normalmente
 *   4. Si el conteo de jockeys/trainers no coincide → dejar vacío y
 *      marcar rawBlock con "MULTI_MISMATCH" para que admin lo sepa
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
  return /^(EJEMPLARES?|PARCIALES?\s*Y\s*COMENTARIOS?|ENTRENADORES?|JINETES?|RM)$/i.test(s.trim());
}

/** Valencia RM format: "13\"" or "13\"1" or "13,1" — always 10-30 range */
function parseRm(s: string): number | null {
  if (!s) return null;
  // "13\"1" → 13.1,  "13\"" → 13,  "13,1" → 13.1
  const cleaned = s.replace(/"/g, '.').replace(',', '.').replace(/\.+$/, '').trim();
  const v = parseFloat(cleaned);
  if (isNaN(v)) return null;
  return v >= 10 && v <= 30 ? v : null;
}

/**
 * Split a cell value that may contain multiple people names.
 * Each name follows pattern: INITIAL.LASTNAME or INITIAL INITIAL.LASTNAME
 * e.g. "J.C.  GONZALEZ T. QUINTERO J. MORENO"
 * We split on boundaries before capital initial+dot patterns.
 */
function splitPersonNames(raw: string): string[] {
  if (!raw || !raw.trim()) return [];
  // Already split by \n — return as is
  const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
  if (lines.length > 1) return lines;

  // Try to split on boundaries: position just before a pattern like "X." or "X.X."
  // preceded by a space and a capital letter (end of previous name)
  // e.g. "J. PAEZ J.C.  GONZALEZ" → ["J. PAEZ", "J.C.  GONZALEZ"]
  const parts: string[] = [];
  // Match each name token: optional initial, dot, optional space, surname words
  const nameRx = /[A-ZÁÉÍÓÚÑ]{1,3}\.\s*(?:[A-ZÁÉÍÓÚÑ]{1,3}\.\s*)?[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]*/g;
  let m;
  const matches: { start: number; end: number; text: string }[] = [];
  while ((m = nameRx.exec(raw)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, text: m[0].trim() });
  }
  if (matches.length > 1) {
    return matches.map(x => x.text.trim()).filter(Boolean);
  }

  return [raw.trim()];
}

function parseWorkLine(work: string): {
  distance: number | null;
  workoutType: 'EP' | 'ES' | 'AP' | 'galopo';
  splits: string;
  comment: string;
} {
  // Valencia uses "E/P" and "E/S" (with slash) instead of "(EP)"
  let workoutType: 'EP' | 'ES' | 'AP' | 'galopo' = 'galopo';
  if (/\bE\/P\b|\bE\.P\b|\(EP\)/i.test(work)) workoutType = 'EP';
  else if (/\bE\/S\b|\bE\.S\b|\(ES\)/i.test(work)) workoutType = 'ES';
  else if (/\bE\/A\b|\(AP\)/i.test(work)) workoutType = 'AP';

  // Distance: look for "BRISEO X.XXX MTS" or "1.600 MTS" pattern
  let distance: number | null = null;
  const distMatch = work.match(/(\d[\d.,]+)\s*MTS?/i);
  if (distMatch) {
    const raw = distMatch[1].replace(',', '').replace('.', '');
    const v = parseInt(raw);
    if (v >= 100 && v <= 3000) distance = v;
  }

  // Splits: leading numeric tokens like "14"3 - 29" - 42"2"
  // Comment: the rest after the last numeric split token
  const clean = work.trim();

  // Find where the comment starts: first ALL-CAPS word after splits
  // Splits look like: digits + " + optional digit, dash separated
  const splitRx = /^((?:\d+["´']\d*(?:\s*[-–]\s*)?)+)/;
  const splitMatch = clean.match(splitRx);
  let splits = '';
  let comment = clean;
  if (splitMatch) {
    splits = splitMatch[1].trim().replace(/[-–\s]+$/, '').trim();
    comment = clean.slice(splitMatch[1].length).trim();
  }

  return { distance, workoutType, splits, comment };
}

// ── Main function ──────────────────────────────────────────────────────────

export function parseWorkoutsXlsxValencia(buffer: Buffer): ParsedWorkout[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer', cellText: true, raw: false });
  const workouts: ParsedWorkout[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rawRows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

    for (let ri = 0; ri < rawRows.length; ri++) {
      const row = rawRows[ri].map(c => (c ?? '').toString());
      while (row.length < 5) row.push('');

      const col0 = row[0];
      const col1 = row[1];
      const col2 = row[2];
      const col3 = row[3];
      const col4 = row[4];

      if (isHeader(col0.split('\n')[0])) continue;
      if (!col0.trim() && !col1.trim()) continue;

      // ── Case: malformed — everything concatenated in col0, other cols empty
      if (col0.trim() && !col1.trim() && !col2.trim()) {
        // Pattern: "NAME   splits   RM   jockey   trainer"
        // Name ends where the first digit-quote pattern begins
        const mfRx = /^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{1,35}?)\s{2,}(\d+["´'"]\d*[\s\S]{10,}?)\s{2,}(\d+["´'"]\d*)\s{2,}([A-Z]{1,4}\.(?:\s*[A-Z]{1,4}\.)*\s*[A-ZÁÉÍÓÚÑ]+[\s\S]+?)\s{2,}([A-Z]{1,4}\.(?:\s*[A-Z]{1,4}\.)*\s*[A-ZÁÉÍÓÚÑ]+[\s\S]*)$/;
        const mf = col0.trim().match(mfRx);
        if (mf) {
          const horseName = cleanHorseName(mf[1]);
          if (horseName && horseName.length >= 2) {
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
              rawBlock: `[MALFORMED]|${col0.slice(0, 100)}`,
            });
          }
        }
        continue;
      }

      // ── Use max line count across all columns as authoritative horse count ─
      // Keep empty lines (don't filter) so a horse with no RM isn't dropped.
      // e.g. col2 = "13\"2\n\n12\"1" → 3 lines, horse 2 has no RM (null).
      const rmLines   = col2.split('\n').map(s => s.trim());
      const workLines = col1.split('\n').map(s => s.trim());
      // The authoritative count is the maximum non-empty trailing lines
      // across names, works and RMs — avoids losing horses with empty RM
      const countLines = (lines: string[]) => {
        // Trim trailing empty lines only
        let last = lines.length;
        while (last > 0 && !lines[last - 1]) last--;
        return last;
      };
      const namesByNlRaw = col0.split('\n').map(s => s.trim());
      const nByRm  = Math.max(
        countLines(rmLines),
        countLines(workLines),
        countLines(namesByNlRaw),
        1
      );

      // Split names: prefer \n, else single line (may be multiple horses concatenated)
      // Use namesByNlRaw (no trailing-empty trim, no filter) for index alignment
      const namesByNl = namesByNlRaw;
      // Split jockeys and trainers by INITIAL.LASTNAME pattern
      const jockeyList = splitPersonNames(col3);
      const trainerList = splitPersonNames(col4);

      // Determine final horse names array
      let horseNames: string[];
      if (namesByNl.length === nByRm) {
        // Perfect \n match — use as-is
        horseNames = namesByNl;
      } else if (namesByNl.length === 1 && nByRm > 1) {
        // All names in one line — can't reliably split automatically
        // Use placeholder: the full line is stored but prefixed with [GRUPO-N]
        // This way admin sees it in the preview and knows it's a group
        // We still create N entries, one per RM/work line, with a group tag
        horseNames = Array.from({ length: nByRm }, (_, i) =>
          `[GRUPO ${i + 1}/${nByRm}] ${col0.trim()}`
        );
      } else {
        // namesByNl.length > 1 but != nByRm — take what we have, pad/trim to nByRm
        horseNames = namesByNl.slice(0, nByRm);
        while (horseNames.length < nByRm) horseNames.push(horseNames[horseNames.length - 1] ?? col0.trim());
      }

      // Pad/trim work lines to nByRm
      const workAssigned = workLines.slice(0, nByRm);
      while (workAssigned.length < nByRm) workAssigned.push(workLines[0] ?? '');

      for (let hi = 0; hi < nByRm; hi++) {
        const rawName   = horseNames[hi] ?? '';
        const isGroup   = rawName.startsWith('[GRUPO');
        const horseName = isGroup ? rawName : cleanHorseName(rawName);
        if (!horseName || horseName.length < 2) continue;
        if (!isGroup && isHeader(horseName)) continue;

        const workStr     = workAssigned[hi] ?? '';
        const rm          = parseRm(rmLines[hi] ?? '');
        const jockeyName  = jockeyList[hi]  ?? '';
        const trainerName = trainerList[hi] ?? '';

        const jockMismatch = jockeyList.length !== nByRm || trainerList.length !== nByRm;
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
          rawBlock: `${isGroup ? '[GRUPO] ' : ''}${jockMismatch ? '[JOCK_MISMATCH] ' : ''}${horseName}|${workStr}|${rmLines[hi] ?? ''}|${jockeyName}|${trainerName}`,
        });
      }
    }
  }

  return workouts;
}
