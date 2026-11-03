# Factor de Victoria — Lógica y Core IP

> Este es el diferenciador central de Desafío Hípico. Sin él, la plataforma es un agregador de datos genérico. Con él, es un producto analítico propio.

## Qué es el FV

El Factor de Victoria es un **score de probabilidad relativa** calculado para cada caballo en cada carrera, basado en patrones estadísticos históricos de La Rinconada y Valencia. No predice al ganador — identifica cuál caballo tiene la mayor concentración de señales históricamente asociadas con el éxito.

**Resultado clave validado:** 79.9% de los ganadores de La Rinconada 2026 salieron dentro del Top 3 del FV.

## Datos de Entrada del FV

El FV procesa por carrera:
- **Distancia** — corta (<1200m), media (1200-1600m), larga (>1600m)
- **Tamaño del lote** — pequeño (<8), mediano (8-12), grande (>12)
- **Posición en el programa** — carrera 1-3 (apertura), 4-7 (cuerpo), 8-10 (cierre)
- **Edad del ejemplar** — jóvenes (2-3 años) vs. experimentados (4+)
- **Condiciones de carrera** — peso, barrera, retiros del lote

## Leyes Estadísticas Clave (Informe FV 2026)

Documentadas en `docs/fv-intelligence/INFORME_FV_2026.md`:

- **Ley del Lote Riesgoso:** Lotes de 11+ ejemplares reducen significativamente la tasa de acierto Top 3 — el FV advierte con chip ⚠️
- **Ley del Tiro Corto:** Favorito absoluto (precio muy bajo) tiene tasa de sobre-rendimiento baja — el FV penaliza
- **Ley del Lote Noble:** Lotes 6-8 ejemplares con ejemplares de edad pareja → alta concentración Top 3 — chip ✅
- **Ley de Trilogía:** Tres carreras consecutivas del mismo ejemplar con Top 3 → señal positiva fuerte
- **Umbrales del diagnóstico:** >40% score = candidato, >50% = preferencia, >60% = selección

## Diagnóstico por Carrera (raceDiag)

`src/app/pronosticos/page.tsx` → función `RacePanel` → `useMemo raceDiag`

```typescript
raceDiag retorna:
{
  riskChips[],       // ⚠️ Señales negativas: tiro corto, lote riesgoso, falso fijo
  favorChips[],      // ✅ Señales positivas: noble, trilogía, corte limpio
  dangerCount,       // Número de riesgos
  fvScope,           // "cerrar en 2-3" / "ampliar a 4-5" / "buscar hasta 6°"
  recommendation,    // Texto accionable para el usuario
  legendTitle        // "X riesgos · Y a favor"
}
```

**Regla Noble + Riesgoso simultáneo:** Si el lote es ambos a la vez (tamaño noble pero condiciones riesgosas), NO se cancela ninguno. Ambos aparecen con sus stats reales. El diagnóstico refleja la ambigüedad del mercado.

## Factor 5y6 — Multiplicador de Combinaciones

`src/services/fvAccuracyService.ts` → `get5y6FactorBs(dateStr)`

```typescript
// Tramos históricos del multiplicador del INH
function get5y6FactorBs(dateStr: string): number {
  if (dateStr <= '2026-09-03') return 20;   // Factor histórico hasta sept
  if (dateStr <= '2026-10-30') return 35;   // Factor intermedio
  return 50;                                  // Factor actual desde 31/10/2026
}
```

**Combinaciones y costos actuales (Factor Bs. 50):**
- Económico: 144 combinaciones → Bs. 7.200
- Medio: 432 combinaciones → Bs. 21.600

Los historiales de backtesting conservan su factor real de época — un meeting de agosto 2026 siempre muestra Factor 20.

## Backtesting y Laboratorio FV

`src/services/fvAccuracyService.ts` → `getFvLabAnalytics()`:
- Solo lectura (`.lean()` en todas las queries)
- Cruza datos de Forecast vs. Results por hipódromo, año, distancia, tamaño de lote
- Genera estadísticas de acierto por tramo
- Alimenta el tab `🧪 Laboratorio FV` en `/admin`

El informe histórico en `docs/fv-intelligence/INFORME_FV_<AÑO>.md` **nunca se borra** — es evidencia permanente del desempeño del algoritmo.

## Cómo Abstraerlo para Otros Nichos (TYM)

El FV sigue el patrón universal: **Data cruda → Pipeline de agregación → Score propio → Paywall**

| Nicho | Equivalente del FV | Datos de entrada |
|---|---|---|
| Hipismo americano | "Victory Factor" (mismo motor) | Equibase past performances |
| Loterías | "Tendencias de Sorteo" | Histórico de sorteos por número |
| Finanzas | "Señal de Momentum" | OHLCV de activos |

La lógica de acceso (Pase → `hasActivePass` → diagnóstico desbloqueado) es idéntica en todos los casos — solo cambia el contenido del diagnóstico.

## Archivos del FV en el Repositorio

| Archivo | Rol | Tocar? |
|---|---|---|
| `src/services/fvAccuracyService.ts` | Motor completo + backtesting | Solo agregar, no refactorizar sin análisis |
| `src/app/admin/_components/LaboratorioFvTab.tsx` | UI del lab (admin) | Agregar años nuevos |
| `src/components/VipFiveAndSixWidget.tsx` | Widget flotante público | Actualizar si cambian precios |
| `docs/fv-intelligence/INFORME_FV_2026.md` | Informe permanente 2026 | NUNCA borrar |
| `docs/fv-intelligence/INFORME_FV_2027.md` | (Crear en enero 2027) | Uno por año |
