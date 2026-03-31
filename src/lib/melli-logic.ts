/**
 * Lógica pura del Melli — sin dependencias de Next.js ni MongoDB.
 * Exportada aquí para poder testearla en Jest.
 */

export const ACTION_COSTS: Record<string, number> = {
  marks_1race:    3,   // Consenso de 1 carrera (top 2 caballos)
  marks_all_day: 15,   // Consenso de todas las carreras del día
  pack_5y6:      10,   // Consenso de las 6 válidas (subconjunto)
  workouts:       2,   // Trabajos/traqueos (1 carrera o todos)
  program:        1,   // Programa (inscritos + jinetes)
  free:           0,   // Conversación sin consulta a DB
};

export interface DetectedAction {
  action: string;
  raceNumber?: number;
}

export function detectAction(content: string): DetectedAction {
  const c = content.toLowerCase();

  if (/reunión completa|reunion completa|paquete completo/.test(c)) {
    return { action: 'pack_full' };
  }

  // "5y6" o "cinco y seis" explícito → pack_5y6 (pero no "válida" sola)
  if (/5 ?y ?6|paquete 5y6|cinco y seis/.test(c)
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

  // "trabajos" / "traqueos" → workouts
  if (/trabajos?|traqueos?|briseos?/.test(c)) {
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

  const ORDINALS: Record<string, number> = {
    primera: 1, segundo: 2, segunda: 2, tercera: 3, tercero: 3,
    cuarta: 4, cuarto: 4, quinta: 5, quinto: 5, sexta: 6, sexto: 6,
    séptima: 7, septima: 7, séptimo: 7, septimo: 7,
    octava: 8, octavo: 8, novena: 9, noveno: 9, décima: 10, decima: 10,
    undécima: 11, undecima: 11, duodécima: 12, duodecima: 12,
  };
  const ORDINAL_WORDS = 'primera|segunda|tercera|cuarta|quinta|sexta|s[eé]ptima|octava|novena|d[eé]cima|und[eé]cima|duod[eé]cima';

  // ── Detectar "última carrera" / "la ultima" → flag especial ──
  const isUltima = /[uú]ltim[ao]/.test(c);

  // ── Detectar referencia a "Nth válida" PRIMERO (tiene prioridad sobre carrera ordinaria) ──
  // Ejemplos: "6ta válida", "sexta válida", "1ra válida", "primera válida"
  const VALIDA_ORDINAL = new RegExp(`(${ORDINAL_WORDS}|\\d{1,2})[a-z°]*\\s+v[aá]lida`);
  const validaMatch = c.match(VALIDA_ORDINAL);
  let validaRef: number | undefined;
  if (validaMatch) {
    const raw = validaMatch[1];
    validaRef = /\d/.test(raw) ? parseInt(raw) : ORDINALS[raw];
  }

  // ── Bare ordinals: "la segunda", "y la tercera" (sin "carrera"/"válida") → treat as validaRef ──
  // Only match if NOT already matched as válida and NOT followed by "carrera"
  if (!validaRef && !isUltima) {
    const bareOrdMatch = c.match(new RegExp(`(?:^|\\b(?:y|en|de)\\s+)(?:la\\s+|el\\s+)(${ORDINAL_WORDS})(?!\\s+carrera)\\b`));
    if (bareOrdMatch) {
      const raw = bareOrdMatch[1];
      const n = ORDINALS[raw];
      // If ordinal is small (1-6), likely a válida reference in conversation context
      if (n && n <= 6) validaRef = n;
    }
  }

  // ── Detectar carrera ordinaria (solo si NO es referencia a válida) ──
  const numericMatch = !validaMatch && !validaRef ? c.match(/(?:carrera|c)\s*(\d{1,2})/) : null;
  const ordAfter  = !validaMatch && !validaRef ? c.match(new RegExp(`(?:carrera\\s+)(${ORDINAL_WORDS})`)) : null;
  const ordBefore = !validaMatch && !validaRef ? c.match(new RegExp(`(${ORDINAL_WORDS})(?:\\s+carrera)`)) : null;
  // También capturar "3ra", "1ra", "2da", "4ta", "5ta" solos (sin la palabra "carrera")
  const shortOrdMatch = !validaMatch && !validaRef ? c.match(/\b(\d{1,2})\s*(?:ra|da|ta|ro|do|to|era|ero|°|º)\b/) : null;
  const ordWord   = ordAfter?.[1] ?? ordBefore?.[1];
  let raceNumber = numericMatch
    ? parseInt(numericMatch[1])
    : ordWord ? ORDINALS[ordWord]
    : shortOrdMatch ? parseInt(shortOrdMatch[1])
    : undefined;

  // ── "última carrera" / "la ultima" → raceNumber = 99 sentinel (chat route resolves to maxRace) ──
  if (isUltima && !raceNumber && !validaRef) {
    raceNumber = 99; // sentinel — resolved by generateDirectResponse to actual last race
  }

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
