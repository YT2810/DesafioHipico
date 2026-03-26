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

  const consensoMatch = context.match(/► CONSENSO (\d+) hcp/);
  const hcpCount = consensoMatch ? parseInt(consensoMatch[1]) : 0;
  const isValencia = /valencia/i.test(context);
  const minRequired = isValencia ? 3 : 5;

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
 * Verifica si un usuario tiene golds suficientes para una acción.
 */
export function checkGoldBalance(
  available: number,
  action: string
): { canAfford: boolean; required: number; available: number } {
  const required = ACTION_COSTS[action] ?? 0;
  return { canAfford: available >= required, required, available };
}
