export const GOLD_RATE = { golds: 40, usd: 10 } as const;

export const FORECAST_LABELS = [
  'Línea',
  'Casi Fijo',
  'Súper Especial',
  'Buen Dividendo',
  'Batacazo',
] as const;

export type ForecastLabel = typeof FORECAST_LABELS[number];

// Points per preference order position
export const MARK_POINTS: Record<number, number> = { 1: 5, 2: 3, 3: 2, 4: 1, 5: 1 };
// Extra points when label is 'Casi Fijo' at position 1 (treated as "fijo")
export const FIJO_BONUS_POINTS = 8; // replaces the 5 pts of position 1
export const FREE_RACES_PER_MEETING = 2;
export const GOLD_COST_PER_RACE = 1;

export const VENEZUELAN_BANKS = [
  'Banco de Venezuela',
  'Banesco',
  'Mercantil',
  'BBVA Provincial',
  'Banco del Tesoro',
  'BNC',
  'Banplus',
  'Bancamiga',
  'Bicentenario',
  'Otro',
] as const;

export type VenezuelanBank = typeof VENEZUELAN_BANKS[number];
