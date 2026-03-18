/**
 * Parser de PDFs de trabajos INH — La Rinconada
 * Usa posiciones X del PDF para asignar columnas correctamente.
 * Rangos X verificados empíricamente:
 *   Col 1 (x<78):      Días descanso (ej: "4D", "13D")
 *   Col 2 (x 78-230):  Nombre ejemplar
 *   Col 3 (x 230-610): Parciales y comentarios
 *   Col 4 (x 610-640): RM
 *   Col 5 (x 640-705): Jinete
 *   Col 6 (x >705):    Entrenador
 * Agrupación por (page, Y) para evitar colisiones entre páginas.
 */

export interface ParsedWorkout {
  horseName: string;
  daysRest: number | null;
  distance: number | null;
  workoutType: 'EP' | 'ES' | 'AP' | 'galopo';
  splits: string;
  comment: string;
  rm: number | null;
  jockeyName: string;
  trainerName: string;
  rawBlock: string;
}

const MONTH_MAP: Record<string, string> = {
  enero: '01', ene: '01', febrero: '02', feb: '02',
  marzo: '03', mar: '03', abril: '04', abr: '04',
  mayo: '05', junio: '06', jun: '06', julio: '07', jul: '07',
  agosto: '08', ago: '08', septiembre: '09', sep: '09', sept: '09',
  octubre: '10', oct: '10', noviembre: '11', nov: '11',
  diciembre: '12', dic: '12',
};

function tryParseDate(day: string, monthToken: string, year: string): Date | null {
  const m = MONTH_MAP[monthToken.toLowerCase()];
  if (!m) return null;
  const y = year.length === 2 ? `20${year}` : year;
  return new Date(`${y}-${m}-${day.padStart(2, '0')}T12:00:00Z`);
}

const MONTH_NAMES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|jun|jul|ago|sep|sept|oct|nov|dic';

export function extractWorkoutDate(text: string, filename: string): Date | null {
  const sources = [filename, text.split('\n').slice(0, 8).join(' ')];
  for (const src of sources) {
    // Match: "05 FEBRERO 2026" or "05 DE FEBRERO 2026" or "5-FEBRERO-2026"
    const m1 = src.match(new RegExp(`(\\d{1,2})\\s*(?:DE\\s+|[-_])?(${MONTH_NAMES})\\s*(?:DE[L]?\\s+)?(\\d{2,4})`, 'i'));
    if (m1) { const r = tryParseDate(m1[1], m1[2], m1[3]); if (r) return r; }
    // Match: "05/02/2026" or "05-02-2026"
    const m2 = src.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/i);
    if (m2) {
      const yr = m2[3].length === 2 ? `20${m2[3]}` : m2[3];
      const dt = new Date(`${yr}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}T12:00:00Z`);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  return null;
}

function colOf(x: number): number {
  if (x < 78)  return 1;  // días
  if (x < 230) return 2;  // nombre
  if (x < 610) return 3;  // trabajo+comentario
  if (x < 640) return 4;  // RM
  if (x < 705) return 5;  // jinete
  return 6;               // entrenador
}

function isHeaderStr(s: string): boolean {
  const t = s.trim();
  return /^(DIVISION|EJEMPLARES|PARCIALES|ENTRENADORES|JINETES|INH\/)/i.test(t) ||
    /^APARATO\s*$/i.test(t) ||
    /^RM$/i.test(t);
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
      ci = i;
      break;
    }
  }

  let splits: string;
  let comment: string;
  if (ci > 0) {
    splits = tokens.slice(0, ci).join(' ');
    comment = tokens.slice(ci).join(' ')
      .replace(/\s*\d+[.,]\d+\s*$/, '')
      .replace(/\s*\d+\s*$/, '')
      .trim();
  } else if (ci === 0) {
    splits = '';
    comment = tokens.join(' ')
      .replace(/\s*\d+[.,]\d+\s*$/, '')
      .replace(/\s*\d+\s*$/, '')
      .trim();
  } else {
    splits = clean;
    comment = '';
  }

  return { distance, workoutType, splits, comment };
}

// Remove implements like (+GR), (-BB), (+OT), (+GR y +BB) but keep (USA), (CHI), (ARG) etc
function cleanHorseName(name: string): string {
  return name
    .replace(/\s*\([+-][A-Z]{2,}(?:\s+y\s+[+-][A-Z]{2,})?\)/gi, '')
    .trim();
}

function isWorkContent(s: string): boolean {
  return /\(EP\)|\(ES\)|\(AP\)/i.test(s) ||
    /^(GALOPO|TROTO|SOLO\s+PIQUE|UN\s+PIQUE|RECONOCI|SALIO|SALIERON|DE\s+ESCUELITA|GALOPARON)/i.test(s.trim()) ||
    /^\d+[,.]/.test(s.trim());
}

export async function parseWorkoutsPdfBuffer(buffer: Buffer): Promise<ParsedWorkout[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');

  // Collect items with page index
  const allItems: { page: number; x: number; y: number; s: string }[] = [];
  let pageIdx = 0;

  const options = {
    pagerender: (pageData: any) => {
      const pn = pageIdx++;
      return pageData.getTextContent({ normalizeWhitespace: false }).then((tc: any) => {
        for (const item of tc.items) {
          const s = item.str as string;
          if (!s.trim()) continue;
          allItems.push({
            page: pn,
            x: Math.round(item.transform[4]),
            y: Math.round(item.transform[5]),
            s,
          });
        }
        return '';
      });
    },
  };

  await pdfParse(buffer, options);

  // Group by (page, Y) — items on the same physical row share page+Y
  const rowMap = new Map<string, { [col: number]: string }>();
  for (const item of allItems) {
    const key = `${item.page}_${item.y}`;
    const col = colOf(item.x);
    if (!rowMap.has(key)) rowMap.set(key, {});
    const row = rowMap.get(key)!;
    // Append with space separator (items on same col are fragments of same text)
    row[col] = row[col] ? row[col] + item.s : item.s;
  }

  // Sort rows: by page asc, then by Y desc (top of page first — PDF Y grows upward)
  const sortedKeys = [...rowMap.keys()].sort((a, b) => {
    const [pa, ya] = a.split('_').map(Number);
    const [pb, yb] = b.split('_').map(Number);
    if (pa !== pb) return pa - pb;
    return yb - ya;
  });

  const workouts: ParsedWorkout[] = [];

  for (const key of sortedKeys) {
    const row = rowMap.get(key)!;
    const col2 = (row[2] ?? '').trim();
    const col3 = (row[3] ?? '').trim();

    // Need both a horse name (col2) and a workout description (col3)
    if (!col2 || !col3) continue;

    // Skip header rows
    if (isHeaderStr(col2) || isHeaderStr(col3)) continue;

    // col3 must look like workout content
    if (!isWorkContent(col3)) continue;

    // col2 must look like a horse name — reject pure numeric/jockey lines
    if (/^\d+[,.]/.test(col2)) continue;  // parcial number leaked into col2
    if (isHeaderStr(col2)) continue;

    // Parse days: col1 may have "4D" or "13D", or embedded in col2 like "4DARCANO" (rare)
    let daysRest: number | null = null;
    let rawName = col2;

    const col1 = (row[1] ?? '').trim();
    const daysFromCol1 = col1.match(/^(\d{1,2})V?D?$/i);
    if (daysFromCol1 && /D/i.test(col1)) {
      daysRest = parseInt(daysFromCol1[1]);
    } else {
      // Try embedded: "4DARCANO" — but only if col1 is empty or non-numeric
      const embedded = rawName.match(/^(\d{1,2})D(.+)$/i);
      if (embedded) {
        daysRest = parseInt(embedded[1]);
        rawName = embedded[2].trim();
      }
    }

    const horseName = cleanHorseName(rawName).toUpperCase().replace(/\s+/g, ' ').trim();
    if (!horseName || horseName.length < 2) continue;

    // RM: prefer col4 (dedicated RM column), fallback to end of col3
    let rm: number | null = null;
    const col4 = (row[4] ?? '').trim();
    if (col4 && /^\d+[,.]?\d*$/.test(col4)) {
      rm = parseFloat(col4.replace(',', '.'));
    } else {
      const rmEnd = col3.match(/(\d+(?:[,.]\d+)?)\s*$/);
      if (rmEnd) rm = parseFloat(rmEnd[1].replace(',', '.'));
    }

    const { distance, workoutType, splits, comment } = parseWorkLine(col3);

    const jockeyRaw = (row[5] ?? '').trim();
    const jockeyName = jockeyRaw.replace(/^TRAQUEADOR\s*/i, '').trim();
    const trainerName = (row[6] ?? '').trim();

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
      rawBlock: `${col1}|${col2}|${col3}|${col4}|${jockeyName}|${trainerName}`,
    });
  }

  return workouts;
}

// Legacy text-based export — only used internally for extractWorkoutDate
export function parseWorkoutsPdf(_text: string): ParsedWorkout[] {
  return [];
}
