---
name: factor-victoria
description: Lógica completa del Factor de Victoria — algoritmo, umbrales, factor 5y6, backtesting, diagnóstico por carrera
triggers:
  - user
  - model
allowed-tools:
  - read
---

## Qué es el FV
Score de probabilidad relativa por caballo por carrera. **Validado: 79.9% de ganadores La Rinconada 2026 salieron en Top 3 del FV.**

## Archivos clave
| Archivo | Rol |
|---|---|
| `src/services/fvAccuracyService.ts` | Motor completo + backtesting (solo lectura `.lean()`) |
| `src/app/pronosticos/page.tsx` | `RacePanel` → `useMemo raceDiag` → diagnóstico |
| `src/app/admin/_components/LaboratorioFvTab.tsx` | UI del lab — solo lectura |
| `src/components/VipFiveAndSixWidget.tsx` | Widget flotante 5y6 |
| `docs/fv-intelligence/INFORME_FV_2026.md` | Informe permanente — **NUNCA borrar** |

## Factor 5y6 — tramos históricos
```typescript
function get5y6FactorBs(dateStr: string): number {
  if (dateStr <= '2026-09-03') return 20;
  if (dateStr <= '2026-10-30') return 35;
  return 50; // desde 31/10/2026, todos los hipódromos
}
```
**Costos actuales (Factor Bs. 50):** Económico 144 comb. = Bs. 7.200 · Medio 432 comb. = Bs. 21.600

## Diagnóstico por carrera (raceDiag)
```
riskChips[]   → ⚠️ tiro corto, lote riesgoso, falso fijo, cola viva, sin favorito
favorChips[]  → ✅ noble, trilogía, corte limpio, tiro largo, moderador de edad
fvScope       → "cerrar en 2-3" / "ampliar a 4-5" / "buscar hasta 6°"
recommendation → texto accionable
```
**Regla Noble + Riesgoso simultáneo:** Ambos aparecen — no se cancelan. Noble va a `favorChips` como "Moderador de edad (92.6% Top 3)".

## Visibilidad
- Diagnóstico: solo para `passUnlocked || isPrivileged`
- FV display: siempre los primeros 6 (`.slice(0,6)`)
- El 6° importa en carreras de alto riesgo — no cortar a 5

## Reglas inamovibles
- Todos los queries del Lab son estrictamente `.lean()` — nunca modifican datos
- `docs/fv-intelligence/INFORME_FV_*.md` son permanentes — uno por año, nunca borrar
- Al cambiar el factor, siempre preservar los tramos históricos — el backtest debe mostrar el factor real de época

## Extensión a otros nichos (TYM)
Patrón universal: **Data cruda → Pipeline agregación → Score propio → Paywall**
- Hipismo americano: mismo motor, adapter Equibase
- Loterías: "Tendencias de Sorteo"
- Finanzas: "Señal de Momentum"
