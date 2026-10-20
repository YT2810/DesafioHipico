/** @deprecated Para Pago Móvil usar TOPUP_PACKAGES. Mantenido para Paypal/Binance y admin panel. */
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
/** @deprecated Usar getFreeRacesAllowance(totalRaces) en su lugar. */
export const FREE_RACES_PER_MEETING = 2;
/** Costo de desbloquear UNA carrera suelta */
export const GOLD_COST_PER_RACE = 2;
/** Costo por carrera al comprar la jornada completa (mitad de precio vs. sueltas) */
export const GOLD_COST_FULL_DAY_PER_RACE = 1;

/**
 * Carreras gratuitas por reunión según el tamaño del programa.
 * <=10 carreras → 1 gratis. >10 carreras → 2 gratis.
 */
export function getFreeRacesAllowance(totalRacesCount: number): number {
  return totalRacesCount <= 10 ? 1 : 2;
}

/**
 * Paquetes de recarga fijos en Bolívares — sin dependencia de tasa de cambio.
 * Nombres con referencia hípica venezolana.
 * Bs/Gold: 250 → 225 → 200 (rebaja solo por volumen, nunca por jornada).
 */
export const TOPUP_PACKAGES = [
  {
    id: 'arranque',
    label: 'Pase Semanal Nacional',
    description: 'Acceso Total Lunes a Domingo (La Rinconada + Valencia + Alertas + 5y6 VIP)',
    priceBs: 6000,
    golds: 20,
    bsPerGold: 300,
    badge: 'PASE SEMANAL',
    saving: null,
  },
  {
    id: 'jinete',
    label: 'Pase 15 Días Nacional',
    description: '2 Semanas completas de acceso total Nacional + Cuadro 5y6 VIP',
    priceBs: 11000,
    golds: 40,
    bsPerGold: 275,
    badge: 'MÁS POPULAR',
    saving: 'Ahorras 1.000 Bs',
  },
  {
    id: 'padrillo',
    label: 'Pase Mensual Nacional (30 Días)',
    description: '4 Semanas completas de acceso total Nacional + Cuadro 5y6 VIP',
    priceBs: 20000,
    golds: 100,
    bsPerGold: 200,
    badge: 'MEJOR VALOR',
    saving: 'Ahorras 4.000 Bs',
  },
] as const;

export type TopUpPackageId = typeof TOPUP_PACKAGES[number]['id'];

export const VENEZUELAN_BANKS = [
  'Banco de Venezuela (0102)',
  'Mercantil Banco (0105)',
  'Banco Provincial (0108)',
  'Banco Caroní (0128)',
  'Banesco (0134)',
  'Fondo Común - BFC (0151)',
  '100% Banco (0156)',
  'Banco del Tesoro (0163)',
  'Bancrecer (0168)',
  'R4 Banco Microfinanciero (0169)',
  'Banco Activo (0171)',
  'Bancamiga (0172)',
  'BDT - Banco Digital Trabajadores (0175)',
  'Banfanb (0177)',
  'BNC - Banco Nacional de Crédito (0191)',
  'Banco Plaza (0196)',
  'Otro',
] as const;

export type VenezuelanBank = typeof VENEZUELAN_BANKS[number];

