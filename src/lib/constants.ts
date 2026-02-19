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
  'Banco de Venezuela (0102)',
  'Banesco (0134)',
  'Mercantil (0105)',
  'BBVA Provincial (0108)',
  'Banco del Tesoro (0163)',
  'BNC Nacional (0191)',
  'Banplus (0174)',
  'Bancamiga (0172)',
  'Bicentenario (0175)',
  'Activo (0171)',
  'Mi Banco (0169)',
  'Banco Exterior (0115)',
  'Banco Sofitasa (0137)',
  'Banco Plaza (0138)',
  'Banco Caroní (0128)',
  'Banco Agrícola (0166)',
  'Bancrecer (0168)',
  'Banfanb (0177)',
  'Delsur (0157)',
  'Fondo Común (0151)',
  'Venezolano de Crédito (0104)',
  'Citibank (0990)',
  'Otro',
] as const;

export type VenezuelanBank = typeof VENEZUELAN_BANKS[number];

/** Datos de la cuenta destino para Pago Móvil */
export const PAYMENT_DESTINATION = {
  bank: 'Banco de Venezuela (0102)',
  bankCode: '0102',
  legalId: 'V-16108291',
  phone: '04122220545',
  name: 'Desafío Hípico',
} as const;
