/**
 * Parser de PDFs de trabajos INH — La Rinconada
 *
 * Formato real del PDF (tabla con columnas):
 *   Col 1: Número de carrera (ej: "4D", "7D") — puede estar vacía
 *   Col 2: Nombre del ejemplar
 *   Col 3: Parciales y comentarios (ej: "14,1 27 39 (600MTS) (EP) 51,2 MUY COMODO")
 *   Col 4: RM (remate, número, ej: "12", "15,3") — puede estar vacío
 *   Col 5: Jinete o TRAQUEADOR
 *   Col 6: Entrenador
 *
 * El PDF puede contener múltiples secciones de fechas diferentes.
 * Puede incluir una sección "APARATO" separada con ejercicios de aparato.
 * Texto puede ser mayúsculas, minúsculas o mixto (Excel arcaico del hipódromo).
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

/**
 * Separa jinete y entrenador de una línea concatenada sin espacio.
 * Ej: "G.GONZALEZF.PARILLI.T" → ["G.GONZALEZ", "F.PARILLI.T"]
 * Patrón: cada nombre tiene forma LETRA.APELLIDO (inicial+punto+letras)
 * Buscamos el punto de corte donde empieza una nueva inicial mayúscula
 * después de terminar el primer nombre.
 */
function splitJockeyTrainer(line: string): [string, string] {
  // Nombres típicos: "G.GONZALEZ", "J.C.RODRIGUEZ", "F.PARILLI.T", "C.L.UZCATEGUI"
  // Patrón: una o dos iniciales (X. o X.Y.) seguidas de APELLIDO
  // Buscamos la segunda ocurrencia de una letra mayúscula seguida de punto
  // que NO sea parte de un apellido (como en "D'ANGELO" o "ALEMAN, Jr")

  // Estrategia: buscar todas las posiciones donde aparece [A-Z]\. que podrían
  // ser el inicio de un segundo nombre
  const matches = [...line.matchAll(/(?<=[A-ZÁÉÍÓÚ])[A-ZÁÉÍÓÚ](?=\.)/g)];
  // El primer nombre termina en el índice donde empieza el segundo
  // Buscamos el patrón: letras/puntos del nombre1 + letra mayúscula de inicio nombre2
  // Regex: nombre = (\w+\.)+\w+ o similar
  // Más robusto: partir en la primera letra mayúscula que sigue a una letra minúscula
  // o a un apellido completo (buscar segunda secuencia INICIAL.)

  // Approach: encontrar el índice donde empieza el segundo token X.
  // Un token de nombre empieza con [A-Z] seguido de '.'
  // Encontramos todas las posiciones i donde line[i] es mayúscula y line[i+1] es '.'
  const starts: number[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    if (/[A-ZÁÉÍÓÚ]/.test(line[i]) && line[i + 1] === '.') {
      starts.push(i);
    }
  }

  // El primer nombre inicia en starts[0] (o 0 si no hay punto al inicio)
  // El segundo nombre inicia en el primer start que es POSTERIOR al primer apellido
  // El primer apellido termina cuando hay una secuencia de letras SIN punto
  // Buscamos el split: después del primer bloque X.APELLIDO o X.Y.APELLIDO
  // Un apellido = letras sin punto al final (puede tener coma, espacio, apóstrofe)

  // Simplificamos: el primer nombre es todo hasta el primer carácter mayúsculo
  // que aparece inmediatamente después de una letra (no un punto ni espacio)
  // Ej: "G.GONZALEZF" → split en 9 (antes de F)
  // Ej: "J.C.RODRIGUEZJ" → split antes del último J
  // Ej: "FEL.VELASQUEZJ" → split antes de J al final de VELASQUEZ

  // Buscar: letra minúscula/mayúscula de apellido seguida directamente de letra mayúscula (sin punto ni espacio)
  // que sea inicio del segundo nombre
  const splitMatch = line.match(/^(.+?[A-ZÁÉÍÓÚ]{2,})([A-ZÁÉÍÓÚ]\..*)$/);
  if (splitMatch) {
    return [splitMatch[1].trim(), splitMatch[2].trim()];
  }

  // Fallback: dividir por espacios múltiples o por la mitad si hay un espacio
  const spaceIdx = line.indexOf(' ');
  if (spaceIdx > 0) {
    return [line.slice(0, spaceIdx).trim(), line.slice(spaceIdx).trim()];
  }

  return [line, ''];
}

function isHeaderLine(line: string): boolean {
  return (
    /^DIVISION/i.test(line) ||
    /^EJEMPLARES/i.test(line) ||
    /^\(EJERCICIOS/i.test(line) ||
    /^FECHA[=:]/i.test(line) ||
    /^PARCIALES/i.test(line) ||
    /INH\/ LA RINCONADA/i.test(line) ||
    /ESTADO DE LA PISTA/i.test(line) ||
    /^ENTRENADORES/i.test(line) ||
    /^APARATO\s*$/i.test(line) ||
    line.length < 2
  );
}

/**
 * Una línea es de "nombre de caballo" si:
 * - Empieza con dígitos+D (prefijo días) seguido de nombre, O
 * - Es solo texto en mayúsculas (nombre puro sin números iniciales)
 * - NO es una línea de trabajo (parciales) ni de jinete/entrenador
 */
function isHorseLine(line: string): boolean {
  // Línea de trabajo: contiene (EP), (ES), (AP), GALOPO, TROTO, números con comas
  if (/\(EP\)|\(ES\)|\(AP\)/i.test(line)) return false;
  if (/^GALOPO|^TROTO|^SOLO PIQUE|^UN PIQUE|^RECONOCIO|^SALIO|^SALIERON|^DE ESCUELITA/i.test(line)) return false;
  if (/^\d+[,.]\d/.test(line)) return false; // empieza con parcial numérico
  // Línea de jinete: dos nombres con puntos concatenados (manejado por contexto)
  // Nombre de caballo: letras, espacios, paréntesis, +, -, apostrofes
  return /^(\d{1,2}D)?[A-ZÁÉÍÓÚÑÜH\.][A-ZÁÉÍÓÚÑÜ\s\(\)\+\-\.,'\d]*/i.test(line);
}

export function parseWorkoutsPdf(text: string): ParsedWorkout[] {
  const workouts: ParsedWorkout[] = [];

  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (isHeaderLine(line)) { i++; continue; }

    // Detectar nombre de caballo: opcional prefijo ND seguido del nombre
    // Ej: "4DAXIS MUNDI", "ALCALA", "H.ROSEMONT"
    const horseMatch = line.match(/^(\d{1,2}D)?([A-ZÁÉÍÓÚÑÜH\.][A-ZÁÉÍÓÚÑÜ\s\(\)\+\-\.'`,\d]*)$/i);

    if (!horseMatch) { i++; continue; }

    // Verificar que no sea una línea de trabajo enmascarada
    const candidateName = horseMatch[2].trim();
    if (
      /\(EP\)|\(ES\)|\(AP\)/i.test(candidateName) ||
      /^GALOPO|^TROTO|^SOLO PIQUE|^UN PIQUE|^RECONOCIO|^SALIO|^DE ESCUELITA/i.test(candidateName) ||
      /^\d+[,.]\d/.test(candidateName)
    ) { i++; continue; }

    const daysPrefix = horseMatch[1] ?? '';
    const daysRest = daysPrefix ? parseInt(daysPrefix) : null;
    const horseName = candidateName;

    const workLine = lines[i + 1] ?? '';
    const jockeyLine = lines[i + 2] ?? '';

    // Verificar que la línea siguiente sea realmente un trabajo
    if (!workLine || isHeaderLine(workLine)) { i++; continue; }

    // --- Parsear línea de trabajo ---
    // Distancia
    const distMatch = workLine.match(/\((\d+)MTS?\)/i);
    const distance = distMatch ? parseInt(distMatch[1]) : null;

    // Tipo
    let workoutType: 'EP' | 'ES' | 'AP' | 'galopo' = 'galopo';
    if (/\(EP\)/i.test(workLine)) workoutType = 'EP';
    else if (/\(ES\)/i.test(workLine)) workoutType = 'ES';
    else if (/\(AP\)/i.test(workLine)) workoutType = 'AP';

    // RM: número pegado al final (ej: "...SE FUE LARGO12" o "...COMODO 15,3")
    const rmMatch = workLine.match(/(\d+(?:[,.]\d+)?)\s*$/);
    const rm = rmMatch ? parseFloat(rmMatch[1].replace(',', '.')) : null;

    // Splits: secuencia de números al inicio antes del primer texto largo
    // Quitar distancia, tipo y RM del string para obtener splits+comentario
    let workClean = workLine
      .replace(/\(\d+MTS?\)/gi, '')
      .replace(/\(EP\)|\(ES\)|\(AP\)/gi, '')
      .replace(/(\d+(?:[,.]\d+)?)\s*$/, '') // quitar RM final
      .trim();

    // Splits: números con comas/puntos al inicio, separados por espacios, con posibles marcadores 2P 4P 6P /  //  ///
    const splitsMatch = workClean.match(/^([\d,\.\s\/P]+?)(?=[A-ZÁÉÍÓÚÑÜ]{2}|$)/i);
    const splits = splitsMatch ? splitsMatch[1].trim().replace(/\s+/g, ' ') : '';
    const comment = splits ? workClean.slice(splits.length).trim() : workClean.trim();

    // --- Parsear jinete/entrenador ---
    let jockeyName = '';
    let trainerName = '';

    if (jockeyLine && !isHeaderLine(jockeyLine)) {
      // Verificar que jockeyLine no sea otro nombre de caballo (próxima entrada)
      const isNextHorse = /^\d{1,2}D[A-Z]/i.test(jockeyLine);
      if (!isNextHorse) {
        [jockeyName, trainerName] = splitJockeyTrainer(jockeyLine);
      }
    }

    workouts.push({
      horseName,
      daysRest,
      distance,
      workoutType,
      splits,
      comment,
      jockeyName,
      trainerName,
      rawBlock: [line, workLine, jockeyLine].join(' | '),
    });

    i += 3;
  }

  return workouts;
}
