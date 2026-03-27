/**
 * Lógica pura del Melli — sin dependencias de Next.js ni MongoDB.
 * Exportada aquí para poder testearla en Jest.
 */

export const ACTION_COSTS: Record<string, number> = {
  marks_1race:    3,
  analysis_1race: 5,
  pack_5y6:      25,
  pack_full:     50,
  free:           0,
};

export interface DetectedAction {
  action: string;
  raceNumber?: number;
}

export function detectAction(content: string): DetectedAction {
  const c = content.toLowerCase();

  if (/reunión completa|reunion completa|todas las carreras|paquete completo/.test(c)) {
    return { action: 'pack_full' };
  }
  if (/5 ?y ?6|válidas|validas|paquete 5y6|cinco y seis/.test(c)
      && !/carrera \d/.test(c)
      && !/cómo|como|qué es|que es|explica|funciona|información|info/.test(c)) {
    return { action: 'pack_5y6' };
  }
  if (/análisis.*carrera ?(\d+)|analisis.*carrera ?(\d+)|carrera ?(\d+).*análisis completo|carrera ?(\d+).*analisis completo/.test(c)) {
    const m = c.match(/carrera ?(\d+)/);
    return { action: 'analysis_1race', raceNumber: m ? parseInt(m[1]) : undefined };
  }
  if (/marcas?.*carrera ?(\d+)|carrera ?(\d+).*marcas?|2 marcas|dos marcas/.test(c)) {
    const m = c.match(/carrera ?(\d+)/);
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

  const ORDINALS: Record<string, number> = {
    primera: 1, segundo: 2, segunda: 2, tercera: 3, tercero: 3,
    cuarta: 4, cuarto: 4, quinta: 5, quinto: 5, sexta: 6, sexto: 6,
    séptima: 7, septima: 7, séptimo: 7, septimo: 7,
    octava: 8, octavo: 8, novena: 9, noveno: 9, décima: 10, decima: 10,
    undécima: 11, undecima: 11, duodécima: 12, duodecima: 12,
  };
  const ORDINAL_WORDS = 'primera|segunda|tercera|cuarta|quinta|sexta|s[eé]ptima|octava|novena|d[eé]cima|und[eé]cima|duod[eé]cima';

  // ── Detectar referencia a "Nth válida" PRIMERO (tiene prioridad sobre carrera ordinaria) ──
  // Ejemplos: "6ta válida", "sexta válida", "1ra válida", "primera válida"
  const VALIDA_ORDINAL = new RegExp(`(${ORDINAL_WORDS}|\\d{1,2})[a-z°]*\\s+v[aá]lida`);
  const validaMatch = c.match(VALIDA_ORDINAL);
  let validaRef: number | undefined;
  if (validaMatch) {
    const raw = validaMatch[1];
    validaRef = /\d/.test(raw) ? parseInt(raw) : ORDINALS[raw];
  }

  // ── Detectar carrera ordinaria (solo si NO es referencia a válida) ──
  const numericMatch = !validaMatch ? c.match(/(?:carrera|c)\s*(\d{1,2})/) : null;
  const ordAfter  = !validaMatch ? c.match(new RegExp(`(?:carrera\\s+)(${ORDINAL_WORDS})`)) : null;
  const ordBefore = !validaMatch ? c.match(new RegExp(`(${ORDINAL_WORDS})(?:\\s+carrera)`)) : null;
  // También capturar "3ra", "1ra", "2da", "4ta", "5ta" solos (sin la palabra "carrera")
  const shortOrdMatch = !validaMatch ? c.match(/\b(\d{1,2})\s*(?:ra|da|ta|ro|do|to|era|ero|°|º)\b/) : null;
  const ordWord   = ordAfter?.[1] ?? ordBefore?.[1];
  const raceNumber = numericMatch
    ? parseInt(numericMatch[1])
    : ordWord ? ORDINALS[ordWord]
    : shortOrdMatch ? parseInt(shortOrdMatch[1])
    : undefined;

  // Detectar hipódromo mencionado
  const isRinconada = /rincoa?n?a?da?|la rinca|rinca/.test(c);
  const isValencia  = /valencia/.test(c);
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
