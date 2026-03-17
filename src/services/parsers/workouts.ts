/**
 * Parser de PDFs de trabajos INH — La Rinconada
 *
 * Formatos soportados:
 *   AJUSTES MIERCOLES/MARTES/JUEVES DD DE MES YYYY.pdf
 *   TRABAJOS SABADO/MARTES DD DE MES YYYY.pdf
 *
 * Formato de cada entrada (una línea o bloque por caballo):
 *   [RM]NOMBRE_CABALLO\n
 *   PARCIALES (DISTANCIA) (TIPO) COMENTARIO TIEMPO_FINAL\n
 *   JINETE ENTRENADOR\n
 *
 * Ejemplo con tiempos:
 *   4DARCANO
 *   16 29 41,4 (600MTS) (ES) 54,2 2P 68,1/ 83,1// MUY COMODO Y SHN, JINETE PARADO EN LOS ESTRIBOS 12,4
 *   J.C.RODRIGUEZ  J.D.RIVAS
 *
 * Ejemplo galopo:
 *   8DFANTASTIC SHOT
 *   GALOPO SUAVE (EP)
 *   Y.LEON  R.GAMEZ
 */

export interface ParsedWorkout {
  horseName: string;
  daysRest: number | null;
  distance: number | null;
  workoutType: 'EP' | 'ES' | 'AP' | 'galopo';
  splits: string;
  comment: string;
  jockeyName: string;
  trainerName: string;
  rawBlock: string;
}

const MONTH_MAP: Record<string, string> = {
  enero: '01', ene: '01',
  febrero: '02', feb: '02',
  marzo: '03', mar: '03',
  abril: '04', abr: '04',
  mayo: '05',
  junio: '06', jun: '06',
  julio: '07', jul: '07',
  agosto: '08', ago: '08',
  septiembre: '09', sep: '09', sept: '09',
  octubre: '10', oct: '10',
  noviembre: '11', nov: '11',
  diciembre: '12', dic: '12',
};

function tryParseDate(day: string, monthToken: string, year: string): Date | null {
  const m = MONTH_MAP[monthToken.toLowerCase()];
  if (!m) return null;
  const d = day.padStart(2, '0');
  const y = year.length === 2 ? `20${year}` : year;
  return new Date(`${y}-${m}-${d}T12:00:00Z`);
}

// Extrae la fecha del nombre del archivo o del contenido del PDF — tolerante a mayúsculas/minúsculas y variantes
export function extractWorkoutDate(text: string, filename: string): Date | null {
  // Prueba en texto del PDF primero: "FECHA= MIERCOLES 11/03 DEL 2026" o "FECHA= 11/03/2026"
  const hdrSlash = text.match(/FECHA[=:\s]+(?:\w+\s+)?(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/i);
  if (hdrSlash) {
    const [, d, m, y] = hdrSlash;
    const yr = y.length === 2 ? `20${y}` : y;
    return new Date(`${yr}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00Z`);
  }
  const hdrText = text.match(/FECHA[=:\s]+(?:\w+\s+)?(\d{1,2})\s+(?:DE\s+)?(\w+)\s+(\d{2,4})/i);
  if (hdrText) {
    const r = tryParseDate(hdrText[1], hdrText[3], hdrText[4] ?? hdrText[3]);
    // re-match with proper groups
    const hdr2 = text.match(/FECHA[=:\s]+(?:\w+\s+)?(\d{1,2})\s+(?:DE\s+)?(\w+)\s+(\d{2,4})/i);
    if (hdr2) { const r2 = tryParseDate(hdr2[1], hdr2[2], hdr2[3]); if (r2) return r2; }
    if (r) return r;
  }

  // Prueba en el nombre del archivo con múltiples patrones
  const sources = [filename, text.split('\n').slice(0, 5).join(' ')];
  for (const src of sources) {
    // Patrón: "14 DE MARZO 2026" o "14 de marzo 2026" o "14-marzo-2026"
    const m1 = src.match(/(\d{1,2})\s*(?:DE\s+|[-_])(\w+)\s*(?:DE[L]?\s+)?(\d{2,4})/i);
    if (m1) { const r = tryParseDate(m1[1], m1[2], m1[3]); if (r) return r; }
    // Patrón: "14/03/2026" o "14-03-2026"
    const m2 = src.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/i);
    if (m2) {
      const [, d, mo, y] = m2;
      const yr = y.length === 2 ? `20${y}` : y;
      const dt = new Date(`${yr}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00Z`);
      if (!isNaN(dt.getTime())) return dt;
    }
    // Patrón: "MARZO 14 2026"
    const m3 = src.match(/(\w+)\s+(\d{1,2})\s+(\d{4})/i);
    if (m3) { const r = tryParseDate(m3[2], m3[1], m3[3]); if (r) return r; }
  }
  return null;
}

// Parsea la distancia de la cadena "(600MTS)" o "(1000MTS)"
function parseDistance(token: string): number | null {
  const m = token.match(/\((\d+)MTS?\)/i);
  return m ? parseInt(m[1]) : null;
}

// Parsea el tipo de trabajo de la cadena "(EP)", "(ES)", "(AP)"
function parseWorkoutType(token: string): 'EP' | 'ES' | 'AP' | 'galopo' {
  const t = token.toUpperCase();
  if (t.includes('(EP)')) return 'EP';
  if (t.includes('(ES)')) return 'ES';
  if (t.includes('(AP)')) return 'AP';
  return 'galopo';
}

// Extrae los días de descanso del prefijo numérico: "4D" → 4, "13D" → 13
function parseDaysRest(prefix: string): number | null {
  const m = prefix.match(/^(\d+)D/i);
  return m ? parseInt(m[1]) : null;
}

// Extrae los parciales + tiempo final (todo lo numérico antes del comentario)
function parseSplitsAndComment(line: string): { splits: string; comment: string } {
  // Parciales: secuencias de números con comas, separados por espacios
  // Comentario: texto en mayúsculas después de la distancia/tipo
  // Ejemplo: "16 29 41,4 (600MTS) (ES) 54,2 2P 68,1/ 83,1// MUY COMODO 12,4"

  // Quitar la parte de distancia y tipo del inicio del análisis
  const cleaned = line
    .replace(/\(\d+MTS?\)/gi, '')
    .replace(/\(EP\)|\(ES\)|\(AP\)/gi, '')
    .trim();

  // Separar la parte numérica de la parte de texto
  // Los parciales son como: 16 29 41,4 54,2 2P 68,1/ 83,1// 12,4
  // El comentario es el texto en letras: MUY COMODO Y SHN
  const commentMatch = cleaned.match(/([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s,\.]+(?:\d+,\d+)?)\s*$/);
  const comment = commentMatch ? commentMatch[1].replace(/\d+,\d+\s*$/, '').trim() : '';
  const splitsRaw = comment ? cleaned.slice(0, cleaned.lastIndexOf(comment)).trim() : cleaned;

  return {
    splits: splitsRaw.trim(),
    comment: comment.trim(),
  };
}

export function parseWorkoutsPdf(text: string): ParsedWorkout[] {
  const workouts: ParsedWorkout[] = [];

  // Normalizar saltos de línea
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // El texto puede tener múltiples secciones de fechas; procesamos todo como una lista lineal.
  // Buscamos bloques: NOMBRE (con posible prefijo de días), luego línea de trabajo, luego jinete/entrenador

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Saltar encabezados / separadores del PDF
    if (
      line.startsWith('DIVISION') ||
      line.startsWith('EJEMPLARES') ||
      line.startsWith('(EJERCICIOS') ||
      line.startsWith('FECHA=') ||
      line.startsWith('PARCIALES') ||
      line.includes('INH/ LA RINCONADA') ||
      line.includes('ESTADO DE LA PISTA') ||
      line.includes('ENTRENADORES') ||
      line.length < 3
    ) {
      i++;
      continue;
    }

    // Detectar línea de nombre de caballo:
    // Puede empezar con dígitos+D (ej: "4D", "13D") o ir directamente con el nombre
    const horseLineMatch = line.match(/^(\d+D)?\s*([A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ\s\(\)\+\-\.,']+)$/i);

    if (horseLineMatch) {
      const daysPrefix = horseLineMatch[1] ?? '';
      const rawName = horseLineMatch[2].trim();
      const daysRest = parseDaysRest(daysPrefix);

      // Línea siguiente: trabajo o galopo
      const workLine = lines[i + 1] ?? '';
      const jockeyLine = lines[i + 2] ?? '';

      // Detectar si es galopo (sin tiempos)
      const isGalopo = /GALOPO/i.test(workLine);

      // Extraer distancia y tipo del workLine
      const distance = parseDistance(workLine);
      const workoutType = parseWorkoutType(workLine);

      let splits = '';
      let comment = '';

      if (!isGalopo && workLine) {
        const parsed = parseSplitsAndComment(workLine);
        splits = parsed.splits;
        comment = parsed.comment;
      } else if (isGalopo) {
        // Extraer comentario del tipo de galopo: "GALOPO SUAVE (EP)"
        const galopoMatch = workLine.match(/GALOPO\s+([A-Z\s]+)/i);
        comment = galopoMatch ? galopoMatch[1].trim() : '';
      }

      // Línea de jinete/entrenador: "J.C.RODRIGUEZ  J.D.RIVAS"
      // Dos nombres separados por 2+ espacios, o detectados por puntos
      let jockeyName = '';
      let trainerName = '';
      if (jockeyLine && !jockeyLine.match(/^\d+D?/) && !jockeyLine.match(/^[A-Z]{5,}\s+[A-Z]{5,}/)) {
        const parts = jockeyLine.split(/\s{2,}/);
        if (parts.length >= 2) {
          jockeyName = parts[0].trim();
          trainerName = parts[1].trim();
        } else {
          // Fallback: si están separados por un solo espacio pero ambos tienen puntos (abreviaciones)
          const dotParts = jockeyLine.match(/([A-Z][A-Z\.]+)\s+([A-Z][A-Z\.,\s]+)$/);
          if (dotParts) {
            jockeyName = dotParts[1].trim();
            trainerName = dotParts[2].trim();
          }
        }
      }

      workouts.push({
        horseName: rawName,
        daysRest,
        distance,
        workoutType,
        splits,
        comment,
        jockeyName,
        trainerName,
        rawBlock: [line, workLine, jockeyLine].join(' | '),
      });

      // Avanzar según si encontramos una línea de jinete/entrenador válida
      i += jockeyName ? 3 : 2;
      continue;
    }

    i++;
  }

  return workouts;
}
