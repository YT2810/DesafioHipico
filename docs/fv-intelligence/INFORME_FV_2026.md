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

## 5. Resultados del Backtesting Anual de 5 y 6 y Rentabilidad Real (Temporada 2026)

### Descubrimiento sobre los "Batacazos" y el Ranking Completo del FV
Al evaluar el ranking completo del Factor de Victoria (`1º al 12º puesto del FV` en lugar de cortar en el Top 5):
- **En el 80.6% de las reuniones de La Rinconada (25 de 31) y en el 82.4% de Valencia, LOS 6 GANADORES DEL 5Y6 ESTABAN DENTRO DEL FV (`1º al 7º puesto del FV`).**
- Muchos ganadores catalogados antes como "fuera del Top 5" eran en realidad el **6º o 7º del FV** (ejemplares con `3.3% a 8.6%` de FV en carreras de 10+ caballos en `1.100m–1.300m`, como en `R39` que pagó **Bs. 1.543.968**, o `R14` que pagó **Bs. 610.722**).
- En **Valencia**, en **12 de las 19 reuniones (`63.2%`), los 6 ganadores estuvieron entre el `1º y 4º del FV`** (incluyendo `R26` que pagó **Bs. 1.050.325** y `R23` que pagó **Bs. 682.303**).

### Regla de Extracción de Dividendos Oficiales y Factor Multiplicador Histórico
1. **Normalización automática de `payouts.cincoYSeis`:** Como algunos registros provienen de OCR/IA y otros de carga manual, el motor filtra entradas de otros juegos (Doble Perfecta / Pool de 4 con guiones/barras) y ordena por monto: **el monto mayor corresponde siempre al dividendo con 6 aciertos (`payout6`) y el segundo monto al dividendo con 5 aciertos (`payout5`)**.
2. **Factor Multiplicador por Fecha:**
   - **Hasta el `2026-09-03`:** Factor = **`Bs. 20`** por combinación.
   - **Desde el `2026-09-04`:** Factor = **`Bs. 35`** por combinación.
3. **Cobro Real de Cuadros Múltiples:** Cuando un cuadro acierta las **6 válidas**, cobra `1 × Dividendo_6 + Σ(c_i - 1) × Dividendo_5`. Cuando acierta **5 de 6** (fallando solo en la válida $k$ donde llevaba $c_k$ ejemplares), cobra `$c_k \times \text{Dividendo\_5}$`.

### Arquitectura de los 4 Niveles de Cuadro

1. **1. Cuadro Económico (`144 comb.` · `Bs. 2.880` antes del 03/09 / `Bs. 5.040` actual):**
   - Molde `1 × 2 × 2 × 3 × 3 × 4` (1 Línea en la más clara, 2 Candados, 2 Trilogías y 4 en la más abierta).
2. **2. Cuadro Medio (`~423 comb.` · `Bs. 8.640` antes del 03/09 / `Bs. 15.120` actual):**
   - Blinda el **"Falso 2º Fijo" (`rk1`) con 4 caballos** y juega **Sin Línea (`2 × 4 × 2 × 3 × 3 × 3 = 432 comb.`)** cuando no hay Súper Fijo claro.
3. **3. Cuadro Blindado (`~1.118–1.152 comb.` · `~Bs. 39.000` actual):**
   - **En La Rinconada:** Cierra a Candado (`2`) las válidas nobles (`rk0` y `rk2`), blinda `rk1` con `4`, e identifica las **2 válidas con el `1º FV` más débil** entre `rk2..rk5` para meterles **5 caballos del FV (`Top 5 FV`)** (`2 × 4 × 2 × 3 × 5 × 5 = 1.200 comb.`).
   - **En Valencia:** Juega **Sin Línea `3 × 4 × 2 × 3 × 4 × 4 = 1.152 comb.`**, cubriendo hasta el 4º del FV en 3 válidas y atrapando **10 de las 19 reuniones del año con 6 de 6 (`52.6%`)**.
4. **👑 4. Cuadro Premium (`Elástico por Condición Estadística`, cap `≤ 2.160 comb.`):**
   - Evalúa carrera por carrera cuántos ejemplares tienen opción estadística real en el FV: si el **5º caballo tiene `≥ 6.2%` de FV** (como en `R38`, `R36`, `R30`) o si es un **tiro corto `≤ 1.300m` con `10+ caballos` donde el 6º FV tiene `≥ 3.3%`** (como en `R14` que pagó **Bs. 610.722**), expande automáticamente esa carrera a **5 o 6 caballos del FV**, recortando a `2` (`Candado`) solo cuando `1º+2º FV ≥ 75%` y el `3º < 13%`.

### Tabla Comparativa Verificada (50 Reuniones 2026 — Premios y Ganancia Neta Real)

| Hipódromo | Nivel de Cuadro | Comb. Promedio | Cuadros con 6 de 6 🏆 | Cuadros con 5 de 6 🎯 | Total Invertido 2026 | Total Cobrado 2026 | Ganancia Neta (ROI) |
|---|---|---|---|---|---|---|---|
| **La Rinconada** *(31 reun.)* | **1. Económico** | 144 comb. | **2 con 6** (`6.5%`) | 9 con 5 | Bs. 102.240 | Bs. 161.823 | **+Bs. 59.583** |
| **La Rinconada** *(31 reun.)* | **2. Medio** | 423 comb. | **4 con 6 (`12.9%`)** | 10 con 5 | Bs. 300.960 | Bs. 717.906 | **+Bs. 416.946** |
| **La Rinconada** *(31 reun.)* | **3. Blindado** | 1.118 comb. | **6 con 6 (`19.4%`)** | 7 con 5 | Bs. 801.120 | Bs. 1.225.783 | **+Bs. 424.663** |
| **La Rinconada** *(31 reun.)* | **👑 4. Premium** | 1.943 comb. | **9 con 6 (`29.0%`)** | 12 con 5 | Bs. 1.390.295 | **Bs. 2.443.634** | **+Bs. 1.053.339** |
| **Valencia** *(19 reun.)* | **1. Económico** | 144 comb. | **3 con 6** (`15.8%`) | 5 con 5 | Bs. 65.520 | Bs. 79.954 | **+Bs. 14.434** |
| **Valencia** *(19 reun.)* | **2. Medio** | 398 comb. | **6 con 6 (`31.6%`)** | 6 con 5 | Bs. 183.600 | Bs. 1.184.728 | **+Bs. 1.001.128** |
| **Valencia** *(19 reun.)* | **3. Blindado** | 1.152 comb. | **10 con 6 (`52.6%`)** | 5 con 5 | Bs. 524.160 | **Bs. 2.847.190** | **+Bs. 2.323.030** |
| **Valencia** *(19 reun.)* | **👑 4. Premium** | 1.329 comb. | **11 con 6 (`57.9%`)** | 5 con 5 | Bs. 614.400 | **Bs. 2.925.143** | **+Bs. 2.310.743** |
| **TOTAL 2026** *(50 reun.)* | **1. Económico** | 144 comb. | **5 cuadros con 6 (`10.0%`)** | 14 con 5 | Bs. 167.760 | Bs. 241.777 | **+Bs. 74.017** |
| **TOTAL 2026** *(50 reun.)* | **2. Medio** | ~413 comb. | **10 cuadros con 6 (`20.0%`)** | 16 con 5 | Bs. 484.560 | Bs. 1.902.634 | **+Bs. 1.418.074** |
| **TOTAL 2026** *(50 reun.)* | **3. Blindado** | ~1.131 comb. | **16 cuadros con 6 (`32.0%`)** | 12 con 5 | Bs. 1.325.280 | Bs. 4.072.973 | **+Bs. 2.747.693** |
| **TOTAL 2026** *(50 reun.)* | **👑 4. Premium** | ~1.710 comb. | **20 cuadros con 6 (`40.0%`)** | 17 con 5 | Bs. 2.004.695 | **Bs. 5.368.777** | **+Bs. 3.364.082** |

---

## 6. Leyes de las Jornadas Millonarias (`< 300 Cuadros` / `> Bs. 1.000.000`) y el "Cuadro Cazador"

Al auditar las 14 reuniones de La Rinconada y 4 de Valencia donde hubo menos de 350 cuadros con 6 o el dividendo superó `Bs. 800.000 – 31.965.521`, se identificaron 3 leyes estructurales:

### Ley 1: En los días millonarios NO ganan 6 batacazos — ganan 4 o 5 favoritos (`1º a 3º FV`) + 1 o 2 sorpresas
- En `R39` (`Bs. 1.543.968`), `R13` (`Bs. 1.265.197`), `R21` (`Bs. 1.047.641`), `R25` (`Bs. 906.115`), `Valencia R26` (`Bs. 1.050.325`) y `Valencia R19` (`Bs. 784.764`), **5 de las 6 válidas fueron ganadas por el Top 3 del FV (`1º, 2º o 3º FV`)**.
- En `R26` (`Bs. 5.307.966`), `R24` (`Bs. 3.250.773`), `R35` (`Bs. 3.226.316`), `R10` (`Bs. 2.111.254`) y `R20` (`Bs. 1.466.235`), **4 de las 6 válidas fueron ganadas por el Top 3 del FV**.

### Ley 2: La "Trampa del Falso Fijo de `48.5% a 55.5% FV`" en Tiro Corto / Lote Grande
En la mayoría de las jornadas de dividendo millonario, el batacazo (`6º–8º FV` o `0% FV`) explotó exactamente en la carrera donde había un favorito en la banda **`48.5% a 55.5% de FV`**:
- **`Caracas R28` (`Bs. 31.965.521` · 8 cuadros):** Cayó el favorito de **`50.0% FV`** en la 3ª válida y ganó un `0% FV`.
- **`Valencia R10` (`Bs. 14.150.586` · 3 cuadros):** Cayó el favorito de **`50.0% FV`** en la 2ª válida y ganó un `0% FV`.
- **`Caracas R34` (`Bs. 3.713.235` · 116 cuadros):** Cayó el único favorito de **`53.6% FV`** en la 3ª válida y ganó el `4º FV`.
- **`Caracas R35` (`Bs. 3.226.316` · 143 cuadros):** Cayó el favorito de **`51.8% FV`** en la 2ª válida y ganó el `7º FV`.
- **`Caracas R39` (`Bs. 1.543.968` · 346 cuadros):** Cayó el favorito de **`52.7% FV`** en la 1ª válida (`1.200m · 10 ej.`) y ganó el `6º FV`.
- **`Caracas R25` (`Bs. 906.115` · 351 cuadros):** Cayó el favorito de **`54.6% FV`** en la 2ª válida (`1.100m · 10 ej.`) y ganó un `0% FV`.
- **`Valencia R19` (`Bs. 784.764` · 88 cuadros):** Cayó el favorito de **`55.2% FV`** en la 4ª válida y ganó un `0% FV`.

### Ley 3: "Bloque Compacto (`≥ 91%`)" vs. "Vacío en el 3º FV (`≤ 14.5%`)" — Cómo saber dónde meter `TODOS`
Para no meter `TODOS` en varias carreras el mismo día:
1. **Bloque Compacto (NO lleva `TODOS`):** Cuando los 3 primeros suman **`≥ 91%` con el `3º ≥ 20%`** (Trilogía Compacta, ej. `39% + 31.4% + 25.8% = 96.2%`) o cuando los 4 primeros suman **`≥ 91%` con el `4º ≥ 15%`** (Póker Compacto, ej. `29.5% + 26.1% + 21.2% + 19.3% = 96.1%`), los pronosticadores ya encerraron la carrera en ese bloque de 3 o 4 ejemplares.
2. **Vacío de Escolta / Cola Rota (SÍ lleva `TODOS` en el Cuadro Cazador):** Cuando en `1.100m–1.300m` (o con `9+ ejemplares`) el **`3º FV` cae a `≤ 14.5%`** dejando entre `24% y 35%` de los puntos pulverizados en muchos caballos secundarios (o cuando hay un Falso Fijo de `48.5%–55.5%`). Si fallan los 2 primeros, no existe un 3er favorito fuerte que sostenga la carrera y entra cualquiera del lote (`6º–8º FV` o `0% FV`).

### Regla de Acceso del Club 5y6 VIP Semanal (Frontend Público)
- El widget flotante `👑 5y6 Algoritmo` (`src/components/VipFiveAndSixWidget.tsx` y `GET /api/vip-5y6`) desbloquea los cuadros **Económico** y **Medio** únicamente para usuarios con recarga aprobada dentro de la **semana calendario en curso (`Lunes 00:00:00 a Domingo 23:59:59`, hora de Venezuela `UTC-4`)**.
- Los ejemplares se muestran **ordenados estrictamente por número de dorsal de menor a mayor (`#1, #4, #9`) sin revelar el `% FV`**, protegiendo el consumo de Golds carrera por carrera.

---

## 7. Efectividad por Categoría / Llamado del Lote, Edad y Estudio del 4º Favorito

### A. Matriz por Categoría / Llamado del Lote (La Rinconada)

| Llamado / Categoría | Carreras | Ganó 1º o 2º FV (Candado) | Ganó Top 3 FV | Ganó 4º o 5º FV | Ganó 6º–8º FV | Ganó `0% Sin FV` | Diagnóstico |
|---|---|---|---|---|---|---|---|
| **Reclamo Real** | 16 | **15 de 16 (`93.8%`)** | **93.8%** | 1 (`6.2%`) | **0 (`0%`)** | **0 (`0%`)** | **🔒 Candado Absoluto (`1º+2º FV`).** |
| **Ganadores de 1 (y 1–2)** | 51 | **40 de 51 (`78.4%`)** | **86.3%** | 6 (`11.8%`) | 1 (`2.0%`) | **0 (`0%`)** | **📌 Línea o Candado (`0%` fuera del FV).** |
| **Clásicos y Copas** | 47 | **32 de 47 (`68.1%`)** | **80.9%** | 6 (`12.8%`) | 3 (`6.4%`) | **0 (`0%`)** | **Cero ganadores de `0% Sin FV`.** |
| **Ganadores de 3 o 4** | 21 | **14 de 21 (`66.7%`)** | **76.2%** | 4 (`19.0%`) | 1 (`4.8%`) | **0 (`0%`)** | **Cero ganadores de `0% Sin FV`.** |
| **Ganadores de 2** | 23 | 14 de 23 (`60.9%`) | 73.9% | 1 (`4.3%`) | **4 (`17.4%`)** | 1 (`4.3%`) | **⚠️ Alerta de `6º–8º FV` (`17.4%`).** |
| **Perdedores / Debutantes** | 121 | 79 de 121 (`65.3%`) | 79.3% | **14 (`11.6%`)** | **6 (`5.0%`)** | **5 (`4.1%`)** | **💣 Concentra casi la mitad de los `0% Sin FV` del año.** |

### B. Matriz por Edad del Lote (La Rinconada)

| Edad del Lote | Carreras | Ganó 1º o 2º FV (Candado) | Ganó Top 3 FV | Ganó 4º o 5º FV | Ganó 6º–8º FV | Ganó `0% Sin FV` |
|---|---|---|---|---|---|---|
| **`3 y 4 / 4 y 5 años`** | 27 | **23 de 27 (`85.2%`)** | **92.6%** | 1 (`3.7%`) | 1 (`3.7%`) | **0 (`0%`)** |
| **`4 y más años`** | 51 | **39 de 51 (`76.5%`)** | **86.3%** | 1 (`2.0%`) | 5 (`9.8%`) | 1 (`2.0%`) |
| **`6 y más años`** | 55 | 35 de 55 (`63.6%`) | **83.6%** | 7 (`12.7%`) | **0 (`0%`)** | 2 (`3.6%`) |
| **`3 años exclusivos`** | 69 | 42 de 69 (`60.9%`) | 72.5% | **13 (`18.8%`)** | 3 (`4.3%`) | 3 (`4.3%`) |
| **`5 y más años` (Lote más peligroso)** | 47 | **24 de 47 (`51.1%`)** | **68.1%** | **8 (`17.0%`)** | **5 (`10.6%`)** | **2 (`4.3%`)** |

### C. Verificación Empírica del `4º Favorito con ≥ 15%–20% FV` y las 3 Variantes de Sellar
- En La Rinconada, cuando el `4º FV` tuvo `≥ 16%` (31 carreras), el `4º FV` ganó solo **2 veces (`6.5%`)**, pero en esas carreras abiertas **del `5º al 8º del FV` ganaron 7 veces (`22.6%`)** y `0% Sin FV` ganó **0 veces**. Cuando el `4º FV` llegó a `≥ 20%` (13 carreras), ganó **2 de 13 (`15.4%`)** y el Top 3 ganó **10 de 13 (`76.9%`)**.
- Por ello, la sección privada **`3E. Armador de Variantes y Caza-Batacazos`** permite alternar en vivo entre:
  1. **Variante 1 (`Caza 5º–7º FV`):** Abre hasta el 5º–7º puesto del FV en las carreras con Vacío / Perdedores / 5+ años.
  2. **Variante 2 (`Top 5 FV Abierto`):** Para domingos donde ningún favorito supera el 52% y los 6 ganadores están dentro del Top 5 del FV (como en `R41`, `R34` y `R24`).
  3. **Variante 3 (`Bomba con TODOS / Stud / Yunta 0% FV`):** Permite incluir todos los inscritos o encender manualmente cualquier ejemplar de `0% Sin FV` por Stud, Yunta o Corazonada.


