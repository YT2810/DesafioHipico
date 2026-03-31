/**
 * Lógica pura del Melli — sin dependencias de Next.js ni MongoDB.
 * Exportada aquí para poder testearla en Jest.
 */

export const ACTION_COSTS: Record<string, number> = {
  marks_1race:      3,   // Consenso de 1 carrera (top 2 caballos)
  marks_all_day:   15,   // Consenso de todas las carreras del día
  pack_5y6:        10,   // Consenso de las 6 válidas (subconjunto)
  workouts:         2,   // Trabajos/traqueos de TODOS los caballos de 1 carrera
  workouts_1horse:  1,   // Trabajo de 1 caballo específico
  program:          1,   // Programa (inscritos + jinetes)
  free:             0,   // Conversación sin consulta a DB
};

export interface DetectedAction {
  action: string;
  raceNumber?: number;
  horseName?: string;
}

export function detectAction(content: string): DetectedAction {
  const c = content.toLowerCase();

  if (/reunión completa|reunion completa|paquete completo/.test(c)) {
    return { action: 'pack_full' };
  }

  // "todas las carreras" / "dame todas" (sin especificar marcas) → pack_full
  if (/todas\s+las\s+carreras/.test(c) && !/carrera \d/.test(c)) {
    return { action: 'pack_full' };
  }

  // "5y6", "cinco y seis", "las válidas" explícito → pack_5y6
  if (/5 ?y ?6|paquete 5y6|cinco y seis|las v[aá]lidas/.test(c)
      && !/carrera \d/.test(c)
      && !/cómo|como|qué es|que es|explica|funciona|información|info/.test(c)) {
    return { action: 'pack_5y6' };
  }

  // "marcas de TODAS las carreras" / "las dos marcas para las carreras" (plural sin número) → top_picks_all
  if (/(marcas?|fijos?|clavitos?).*(?:todas|las carreras|cada carrera|completas?)/.test(c)
      || /(?:todas|las carreras|cada carrera).*(?:marcas?|fijos?|clavitos?)/.test(c)) {
    return { action: 'pack_5y6' };
  }

  if (/análisis.*carrera ?(\d+)|analisis.*carrera ?(\d+)|carrera ?(\d+).*análisis completo|carrera ?(\d+).*analisis completo/.test(c)) {
    const m = c.match(/carrera ?(\d+)/);
    return { action: 'analysis_1race', raceNumber: m ? parseInt(m[1]) : undefined };
  }

  // "marcas de la carrera 3" / "2 marcas" / "dos marcas" con carrera específica
  if (/marcas?.*carrera ?(\d+)|carrera ?(\d+).*marcas?/.test(c)) {
    const m = c.match(/carrera ?(\d+)/);
    return { action: 'marks_1race', raceNumber: m ? parseInt(m[1]) : undefined };
  }
  // "dos marcas" / "2 marcas" sin "las carreras" (ya capturado arriba) → single race
  if (/2 marcas|dos marcas/.test(c)) {
    return { action: 'marks_1race' };
  }

  // "trabajos" / "traqueos" → workouts (detectar caballo específico si lo hay)
  if (/trabajos?|traqueos?|briseos?/.test(c)) {
    // "trabajos de GRAN HACEDION" / "traqueos de el perfecto"
    const horseMatch = c.match(/(?:trabajos?|traqueos?|briseos?)\s+(?:de(?:l)?\s+)([a-záéíóúñ][a-záéíóúñ\s]{2,})/i);
    if (horseMatch) {
      const name = horseMatch[1].trim().toUpperCase();
      if (!/^(?:la|el|un|una|los|las|carrera|hipódromo|hipodromo|rinconada|valencia)$/i.test(name)) {
        return { action: 'workouts_1horse', horseName: name };
      }
    }
    // "traqueos del 5" / "trabajos del número 3" / "trabajos del #7"
    const dorsalMatch = c.match(/(?:trabajos?|traqueos?|briseos?)\s+(?:de(?:l)?\s+)(?:(?:número|numero|#|n[°º]?)\s*)?(\d{1,2})\b/);
    if (dorsalMatch) {
      return { action: 'workouts_1horse', horseName: `#${dorsalMatch[1]}` };
    }
    const m = c.match(/carrera ?(\d+)/);
    return { action: 'workouts', raceNumber: m ? parseInt(m[1]) : undefined };
  }

  // "dame un dato" / "quien gana" / "dame la línea" → explicit data request
  if (/dame.*dato|qui[eé]n gana|dame.*línea|dame.*linea|dame.*fijo/.test(c)) {
    const m = c.match(/carrera ?(\d+)/);
    return { action: 'marks_1race', raceNumber: m ? parseInt(m[1]) : undefined };
  }

  // Bare "carrera N" or "la carrera N" without specific action → default to marks
  if (/(?:la\s+)?carrera\s+(\d{1,2})\b/.test(c)) {
    const m = c.match(/carrera\s+(\d{1,2})/);
    return { action: 'marks_1race', raceNumber: m ? parseInt(m[1]) : undefined };
  }

  return { action: 'free' };
}

export interface DataValidation {
  isValid: boolean;
  hcpCount: number;
  minRequired: number;
  message?: string;
}

/**
 * Valida si hay suficientes handicappers en el contexto antes de cobrar.
 * La línea "► CONSENSO N hcp:" viene del /api/melli/context
 */
export function validateDataForAction(context: string, action: string): DataValidation {
  const cost = ACTION_COSTS[action] ?? 0;

  if (cost === 0) {
    return { isValid: true, hcpCount: 0, minRequired: 0 };
  }

  // Buscar todas las líneas CONSENSO en el contexto y tomar el máximo
  // (cuando se carga una sola carrera hay una sola línea; cuando es el programa completo hay varias)
  const allConsensoMatches = [...context.matchAll(/► CONSENSO (\d+) hcp/g)];
  const hcpCount = allConsensoMatches.length > 0
    ? Math.max(...allConsensoMatches.map(m => parseInt(m[1])))
    : 0;

  const isValencia = /valencia/i.test(context);
  // Mínimo: 3 para Valencia, 2 para La Rinconada (carrera individual)
  // Para paquetes (pack_5y6, pack_full) el mínimo es mayor
  const isPack = action === 'pack_5y6' || action === 'pack_full';
  const minRequired = isPack
    ? (isValencia ? 3 : 3)
    : (isValencia ? 2 : 2);

  if (hcpCount < minRequired) {
    const message = hcpCount === 0
      ? `Aún no hay pronósticos publicados para esta carrera, socio. Vuelve cuando los handicappers hayan subido su data (necesitamos al menos ${minRequired} para darte un análisis confiable).`
      : `Solo hay ${hcpCount} pronóstico${hcpCount > 1 ? 's' : ''} publicado${hcpCount > 1 ? 's' : ''} — necesitamos al menos ${minRequired} para garantizarte un análisis sólido. Espera un poco más, socio.`;
    return { isValid: false, hcpCount, minRequired, message };
  }

  return { isValid: true, hcpCount, minRequired };
}

export interface ConsensoResult {
  horseName: string;
  primeraVeces: number;
  totalVotes: number;
  label?: string;
}

/**
 * Calcula el ranking de consenso de handicappers a partir de sus marcas.
 * Orden: más primeras marcas → más menciones totales.
 */
export function calcularConsenso(forecasts: Array<{
  marks: Array<{ preferenceOrder: number; horseName: string; label?: string }>;
}>): ConsensoResult[] {
  const voteMap: Record<string, ConsensoResult> = {};

  for (const f of forecasts) {
    const sorted = [...f.marks].sort((a, b) => a.preferenceOrder - b.preferenceOrder);
    sorted.forEach((m, idx) => {
      if (!voteMap[m.horseName]) {
        voteMap[m.horseName] = { horseName: m.horseName, primeraVeces: 0, totalVotes: 0 };
      }
      voteMap[m.horseName].totalVotes++;
      if (idx === 0) voteMap[m.horseName].primeraVeces++;
      if (m.label && ['Casi Fijo', 'Súper Especial', 'Batacazo'].includes(m.label)) {
        voteMap[m.horseName].label = m.label;
      }
    });
  }

  return Object.values(voteMap).sort(
    (a, b) => b.primeraVeces - a.primeraVeces || b.totalVotes - a.totalVotes
  );
}

/**
 * Extrae parámetros de contexto del mensaje del usuario.
 * Permite al frontend recargar /api/melli/context con meetingId o raceNumber
 * cuando el usuario especifica una carrera o hipódromo.
 */
export interface ContextParams {
  raceNumber?: number;
  validaRef?: number;   // "Nth válida" — necesita resolverse contra el programa real
  trackHint?: 'rinconada' | 'valencia';
  needsRefresh: boolean;
}

export function extractContextParams(message: string): ContextParams {
  const c = message.toLowerCase();
  const O: Record<string, number> = {
    primera: 1, primero: 1, segundo: 2, segunda: 2, tercera: 3, tercero: 3,
    cuarta: 4, cuarto: 4, quinta: 5, quinto: 5, sexta: 6, sexto: 6,
    séptima: 7, septima: 7, séptimo: 7, septimo: 7,
    octava: 8, octavo: 8, novena: 9, noveno: 9, décima: 10, decima: 10,
    undécima: 11, undecima: 11, duodécima: 12, duodecima: 12,
  };
  const W = 'primera|primero|segunda|segundo|tercera|tercero|cuarta|cuarto|quinta|quinto|sexta|sexto|s[eé]ptima|s[eé]ptimo|octava|octavo|novena|noveno|d[eé]cima|d[eé]cimo|und[eé]cima|und[eé]cimo|duod[eé]cima|duod[eé]cimo';
  const S = '(?:ra|da|ta|va|ava|ro|do|to|vo|avo|era|ero|na|no|ma|mo|°|º)';
  const isUltima = /[uú]ltim[ao]/.test(c);

  // ── VÁLIDA: "válida/valida" keyword o abreviatura "V" (NO "valencia") ──
  let validaRef: number | undefined;
  // "primera válida", "sexta valida"
  const vA = c.match(new RegExp(`(${W})\\s+v[aá]lida`));
  if (vA) validaRef = O[vA[1]];
  // "1ra válida", "6ta valida", "1 válida"
  if (!validaRef) {
    const vB = c.match(new RegExp(`(\\d{1,2})\\s*${S}?\\s*v[aá]lida`));
    if (vB) validaRef = parseInt(vB[1]);
  }
  // "primera V" (abreviatura, no "valencia")
  if (!validaRef) {
    const vC = c.match(new RegExp(`(${W})\\s+v(?!alencia|[aá]lida)\\b`));
    if (vC) validaRef = O[vC[1]];
  }
  // "1V", "2V", "1ra V", "3rav" (número + V, no "valencia")
  if (!validaRef) {
    const vD = c.match(new RegExp(`(\\d{1,2})\\s*${S}?\\s*v(?!alencia|[aá]lida)\\b`));
    if (vD) validaRef = parseInt(vD[1]);
  }

  // ── CARRERA: número absoluto ──
  let raceNumber: number | undefined;
  if (!validaRef && !isUltima) {
    const r1 = c.match(/\bc\s*(\d{1,2})\b/);                                    // C1, c 2
    const r2 = c.match(/\b(\d{1,2})\s*c\b(?!arrera)/);                           // 1C, 8c
    const r3 = c.match(/\bcarrera\s+(\d{1,2})\b/);                               // carrera 1
    const r4 = c.match(new RegExp(`\\bcarrera\\s+(${W})`));                       // carrera primera
    const r5 = c.match(new RegExp(`(${W})\\s+carrera`));                          // primera carrera
    const r6 = c.match(new RegExp(`(\\d{1,2})\\s*${S}\\s+carrera`));              // 1ra carrera
    const r7 = c.match(new RegExp(`(?:la|el)\\s+(${W})(?!\\s+v)\\b`));           // la primera
    const r8 = c.match(new RegExp(`(?:la|el)\\s+(\\d{1,2})\\s*${S}(?!\\s*v)\\b`)); // la 8va
    const r9 = c.match(new RegExp(`\\b(\\d{1,2})\\s*${S}(?!\\s*v)\\b`));         // 8va, 3ra
    if (r1) raceNumber = parseInt(r1[1]);
    else if (r2) raceNumber = parseInt(r2[1]);
    else if (r3) raceNumber = parseInt(r3[1]);
    else if (r4) raceNumber = O[r4[1]];
    else if (r5) raceNumber = O[r5[1]];
    else if (r6) raceNumber = parseInt(r6[1]);
    else if (r7) raceNumber = O[r7[1]];
    else if (r8) raceNumber = parseInt(r8[1]);
    else if (r9) raceNumber = parseInt(r9[1]);
  }

  if (isUltima && !raceNumber && !validaRef) raceNumber = 99;

  const isRinconada = /rincoa?n?a?da?|la rinca|rinca/.test(c);
  const isValencia  = /\bvalencia\b/.test(c);
  const trackHint: ContextParams['trackHint'] = isRinconada ? 'rinconada' : isValencia ? 'valencia' : undefined;
  const needsRefresh = !!(raceNumber || validaRef || trackHint ||
    /traqueos?|inscrito|programa|quién viene|quien viene/.test(c));

  return { raceNumber, validaRef, trackHint, needsRefresh };
}

/**
 * Determina si una respuesta del LLM debe gatillar reembolso automático.
 * Condición: hubo cobro Y (el LLM pidió ##REFUND## O la respuesta no tiene data útil).
 */
const NO_DATA_PHRASES = [
  'no tengo inscritos',
  'ese dato no está en mi sistema',
  'no tengo datos',
  'no está en mi sistema',
  'vuelve cuando esté el programa',
  'no hay pronósticos publicados',
];

export function shouldAutoRefund(rawResponse: string, goldDeducted: number): boolean {
  if (goldDeducted === 0) return false;
  // Solo frases objetivas del sistema — el LLM nunca puede activar el reembolso
  const lower = rawResponse.toLowerCase();
  return NO_DATA_PHRASES.some(p => lower.includes(p));
}

/**
 * Verifica si un usuario tiene golds suficientes para una acción.
 */
export function checkGoldBalance(
  available: number,
  action: string
): { canAfford: boolean; required: number; available: number } {
  const required = ACTION_COSTS[action] ?? 0;
  return { canAfford: available >= required, required, available };
}
