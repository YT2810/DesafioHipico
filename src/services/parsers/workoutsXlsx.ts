/**
 * Parser de Excel (.xlsx) de trabajos INH — La Rinconada
 *
 * El Excel tiene dos layouts de columnas (según sección):
 *   Layout A (sección normal):  [días, nombre, , trabajo, , RM, , jinete, , entrenador]
 *   Layout B (sección APARATO): [días, , nombre, , trabajo, , RM, , jinete, , entrenador]
 *
 * Se detecta el layout por qué columna tiene contenido de trabajo.
 */

import { ParsedWorkout } from './workouts';

function isWorkContent(s: string): boolean {
  return /\(EP\)|\(ES\)|\(AP\)/i.test(s) ||
    /^(GALOPO|TROTO|SOLO\s+PIQUE|UN\s+PIQUE|RECONOCI|SALIO|SALIERON|DE\s+ESCUELITA|GALOPARON|ESCUELITA)/i.test(s.trim()) ||
    /^\d+[,.]/.test(s.trim());
}

function cleanHorseName(name: string): string {
  return name
    .replace(/\s*\([+-][A-Z]{2,}(?:\s+y\s+[+-][A-Z]{2,})?\)/gi, '')
    .replace(/\s*\([+-][A-Z]{2,}-[A-Z]{2,}\)/gi, '')
    .trim();
}

function parseDays(val: string): number | null {
  const m = val.toString().trim().match(/^(\d{1,2})[VD]$/i);
  return m ? parseInt(m[1]) : null;
}

function parseWorkLine(work: string): {
  distance: number | null;
  workoutType: 'EP' | 'ES' | 'AP' | 'galopo';
  splits: string;
  comment: string;
} {
  const distMatch = work.match(/\((\d+)MTS?\)/i);
  const distance = distMatch ? parseInt(distMatch[1]) : null;

  let workoutType: 'EP' | 'ES' | 'AP' | 'galopo' = 'galopo';
  if (/\(EP\)/i.test(work)) workoutType = 'EP';
  else if (/\(ES\)/i.test(work)) workoutType = 'ES';
  else if (/\(AP\)/i.test(work)) workoutType = 'AP';

  const clean = work
    .replace(/\(\d+MTS?\)/gi, '')
    .replace(/\(EP\)|\(ES\)|\(AP\)/gi, '')
    .trim();

  const tokens = clean.split(/\s+/);
  const isNumTok = (t: string) =>
    /^[\d,./]+$/.test(t) || /^\d+[VP]$/i.test(t) || /^DDLR$/i.test(t);

  let ci = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (/^[A-ZÁÉÍÓÚÑÜ,]+$/i.test(tokens[i]) && !isNumTok(tokens[i])) {
      ci = i; break;
    }
  }

  let splits: string, comment: string;
  if (ci > 0) {
    splits = tokens.slice(0, ci).join(' ');
    comment = tokens.slice(ci).join(' ')
      .replace(/\s*\d+[.,]\d+\s*$/, '').replace(/\s*\d+\s*$/, '').trim();
  } else if (ci === 0) {
    splits = '';
    comment = tokens.join(' ')
      .replace(/\s*\d+[.,]\d+\s*$/, '').replace(/\s*\d+\s*$/, '').trim();
  } else {
    splits = clean; comment = '';
  }

  return { distance, workoutType, splits, comment };
}

function isNameContent(s: string): boolean {
  if (!s || s.length < 2) return false;
  if (/^(EJEMPLARES|PARCIALES|JINETES|ENTRENADORES|RM|EJEMPLAR)$/i.test(s)) return false;
  if (/^[A-Z]{1,3}\.[A-Z]/i.test(s) && !s.includes(' ')) return false; // jockey without space
  if (/^\d+[,.]\d/.test(s)) return false; // starts with partial number
  return true;
}

function isRmContent(s: string): boolean {
  if (!/^\d+([.,]\d+)?$/.test(s.trim())) return false;
  const v = parseFloat(s.replace(',', '.'));
  // RM for horse workouts is always between 10 and 30 seconds
  // Single digits (1-9) are days-rest or other data, not RM
  return v >= 10 && v <= 30;
}

function isJockeyContent(s: string): boolean {
  return /^[A-Z]{1,4}\.[A-Z]/i.test(s.trim()) || /^TRAQUEADOR/i.test(s.trim());
}

export function parseWorkoutsXlsx(buffer: Buffer): ParsedWorkout[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const workouts: ParsedWorkout[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    for (const row of rows) {
      const cells = row.map(c => (c ?? '').toString().trim());

      // Find the column with workout content (EP/ES/AP/GALOPO/parciales)
      let workIdx = -1;
      for (let ci = 2; ci < cells.length; ci++) {
        if (isWorkContent(cells[ci])) { workIdx = ci; break; }
      }
      if (workIdx < 0) continue;

      const workStr = cells[workIdx];

      // Name: look left of workIdx — first non-empty, valid name column
      let nameIdx = -1;
      for (let ci = workIdx - 1; ci >= 0; ci--) {
        if (cells[ci] && isNameContent(cells[ci]) && !isRmContent(cells[ci])) {
          nameIdx = ci; break;
        }
      }
      if (nameIdx < 0) continue;

      const rawName = cells[nameIdx];
      const horseName = cleanHorseName(rawName).toUpperCase().replace(/\s+/g, ' ').trim();
      if (!horseName || horseName.length < 2) continue;

      // Days: first column (col 0) — may be "4D", "10D", "6V" etc.
      const daysRaw = cells[0] ?? '';
      const daysRest = parseDays(daysRaw);

      // RM: look right of workIdx — first numeric-only cell
      let rm: number | null = null;
      let rmSkip = 0; // how many cols past workIdx is RM
      for (let ci = workIdx + 1; ci < Math.min(workIdx + 4, cells.length); ci++) {
        if (cells[ci] && isRmContent(cells[ci])) {
          rm = parseFloat(cells[ci].replace(',', '.'));
          rmSkip = ci - workIdx;
          break;
        } else if (cells[ci] && !isRmContent(cells[ci])) {
          // non-numeric non-empty — RM column is empty, stop
          break;
        }
      }

      // Jockey: first jockey-like cell after workIdx (+rmSkip)
      let jockeyName = '';
      let jockeyRelIdx = -1;
      for (let ci = workIdx + rmSkip + 1; ci < Math.min(workIdx + 6, cells.length); ci++) {
        if (cells[ci] && isJockeyContent(cells[ci])) {
          jockeyName = cells[ci].replace(/^TRAQUEADOR\s*/i, '').trim();
          jockeyRelIdx = ci;
          break;
        }
      }

      // Trainer: first non-empty cell after jockey
      let trainerName = '';
      if (jockeyRelIdx >= 0) {
        for (let ci = jockeyRelIdx + 1; ci < Math.min(jockeyRelIdx + 4, cells.length); ci++) {
          if (cells[ci] && isJockeyContent(cells[ci])) {
            trainerName = cells[ci];
            break;
          }
        }
      }

      const { distance, workoutType, splits, comment } = parseWorkLine(workStr);

      workouts.push({
        horseName,
        daysRest,
        distance,
        workoutType,
        splits,
        comment,
        rm,
        jockeyName,
        trainerName,
        rawBlock: `${daysRaw}|${rawName}|${workStr}|${rm ?? ''}|${jockeyName}|${trainerName}`,
      });
    }
  }

  return workouts;
}
