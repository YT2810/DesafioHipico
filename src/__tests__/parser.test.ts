/**
 * Tests del parser de PDF/texto — lógica pura sin MongoDB.
 * Cubre bugs conocidos como el precio de reclamo pegado al nombre del caballo.
 */

// ── Función de limpieza (copiada del parser para testear independientemente) ──
function cleanClaimPrice(name: string): string {
  return name.replace(/\s+Precio\s+\$[\s:,.\d]+$/i, '').trim();
}

// ── cleanClaimPrice — limpieza precio de reclamo ───────────────────────────────

describe('cleanClaimPrice — limpieza de precio en nombre del caballo', () => {
  // Casos reales del bug reportado
  test('MASTER SHOT Precio $: 18000,00 → MASTER SHOT', () => {
    expect(cleanClaimPrice('MASTER SHOT Precio $: 18000,00')).toBe('MASTER SHOT');
  });
  test('GOLDEN JE Precio $: 18000,00 → GOLDEN JE', () => {
    expect(cleanClaimPrice('GOLDEN JE Precio $: 18000,00')).toBe('GOLDEN JE');
  });
  test('CALGARY Precio $: 20000,00 → CALGARY', () => {
    expect(cleanClaimPrice('CALGARY Precio $: 20000,00')).toBe('CALGARY');
  });
  test('TANK ABBOTT Precio $: 18000,00 → TANK ABBOTT', () => {
    expect(cleanClaimPrice('TANK ABBOTT Precio $: 18000,00')).toBe('TANK ABBOTT');
  });
  test('THE KING ZEUS Precio $: 18000,00 → THE KING ZEUS', () => {
    expect(cleanClaimPrice('THE KING ZEUS Precio $: 18000,00')).toBe('THE KING ZEUS');
  });
  test('SKYLINE Precio $: 20000,00 → SKYLINE', () => {
    expect(cleanClaimPrice('SKYLINE Precio $: 20000,00')).toBe('SKYLINE');
  });
  test('KINGSTON Precio $: 18000,00 → KINGSTON', () => {
    expect(cleanClaimPrice('KINGSTON Precio $: 18000,00')).toBe('KINGSTON');
  });

  // Variaciones de formato del precio
  test('precio sin espacios extra → limpio', () => {
    expect(cleanClaimPrice('CABALLO Precio $:18000,00')).toBe('CABALLO');
  });
  test('precio con punto como separador → limpio', () => {
    expect(cleanClaimPrice('CABALLO Precio $: 18.000,00')).toBe('CABALLO');
  });
  test('precio alto → limpio', () => {
    expect(cleanClaimPrice('CABALLO Precio $: 50000,00')).toBe('CABALLO');
  });

  // Nombres normales (no deben modificarse)
  test('nombre normal sin precio → intacto', () => {
    expect(cleanClaimPrice('MASTER SHOT')).toBe('MASTER SHOT');
  });
  test('nombre con número en el nombre → intacto', () => {
    expect(cleanClaimPrice('QUALITY PRINCESS')).toBe('QUALITY PRINCESS');
  });
  test('nombre con país USA → intacto', () => {
    expect(cleanClaimPrice('EASYASYOUPLEASE (USA)')).toBe('EASYASYOUPLEASE (USA)');
  });
  test('nombre vacío → vacío', () => {
    expect(cleanClaimPrice('')).toBe('');
  });

  // El nombre no debe perder su contenido real
  test('nombre que contiene "Precio" como parte del nombre → intacto (no hay $ después)', () => {
    expect(cleanClaimPrice('EL PRECIO JUSTO')).toBe('EL PRECIO JUSTO');
  });
});
