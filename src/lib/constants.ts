export const GOLD_RATE = { golds: 40, usd: 10 } as const;
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
