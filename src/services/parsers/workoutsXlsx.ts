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

export function parseWorkoutsXlsx(buffer: Buffer): ParsedWorkout[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const workouts: ParsedWorkout[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    for (const row of rows) {
      // Detect layout by finding which column has workout content
      // Layout A: work at col 3 → name at col 1, rm at col 5, jockey at col 7, trainer at col 9
      // Layout B: work at col 4 → name at col 2, rm at col 6, jockey at col 8, trainer at col 10
      const c3 = (row[3] ?? '').toString().trim();
      const c4 = (row[4] ?? '').toString().trim();

      let nameIdx: number, workStr: string, rmIdx: number, jockeyIdx: number, trainerIdx: number;

      if (isWorkContent(c3)) {
        nameIdx = 1; workStr = c3; rmIdx = 5; jockeyIdx = 7; trainerIdx = 9;
      } else if (isWorkContent(c4)) {
        nameIdx = 2; workStr = c4; rmIdx = 6; jockeyIdx = 8; trainerIdx = 10;
      } else {
        continue; // header, empty, or date row
      }

      const rawName = (row[nameIdx] ?? '').toString().trim();
      if (!rawName || rawName.length < 2) continue;
      // Skip header rows
      if (/^(EJEMPLARES|PARCIALES|JINETES|ENTRENADORES|RM)$/i.test(rawName)) continue;

      const horseName = cleanHorseName(rawName).toUpperCase().replace(/\s+/g, ' ').trim();
      if (!horseName) continue;

      const daysRaw = (row[0] ?? '').toString().trim();
      const daysRest = parseDays(daysRaw);

      const rmRaw = (row[rmIdx] ?? '').toString().trim();
      const rm = rmRaw && /^\d+[,.]?\d*$/.test(rmRaw)
        ? parseFloat(rmRaw.replace(',', '.'))
        : null;

      const jockeyName = (row[jockeyIdx] ?? '').toString().trim()
        .replace(/^TRAQUEADOR\s*/i, '');
      const trainerName = (row[trainerIdx] ?? '').toString().trim();

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
        rawBlock: `${daysRaw}|${rawName}|${workStr}|${rmRaw}|${jockeyName}|${trainerName}`,
      });
    }
  }

  return workouts;
}
