/**
 * Tests del Melli — lógica pura sin MongoDB ni OpenRouter.
 * Ejecutar con: npm test
 *
 * Agregar tests aquí a medida que se añadan nuevas variables o reglas.
 */
import {
  detectAction,
  validateDataForAction,
  calcularConsenso,
  checkGoldBalance,
  extractContextParams,
  shouldAutoRefund,
  ACTION_COSTS,
} from '@/lib/melli-logic';

// ── detectAction ──────────────────────────────────────────────────────────────

describe('detectAction — clasificación de mensajes', () => {
  // Chat libre (no cobra)
  test('saludo → free', () => {
    expect(detectAction('hola').action).toBe('free');
  });
  test('pregunta genérica → free', () => {
    expect(detectAction('qué hay para hoy').action).toBe('free');
  });
  test('pregunta hipismo general → free', () => {
    expect(detectAction('cómo funciona el 5y6').action).toBe('free');
  });

  // 2 marcas 1 carrera
  test('marcas carrera 7 → marks_1race con raceNumber 7', () => {
    const r = detectAction('dame las marcas carrera 7');
    expect(r.action).toBe('marks_1race');
    expect(r.raceNumber).toBe(7);
  });
  test('2 marcas carrera 3 → marks_1race', () => {
    const r = detectAction('quiero 2 marcas carrera 3');
    expect(r.action).toBe('marks_1race');
    expect(r.raceNumber).toBe(3);
  });
  test('carrera 12 marcas → marks_1race', () => {
    const r = detectAction('carrera 12 marcas');
    expect(r.action).toBe('marks_1race');
    expect(r.raceNumber).toBe(12);
  });
  test('dos marcas carrera 1 → marks_1race', () => {
    const r = detectAction('dos marcas carrera 1');
    expect(r.action).toBe('marks_1race');
    expect(r.raceNumber).toBe(1);
  });

  // Análisis completo 1 carrera
  test('análisis carrera 5 → analysis_1race', () => {
    const r = detectAction('análisis carrera 5');
    expect(r.action).toBe('analysis_1race');
    expect(r.raceNumber).toBe(5);
  });
  test('análisis completo carrera 2 → analysis_1race', () => {
    const r = detectAction('carrera 2 análisis completo');
    expect(r.action).toBe('analysis_1race');
    expect(r.raceNumber).toBe(2);
  });

  // Paquete 5y6
  test('paquete 5y6 → pack_5y6', () => {
    expect(detectAction('quiero el paquete 5y6').action).toBe('pack_5y6');
  });
  test('5 y 6 completo → pack_5y6', () => {
    expect(detectAction('dame el 5 y 6 completo').action).toBe('pack_5y6');
  });
  test('cinco y seis → pack_5y6', () => {
    expect(detectAction('dame el cinco y seis').action).toBe('pack_5y6');
  });
  test('válidas → pack_5y6', () => {
    expect(detectAction('quiero las válidas').action).toBe('pack_5y6');
  });
  test('válidas de carrera específica NO es pack_5y6 → free', () => {
    // "las válidas" + número de carrera no debe disparar pack_5y6
    const r = detectAction('las válidas de la carrera 9');
    expect(r.action).not.toBe('pack_5y6');
  });

  // Paquete completo
  test('reunión completa → pack_full', () => {
    expect(detectAction('quiero la reunión completa').action).toBe('pack_full');
  });
  test('todas las carreras → pack_full', () => {
    expect(detectAction('dame todas las carreras').action).toBe('pack_full');
  });
  test('paquete completo → pack_full', () => {
    expect(detectAction('paquete completo por favor').action).toBe('pack_full');
  });
});

// ── ACTION_COSTS ──────────────────────────────────────────────────────────────

describe('ACTION_COSTS — tabla de precios', () => {
  test('free = 0 golds', () => expect(ACTION_COSTS.free).toBe(0));
  test('marks_1race = 3 golds', () => expect(ACTION_COSTS.marks_1race).toBe(3));
  test('analysis_1race = 5 golds', () => expect(ACTION_COSTS.analysis_1race).toBe(5));
  test('pack_5y6 = 25 golds', () => expect(ACTION_COSTS.pack_5y6).toBe(25));
  test('pack_full = 50 golds', () => expect(ACTION_COSTS.pack_full).toBe(50));
  test('pack_full > pack_5y6 (reunión completa cuesta más)', () => {
    expect(ACTION_COSTS.pack_full).toBeGreaterThan(ACTION_COSTS.pack_5y6);
  });
});

// ── validateDataForAction ─────────────────────────────────────────────────────

describe('validateDataForAction — bloqueo de cobro por data insuficiente', () => {
  const ctxRinconada5hcp = `=== PROGRAMA: La Rinconada · Reunión 5 ===\n  ► CONSENSO 5 hcp: CABALLO_A(3P/5T), CABALLO_B(2P/3T)`;
  const ctxRinconada4hcp = `=== PROGRAMA: La Rinconada · Reunión 5 ===\n  ► CONSENSO 4 hcp: CABALLO_A(2P/4T)`;
  const ctxRinconada0hcp = `=== PROGRAMA: La Rinconada · Reunión 5 ===\n  ► Sin pronósticos publicados aún`;
  const ctxValencia3hcp  = `=== PROGRAMA: Valencia · Reunión 2 ===\n  ► CONSENSO 3 hcp: CABALLO_X(2P/3T)`;
  const ctxValencia2hcp  = `=== PROGRAMA: Valencia · Reunión 2 ===\n  ► CONSENSO 2 hcp: CABALLO_X(1P/2T)`;

  // Chat libre nunca bloquea
  test('acción free siempre válida (sin data)', () => {
    const r = validateDataForAction('', 'free');
    expect(r.isValid).toBe(true);
  });

  // La Rinconada — mínimo 5
  test('Rinconada con 5 hcp → válido', () => {
    expect(validateDataForAction(ctxRinconada5hcp, 'marks_1race').isValid).toBe(true);
  });
  test('Rinconada con 4 hcp → bloqueado', () => {
    const r = validateDataForAction(ctxRinconada4hcp, 'marks_1race');
    expect(r.isValid).toBe(false);
    expect(r.hcpCount).toBe(4);
    expect(r.minRequired).toBe(5);
    expect(r.message).toContain('4 pronósticos');
  });
  test('Rinconada con 0 hcp → bloqueado con mensaje de "no hay pronósticos"', () => {
    const r = validateDataForAction(ctxRinconada0hcp, 'marks_1race');
    expect(r.isValid).toBe(false);
    expect(r.hcpCount).toBe(0);
    expect(r.message).toContain('no hay pronósticos');
  });

  // Valencia — mínimo 3
  test('Valencia con 3 hcp → válido', () => {
    expect(validateDataForAction(ctxValencia3hcp, 'marks_1race').isValid).toBe(true);
  });
  test('Valencia con 2 hcp → bloqueado', () => {
    const r = validateDataForAction(ctxValencia2hcp, 'marks_1race');
    expect(r.isValid).toBe(false);
    expect(r.hcpCount).toBe(2);
    expect(r.minRequired).toBe(3);
  });

  // Todos los tipos de acción de pago bloquean igual
  test('analysis_1race también bloquea si no hay data', () => {
    expect(validateDataForAction(ctxRinconada0hcp, 'analysis_1race').isValid).toBe(false);
  });
  test('pack_5y6 también bloquea si no hay data', () => {
    expect(validateDataForAction(ctxRinconada0hcp, 'pack_5y6').isValid).toBe(false);
  });
  test('pack_full también bloquea si no hay data', () => {
    expect(validateDataForAction(ctxRinconada0hcp, 'pack_full').isValid).toBe(false);
  });
});

// ── calcularConsenso ──────────────────────────────────────────────────────────

describe('calcularConsenso — ranking de handicappers', () => {
  test('el más votado como 1ª marca queda primero', () => {
    const forecasts = [
      { marks: [{ preferenceOrder: 1, horseName: 'RELÁMPAGO' }, { preferenceOrder: 2, horseName: 'TORMENTA' }] },
      { marks: [{ preferenceOrder: 1, horseName: 'RELÁMPAGO' }, { preferenceOrder: 2, horseName: 'NUBE' }] },
      { marks: [{ preferenceOrder: 1, horseName: 'TORMENTA' }, { preferenceOrder: 2, horseName: 'RELÁMPAGO' }] },
    ];
    const result = calcularConsenso(forecasts);
    expect(result[0].horseName).toBe('RELÁMPAGO');
    expect(result[0].primeraVeces).toBe(2);
    expect(result[0].totalVotes).toBe(3);
  });

  test('empate en primeras marcas → desempate por total de menciones', () => {
    const forecasts = [
      { marks: [{ preferenceOrder: 1, horseName: 'A' }, { preferenceOrder: 2, horseName: 'B' }] },
      { marks: [{ preferenceOrder: 1, horseName: 'B' }, { preferenceOrder: 2, horseName: 'A' }] },
      { marks: [{ preferenceOrder: 1, horseName: 'C' }, { preferenceOrder: 2, horseName: 'A' }] },
    ];
    const result = calcularConsenso(forecasts);
    // A y B empatan en primeras (1 cada uno), pero A tiene 3 menciones vs B con 2
    expect(result[0].horseName).toBe('A');
    expect(result[0].totalVotes).toBe(3);
  });

  test('label Casi Fijo se propaga al resultado', () => {
    const forecasts = [
      { marks: [{ preferenceOrder: 1, horseName: 'FIJO', label: 'Casi Fijo' }] },
    ];
    const result = calcularConsenso(forecasts);
    expect(result[0].label).toBe('Casi Fijo');
  });

  test('label Batacazo se propaga al resultado', () => {
    const forecasts = [
      { marks: [{ preferenceOrder: 1, horseName: 'BATACAZO', label: 'Batacazo' }] },
    ];
    const result = calcularConsenso(forecasts);
    expect(result[0].label).toBe('Batacazo');
  });

  test('sin forecasts → resultado vacío', () => {
    expect(calcularConsenso([])).toHaveLength(0);
  });

  test('ordenamiento correcto con 5 handicappers reales', () => {
    const forecasts = [
      { marks: [{ preferenceOrder: 1, horseName: 'SOL' }, { preferenceOrder: 2, horseName: 'LUNA' }] },
      { marks: [{ preferenceOrder: 1, horseName: 'SOL' }, { preferenceOrder: 2, horseName: 'LUNA' }] },
      { marks: [{ preferenceOrder: 1, horseName: 'SOL' }, { preferenceOrder: 2, horseName: 'LUNA' }] },
      { marks: [{ preferenceOrder: 1, horseName: 'LUNA' }, { preferenceOrder: 2, horseName: 'SOL' }] },
      { marks: [{ preferenceOrder: 1, horseName: 'LUNA' }, { preferenceOrder: 2, horseName: 'SOL' }] },
    ];
    const result = calcularConsenso(forecasts);
    // SOL: 3 primeras, 5 totales
    // LUNA: 2 primeras, 5 totales
    expect(result[0].horseName).toBe('SOL');
    expect(result[0].primeraVeces).toBe(3);
    expect(result[1].horseName).toBe('LUNA');
    expect(result[1].primeraVeces).toBe(2);
  });
});

// ── extractContextParams ──────────────────────────────────────────────────────

describe('extractContextParams — recarga de contexto dinámico', () => {
  // Casos de los screenshots (los bugs reales encontrados)
  test('"los traqueos" → needsRefresh true (pide data real)', () => {
    expect(extractContextParams('los traqueos').needsRefresh).toBe(true);
  });
  test('"dame el mejor trabajo en la primera carrera de la rinconada" → needsRefresh + trackHint rinconada + raceNumber 1', () => {
    const r = extractContextParams('dame el mejor trabajo en la primera carrera de la rinconada');
    expect(r.needsRefresh).toBe(true);
    expect(r.trackHint).toBe('rinconada');
    expect(r.raceNumber).toBe(1);
  });
  test('"que inscritos tienes" → needsRefresh true', () => {
    expect(extractContextParams('que inscritos tienes').needsRefresh).toBe(true);
  });
  test('"la rinconada" → trackHint rinconada + needsRefresh true', () => {
    const r = extractContextParams('la rinconada');
    expect(r.trackHint).toBe('rinconada');
    expect(r.needsRefresh).toBe(true);
  });

  // Hipódromos
  test('"valencia" → trackHint valencia', () => {
    expect(extractContextParams('valencia').trackHint).toBe('valencia');
  });
  test('"qué hay para hoy" → needsRefresh false (genérico, no requiere data específica)', () => {
    expect(extractContextParams('qué hay para hoy').needsRefresh).toBe(false);
  });
  test('"hola" → needsRefresh false', () => {
    expect(extractContextParams('hola').needsRefresh).toBe(false);
  });

  // Números de carrera
  test('"marcas carrera 7" → raceNumber 7', () => {
    expect(extractContextParams('marcas carrera 7').raceNumber).toBe(7);
  });
  test('"carrera 12" → raceNumber 12', () => {
    expect(extractContextParams('carrera 12').raceNumber).toBe(12);
  });
  test('"carrera 7 la rinconada" → raceNumber 7 + trackHint rinconada', () => {
    const r = extractContextParams('carrera 7 la rinconada');
    expect(r.raceNumber).toBe(7);
    expect(r.trackHint).toBe('rinconada');
  });

  // Traqueos y programa
  test('"quién viene bien en traqueos" → needsRefresh true', () => {
    expect(extractContextParams('quién viene bien en traqueos').needsRefresh).toBe(true);
  });
  test('"dame el programa" → needsRefresh true', () => {
    expect(extractContextParams('dame el programa').needsRefresh).toBe(true);
  });
});

// ── shouldAutoRefund ──────────────────────────────────────────────────────────

describe('shouldAutoRefund — reembolso automático', () => {
  // Sin cobro nunca reembolsa
  test('sin cobro (0 golds) → no reembolsa aunque haya frase de no-data', () => {
    expect(shouldAutoRefund('no tengo inscritos para esta carrera', 0)).toBe(false);
  });

  // Señal explícita del LLM
  test('##REFUND## en respuesta → reembolsa', () => {
    expect(shouldAutoRefund('Socio, tienes razón. ##REFUND##', 3)).toBe(true);
  });

  // Frases de no-data (los casos de los screenshots)
  test('"no tengo inscritos" → reembolsa', () => {
    expect(shouldAutoRefund('No tengo inscritos cargados para esta carrera aún, socio.', 3)).toBe(true);
  });
  test('"ese dato no está en mi sistema" → reembolsa', () => {
    expect(shouldAutoRefund('Ese dato no está en mi sistema aún, socio.', 5)).toBe(true);
  });
  test('"vuelve cuando esté el programa" → reembolsa', () => {
    expect(shouldAutoRefund('Vuelve cuando esté el programa oficial.', 3)).toBe(true);
  });
  test('"no hay pronósticos publicados" → reembolsa', () => {
    expect(shouldAutoRefund('No hay pronósticos publicados para esta reunión.', 25)).toBe(true);
  });

  // Respuesta buena con data real → NO reembolsa
  test('respuesta con marcas reales → no reembolsa', () => {
    const goodResponse = 'Consenso de 6 expertos apunta a RELÁMPAGO (#4). Además trabeó 1000m hace 3 días. 📊 DesafíoHípico.com';
    expect(shouldAutoRefund(goodResponse, 3)).toBe(false);
  });
  test('respuesta de embudo sin cobro → no reembolsa', () => {
    expect(shouldAutoRefund('¿Buscas las 2 marcas de una carrera (3 Golds) o el paquete 5y6?', 0)).toBe(false);
  });
});

// ── checkGoldBalance ──────────────────────────────────────────────────────────

describe('checkGoldBalance — verificación de saldo', () => {
  test('usuario con 3 golds puede pedir marks_1race (cuesta 3)', () => {
    expect(checkGoldBalance(3, 'marks_1race').canAfford).toBe(true);
  });
  test('usuario con 2 golds NO puede pedir marks_1race (cuesta 3)', () => {
    expect(checkGoldBalance(2, 'marks_1race').canAfford).toBe(false);
  });
  test('usuario con 25 golds puede pedir pack_5y6', () => {
    expect(checkGoldBalance(25, 'pack_5y6').canAfford).toBe(true);
  });
  test('usuario con 24 golds NO puede pedir pack_5y6', () => {
    expect(checkGoldBalance(24, 'pack_5y6').canAfford).toBe(false);
  });
  test('usuario con 0 golds puede chat libre (free = 0)', () => {
    expect(checkGoldBalance(0, 'free').canAfford).toBe(true);
  });
  test('devuelve el costo requerido correcto', () => {
    expect(checkGoldBalance(10, 'analysis_1race').required).toBe(5);
  });
  test('ejecución parcial: con 9 golds → alcanza para 3 carreras marks_1race (3×3)', () => {
    const carrerasPosibles = Math.floor(9 / ACTION_COSTS.marks_1race);
    expect(carrerasPosibles).toBe(3);
  });
});
