# Informe Oficial de Inteligencia — Factor de Victoria (Temporada 2026)

> **REGLA PERMANENTE DE PRESERVACIÓN:**
> Este documento contiene las leyes estadísticas y hallazgos empíricos del algoritmo **Factor de Victoria (FV)** de Desafío Hípico correspondientes a la **Temporada 2026**.
> - **NUNCA borrar este archivo.** Debe actualizarse periódicamente durante la temporada activa.
> - **Separación anual obligatoria:** Debido al parón hípico de diciembre en Venezuela (cambio de edad de ejemplares, reclasificación de lotes y receso de pista), cada año calendario debe tener su propio archivo independiente (`INFORME_FV_2026.md`, `INFORME_FV_2027.md`, etc.) dentro de `docs/fv-intelligence/`.
> - **Visualización en tiempo real:** El panel `/admin` → pestaña `🧪 Laboratorio FV` (`src/services/fvAccuracyService.ts` · `getFvLabAnalytics`) recalcula todas estas tablas y el Backtester de 5y6 en vivo semana a semana tras cada jornada con resultados oficiales.

---

## 1. Universo Auditado (Corte Octubre 2026)

- **Total carreras evaluadas con resultados oficiales y pronósticos:** **554 carreras** (50 reuniones con 5y6 completo).
  - **La Rinconada (`INH`):** **393 carreras** (31 reuniones de 5y6) · **35 batacazos** fuera del Top 5 FV (**8.9%**).
  - **Nacional de Valencia (`HINAVA`):** **161 carreras** (19 reuniones de 5y6) · **13 batacazos** fuera del Top 5 FV (**8.1%**).

### Efectividad General por Posición del Ranking FV

| Posición en el FV | La Rinconada (393 carr.) | % Acierto Caracas | Valencia (161 carr.) | % Acierto Valencia |
|---|---|---|---|---|
| **1º Favorito FV** | 172 victorias | **43.8%** | 60 victorias | **37.3%** |
| **2º Favorito FV** | 94 victorias | **24.0%** | 44 victorias | **27.8%** |
| **3º Favorito FV** | 48 victorias | **12.4%** | 29 victorias | **19.1%** |
| **4º Favorito FV** | 29 victorias | **7.7%** | 14 victorias | **9.9%** |
| **5º Favorito FV** | 16 victorias | **4.6%** | 1 victoria | **0.9%** |
| **Batacazo (Fuera Top 5)** | 35 carreras | **8.9%** | 13 carreras | **8.1%** |
| **Acumulado Top 3 FV (1º+2º+3º)** | **314 de 393** | **79.9%** | **133 de 161** | **82.6%** |
| **Acumulado Top 5 FV (1º al 5º)** | **358 de 393** | **91.1%** | **148 de 161** | **91.9%** |

---

## 2. Efectividad por Umbral (`+40%`, `+50%`, `+60%`) y Con Quién Pierden los Favoritos

### La Rinconada
| Umbral / Banda FV | Casos | Ganaron | % Victoria | Perdieron | Cuando pierde, ¿qué puesto FV le gana? |
|---|---|---|---|---|---|
| **Acumulado `FV ≥ 60%`** | 37 | 26 | **70.3%** | 11 | 2º FV: `18.2%` (2) · 3º FV: `27.3%` (3) · 5º FV: `9.1%` (1) · Batacazo: `45.5%` (5) |
| **Acumulado `FV ≥ 50%`** | 141 | 84 | **59.6%** | 57 | **2º FV: `43.9%` (25)** · 3º FV: `15.8%` (9) · 4º/5º: `15.8%` (9) · Batacazo: `24.6%` (14) |
| **Acumulado `FV ≥ 40%`** | 280 | 141 | **50.4%** | 139 | **2º FV: `44.6%` (62)** · **3º FV: `22.3%` (31)** · 4º/5º: `15.8%` (22) · Batacazo: `17.3%` (24) |
| **Banda `50% – 59.9%`** | 104 | 58 | **55.8%** | 46 | **2º FV le gana el `50.0%` de las veces (23 de 46)**. Candado `1º+2º` = **77.9% (81/104)**. |
| **Banda `40% – 49.9%`** | 139 | 57 | **41.0%** | 82 | **2º FV (`45.1%`) + 3º FV (`26.8%`) = `72.0%` de las caídas**. Trilogía `1º+2º+3º` = **83.5% (116/139)**. |

### Nacional de Valencia
| Umbral / Banda FV | Casos | Ganaron | % Victoria | Perdieron | Cuando pierde, ¿qué puesto FV le gana? |
|---|---|---|---|---|---|
| **Acumulado `FV ≥ 60%`** | 22 | 9 | **40.9%** | 13 | 2º FV: `46.2%` (6) · 3º FV: `7.7%` (1) · 4º FV: `7.7%` (1) · Batacazo: `38.5%` (5) |
| **Acumulado `FV ≥ 50%`** | 67 | 27 | **40.3%** | 40 | **2º FV: `42.5%` (17)** · **3º FV: `27.5%` (11)** (`70%` entre 2º y 3º FV) |
| **Banda `50% – 59.9%`** | 45 | 18 | **40.0%** | 27 | **2º FV (`40.7%`) + 3º FV (`37.0%`) = `77.7%` de las caídas** |
| **Banda `40% – 49.9%`** | 61 | 21 | **34.4%** | 40 | **2º FV le gana el `52.5%` de las veces (21 de 40)** |

> **Regla estructural Caracas vs. Valencia:**
> En La Rinconada un ejemplar de `FV ≥ 60%` es una **Línea Fija de 70.3%**. En Valencia los favoritos de `+60%` caen casi el `60%` de las veces (`40.9%` acierto), pero cuando caen, el ganador casi siempre es el **2º o 3º del FV**. Por eso en Valencia la jugada maestra es el **Candado (`1º+2º`)** o la **Trilogía de Corte Limpio (`3 ejemplares ≥ 20%`)**, que alcanza **88.1% de efectividad (37 de 42)**.

---

## 3. Matriz por Distancias (`1.100m` a `3.200m`)

### La Rinconada
| Distancia | Carreras | 1º FV | 2º FV | 3º FV | 4º FV | 5º FV | Batacazos | % del Total de Batacazos (35) |
|---|---|---|---|---|---|---|---|---|
| **1.100 mts** | 73 | 24 (**32.9%**) | 20 (27.4%) | 13 (17.8%) | 8 (11.0%) | 3 (4.1%) | 5 (6.8%) | 14.3% |
| **1.200 mts** | 121 | 48 (39.7%) | 28 (23.1%) | 17 (14.0%) | 9 (7.4%) | 5 (4.1%) | **14 (11.6%)** | **40.0%** |
| **1.300 mts** | 78 | 36 (46.2%) | 20 (25.6%) | 7 (9.0%) | 2 (2.6%) | 3 (3.8%) | **10 (12.8%)** | **28.6%** |
| **1.400 mts** | 66 | **38 (57.6%)** | 8 (12.1%) | 4 (6.1%) | 7 (10.6%) | 3 (4.5%) | 6 (9.1%) | 17.1% |
| **1.500 mts** | 12 | 3 (25.0%) | 5 (41.7%) | 1 (8.3%) | 2 (16.7%) | 1 (8.3%) | **0 (0%)** | **0%** |
| **1.600 mts** | 17 | 7 (41.2%) | 6 (35.3%) | 2 (11.8%) | 1 (5.9%) | 1 (5.9%) | **0 (0%)** | **0%** |
| **1.800 mts** | 16 | **9 (56.3%)** | **5 (31.3%)** | **2 (12.5%)** | 0 (0%) | 0 (0%) | **0 (0%)** | **0% (100% ganó Top 3)** |
| **1.900m a 3.200m** | 10 | 6 (60.0%) | 2 (20.0%) | 2 (20.0%) | 0 (0%) | 0 (0%) | **0 (0%)** | **0% (100% ganó Top 3)** |

### Nacional de Valencia
| Distancia | Carreras | 1º FV | 2º FV | 3º FV | 4º FV | 5º FV | Batacazos | % del Total de Batacazos (13) |
|---|---|---|---|---|---|---|---|---|
| **1.100 mts** | 28 | 11 (39.3%) | 10 (35.7%) | 5 (17.9%) | 0 (0%) | 1 (3.6%) | 1 (3.6%) | 7.7% |
| **1.200 mts** | 57 | 19 (33.3%) | 14 (24.6%) | 10 (17.5%) | 8 (14.0%) | 0 (0%) | **6 (10.5%)** | **46.2%** |
| **1.300 mts** | 34 | 15 (44.1%) | 6 (17.6%) | 8 (23.5%) | 3 (8.8%) | 0 (0%) | 2 (5.9%) | 15.4% |
| **1.400 mts** | 28 | 8 (28.6%) | 10 (35.7%) | 3 (10.7%) | 3 (10.7%) | 0 (0%) | **4 (14.3%)** | **30.8%** |
| **1.700m a 2.000m** | 13 | **7 (53.8%)** | **3 (23.1%)** | **3 (23.1%)** | 0 (0%) | 0 (0%) | **0 (0%)** | **0% (100% ganó Top 3)** |

> **Ley de las Distancias:**
> 1. **En `1.500m a 3.200m` (68 carreras combinadas en 2026) hubo 0% de Batacazos (0 de 68).** El `100%` de los batacazos ocurre entre `1.100m` y `1.400m`.
> 2. En La Rinconada, **`1.400m` (`57.6%` acierto del 1º FV)** y **`1.800m` (`56.3%` 1º FV y `100%` Top 3 FV)** son las distancias más nobles para elegir la **Línea** o el **Candado** del 5y6.
> 3. **`1.100m` en La Rinconada** es la distancia donde más falla el 1º FV (`32.9%` de acierto).

---

## 4. Matriz por Tamaño del Lote (Cantidad de Caballos en Pista)

### La Rinconada (393 carreras · 35 batacazos)
| Ejemplares en pista | Carreras | 1º FV | 2º FV | 3º FV | 4º FV | 5º FV | Batacazos | % del Total de Batacazos (35) |
|---|---|---|---|---|---|---|---|---|
| **2 a 5 ejemplares** | 17 | 11 (**64.7%**) | 4 (23.5%) | 1 (5.9%) | 0 | 1 | **0 (0%)** | **0%** |
| **6 ejemplares** | 18 | 5 (27.8%) | 6 (33.3%) | 3 (16.7%) | 2 | 1 | 1 (5.6%) | 2.9% |
| **7 ejemplares** | 57 | 30 (**52.6%**) | 10 (17.5%) | 4 (7.0%) | 8 | 0 | 5 (8.8%) | 14.3% |
| **8 ejemplares** | 100 | 48 (**48.0%**) | 25 (25.0%) | 11 (11.0%) | 4 | 7 | 5 (**5.0%**) | 14.3% |
| **9 ejemplares** | 76 | 32 (42.1%) | 20 (26.3%) | 11 (14.5%) | 4 | 2 | **7 (9.2%)** | **20.0%** |
| **10 ejemplares** | 58 | 18 (**31.0%**) | 14 (24.1%) | 9 (15.5%) | 6 | 3 | **8 (13.8%)** | **22.9%** |
| **11+ ejemplares** | 67 | 27 (40.3%) | 15 (22.4%) | 9 (13.4%) | 5 | 2 | **9 (13.4%)** | **25.7%** |

> **Ley del Lote Grande:**
> El **68.6% de todos los batacazos de La Rinconada (24 de 35)** se produce en carreras de **9, 10 u 11+ ejemplares**. Cuando se combinan **Tiro corto (`1.100m–1.300m`) + Lote `≥ 9 caballos` + `1º FV < 45%`**, el 1º Favorito pierde el **71.1% de las veces en Caracas (54 de 76)** y el **70.6% en Valencia (12 de 17)**.

---

## 5. Resultados del Backtesting Anual de 5 y 6 (Temporada 2026)

Aplicando el algoritmo de asignación por confianza de válida (1 Línea en la más clara + 2 Candados + 2 Trilogías + 1 Multiplicador de 4–5 caballos en la válida más peligrosa) sobre las **50 reuniones completas de 2026**:

| Hipódromo | Reuniones Evaluadas | Perfil de Cuadro | Combinaciones Promedio | Reuniones con 6 de 6 | Reuniones con 5 de 6 | Total Reuniones Premiadas (5 o 6) | % de Semanas Cobrando |
|---|---|---|---|---|---|---|---|
| **La Rinconada** | 31 reuniones | **Estándar FV** | **140 comb.** | **2** (`R15`, `R32`) | **7** | **9 de 31** | **29.0%** |
| **La Rinconada** | 31 reuniones | **Blindado FV** | **350 comb.** | **2** (`R15`, `R32`) | **9** | **11 de 31** | **35.5%** |
| **Valencia** | 19 reuniones | **Estándar FV** | **133 comb.** | **3** (`R7`, `R8`, `R13`) | **6** | **9 de 19** | **47.4%** |
| **Valencia** | 19 reuniones | **Blindado FV** | **332 comb.** | **4** (`R7`, `R8`, `R13`, `R18`) | **7** | **11 de 19** | **57.9%** |
| **TOTAL 2026** | **50 reuniones** | **Blindado FV** | **~343 comb.** | **6 cuadros con 6** | **16 cuadros con 5** | **22 de 50 reuniones** | **44.0%** |
