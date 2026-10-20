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
3. **Regla Oficial de Cobro INH (1 solo pago por cuadro):**
   - Cuando un cuadro acierta las **6 válidas (`6 de 6`)**, cobra **únicamente `1 × Dividendo_6`** (sin sumar combinaciones con 5).
   - Cuando un cuadro acierta **5 de 6 (`5 de 6`)**, cobra **únicamente `1 × Dividendo_5`** (una sola vez por cuadro, sin multiplicar por la cantidad de caballos en la válida fallada).

### Arquitectura de los 4 Niveles Estándar + 5º Nivel Privado (Cazador)

1. **1. Cuadro Económico (`144 comb.` · `Bs. 2.880` antes del 03/09 / `Bs. 5.040` actual):**
   - Molde `1 × 2 × 2 × 3 × 3 × 4` (1 Línea en la más clara, 2 Candados, 2 Trilogías y 4 en la más abierta).
2. **2. Cuadro Medio (`~432 comb.` · `Bs. 8.640` antes del 03/09 / `Bs. 15.120` actual):**
   - Blinda el **"Falso 2º Fijo" (`rk1`) con 4 caballos** y juega **Sin Línea (`2 × 4 × 2 × 3 × 3 × 3 = 432 comb.`)** cuando no hay Súper Fijo claro.
3. **3. Cuadro Blindado (`~1.144–1.152 comb.` · `~Bs. 39.000` actual):**
   - **En La Rinconada:** Cierra a Candado (`2`) las válidas nobles (`rk0` y `rk2`), blinda `rk1` con `4`, e identifica las **2 válidas con el `1º FV` más débil** entre `rk2..rk5` para meterles **5 caballos del FV (`Top 5 FV`)**.
   - **En Valencia:** Juega **Sin Línea `3 × 4 × 2 × 3 × 4 × 4 = 1.152 comb.`**, cubriendo hasta el 4º del FV en 3 válidas y atrapando **10 de las 19 reuniones del año con 6 de 6 (`52.6%`)**.
4. **👑 4. Cuadro Premium (`Elástico por Condición Estadística`, cap `≤ 2.160 comb.`):**
   - Cierra en `2` (`Candado`) cuando hay corte limpio (`1º ≥ 44%, 2º ≥ 23%, 3º < 11%`), cierra en `3` (`Trilogía`) cuando hay 3 ejemplares `≥ 19.5%` con `4º < 13%`, abre a `5` cuando `1º FV < 40%` y `3º ≥ 18%`, y expande hasta el **6º FV** en lotes explosivos con `6º FV ≥ 3.3%`.
5. **💣 5. Cuadro Cazador Potencial (Exclusivo Admin):**
   - Parte de la base validada, protege la cobertura hasta el **6º FV** en las carreras con **Falso Fijo (`48.5%–55.5% FV`) en tiro corto con `10+ ejemplares`** (atrapando tanto `R41` de **Bs. 9.363.331** como `R39` de **Bs. 1.543.968** y `R14` de **Bs. 610.722**), muestra el **Tablero de 8 Factores Encendidos/Apagados** y señala con la alerta **`✂️ Candidata a QUITAR 1º FV`** cuáles carreras permiten eliminar al 1º favorito para reducir el costo del cuadro.

### Tabla Comparativa Verificada (51 Reuniones 2026 — Regla Oficial INH de 1 solo pago por cuadro)

| Hipódromo | Nivel de Cuadro | Comb. Promedio | Cuadros con 6 de 6 🏆 | Cuadros con 5 de 6 🎯 | Total Invertido 2026 | Total Cobrado (1 pago INH) | Ganancia Neta Real |
|---|---|---|---|---|---|---|---|
| **La Rinconada** *(32 reun.)* | **1. Económico** | 144 comb. | **2 con 6** (`6.3%`) | 9 con 5 | Bs. 107.280 | Bs. 82.773 | -Bs. 24.507 |
| **La Rinconada** *(32 reun.)* | **2. Medio** | 432 comb. | **4 con 6 (`12.5%`)** | 10 con 5 | Bs. 321.840 | Bs. 463.943 | **+Bs. 142.103** |
| **La Rinconada** *(32 reun.)* | **3. Blindado** | 1.144 comb. | **6 con 6 (`18.8%`)** | 8 con 5 | Bs. 858.000 | Bs. 872.694 | **+Bs. 14.694** |
| **La Rinconada** *(32 reun.)* | **👑 4. Premium** | 1.815 comb. | **8 con 6 (`25.0%`)** | **15 con 5** | Bs. 1.363.060 | **Bs. 10.894.158** | **+Bs. 9.531.098** |
| **La Rinconada** *(32 reun.)* | **💣 5. Cazador** | 1.821 comb. | **8 con 6 (`25.0%`)** | 14 con 5 | Bs. 1.363.980 | **Bs. 11.720.289** | **+Bs. 10.356.309** |
| **Valencia** *(19 reun.)* | **1. Económico** | 144 comb. | **3 con 6** (`15.8%`) | 5 con 5 | Bs. 65.520 | Bs. 38.206 | -Bs. 27.314 |
| **Valencia** *(19 reun.)* | **2. Medio** | 432 comb. | **6 con 6 (`31.6%`)** | 6 con 5 | Bs. 196.560 | Bs. 941.595 | **+Bs. 745.035** |
| **Valencia** *(19 reun.)* | **3. Blindado** | 1.152 comb. | **10 con 6 (`52.6%`)** | 5 con 5 | Bs. 524.160 | **Bs. 2.299.064** | **+Bs. 1.774.904** |
| **Valencia** *(19 reun.)* | **👑 4. Premium** | 1.448 comb. | **12 con 6 (`63.2%`)** | 4 con 5 | Bs. 659.520 | **Bs. 2.500.427** | **+Bs. 1.840.907** |
| **Valencia** *(19 reun.)* | **💣 5. Cazador** | 1.328 comb. | **12 con 6 (`63.2%`)** | 4 con 5 | Bs. 614.160 | **Bs. 2.500.427** | **+Bs. 1.886.267** |
| **TOTAL 2026** *(51 reun.)* | **1. Económico** | 144 comb. | **5 cuadros con 6 (`9.8%`)** | 14 con 5 | Bs. 172.800 | Bs. 120.979 | -Bs. 51.821 |
| **TOTAL 2026** *(51 reun.)* | **2. Medio** | 432 comb. | **10 cuadros con 6 (`19.6%`)** | 16 con 5 | Bs. 518.400 | **Bs. 1.405.538** | **+Bs. 887.138** |
| **TOTAL 2026** *(51 reun.)* | **3. Blindado** | ~1.147 comb. | **16 cuadros con 6 (`31.4%`)** | 13 con 5 | Bs. 1.382.160 | **Bs. 3.171.758** | **+Bs. 1.789.598** |
| **TOTAL 2026** *(51 reun.)* | **👑 4. Premium** | ~1.678 comb. | **20 cuadros con 6 (`39.2%`)** | **19 con 5** | Bs. 2.022.580 | **Bs. 13.394.585** | **+Bs. 11.372.005** |
| **TOTAL 2026** *(51 reun.)* | **💣 5. Cazador** | ~1.637 comb. | **20 cuadros con 6 (`39.2%`)** | 18 con 5 | Bs. 1.978.140 | **Bs. 14.220.716** | **+Bs. 12.242.576** |

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
  1. **Variante 1 (`Sin 1º FV en 3 Bravas: 2 Dobles Líneas + 1 Trilogía + 3 Carreras del 2º al 5º/6º FV`):** Mantiene al `1º FV` únicamente en las 2 o 3 carreras de Lote Noble / Menor Lote (`1º+2º` y `1º+2º+3º`), y en las 3 carreras de Lote Explosivo / Sin Favorito (`< 40% FV` o `10+ ejemplares en 1.100m–1.300m`) **elimina al `1º FV`** y juega del **`2º al 5º/6º del FV`** (`2 × 2 × 3 × 4 × 4 × 5 = 960 comb.`), acertando 4 de las 13 reuniones de más de Bs. 1.000.000 (`R41` de Bs. 9,36M, `R34` de Bs. 3,71M, `R24` de Bs. 3,25M y `R39` de Bs. 1,54M).
  2. **Variante 2 (`Top 5 FV Abierto`):** Para domingos donde ningún favorito supera el 52% y los 6 ganadores están dentro del Top 5 del FV (como en `R41`, `R34` y `R24`).
  3. **Variante 3 (`Bomba con TODOS / Stud / Yunta 0% FV`):** Permite incluir todos los inscritos o encender manualmente cualquier ejemplar de `0% Sin FV` por Stud, Yunta o Corazonada.

---

## 8. Radiografía de los 35 Ganadores `6º–8º FV` y `0% Sin FV` + Clasificación de Carreras en 2 Fases

### A. Hallazgos sobre los 35 Ganadores Profundos (`6º–8º FV` y `0% Sin FV` en La Rinconada)
1. **Factor Peso / Descargo de Aprendiz (`50 kg a 53.5 kg`):**
   - **El `74.3%` de todos los batacazos de La Rinconada (26 de 35) y el `76.9%` de Valencia (10 de 13) corrieron livianos (`50 a 53.5 kg`).**
   - **11 de los 35 batacazos (`31.4%`) llevaban peso pluma de `50 kg a 51 kg`**, incluyendo los que dispararon los mayores dividendos del año: `#1 Mia Sophia (51kg, 0% FV)` en `R28` (`Bs. 31,9M`), `#4 Solana (50kg, 7º FV)` en `R35` (`Bs. 3,2M`), `#5 The Fieldher Jr (50kg, 6º FV)` en `R37` (`Bs. 2,2M`), `#2 Fabi Luna (51kg, 6º FV)` en `R14` (`Bs. 610k`), `#2 Spring Training (50kg, 0% FV)`, `#5 Sue Storm (50kg, 0% FV)`, `#8 Rey Joaquín (50kg, 0% FV)`, `#9 El Chema (50.5kg, 6º FV)`.
2. **Entrenadores y Jinetes que más repiten en los ganadores de `6º–8º FV` y `0% Sin FV`:**
   - **Entrenadores:** `Carlos Luis Uzcátegui` (**4 ganadores de `6º–8º FV`**: `#10 Shaword`, `#7 Sarasarita`, `#4 Solana`, `#5 Meheble`), `Luis Peraza` (**3 ganadores de `6º–7º FV`**), `Juan Carlos García` (**2 ganadores el mismo domingo en `R28` de Bs. 31,9M**: `#1 Convergente 6º FV` y `#1 Mia Sophia 0% FV`) y `Aldo Traversa` (**2 ganadores de `0% Sin FV`**: `#5 Sue Storm` y `#1 Hatshepsut` en `R26` de Bs. 5,3M).
   - **Jinetes:** `Félix Márquez` (**4 batacazos**: dos `0% FV` y dos `7º–8º FV`), `Samuel Yánez` (**3 batacazos con 50kg**) y `José Calicho` (**2 batacazos millonarios con 50–51kg**).
3. **Llamados con `0.0%` de ganadores `0% Sin FV` (135 carreras auditadas):**
   - En **Ganadores de 1**, **Reclamo**, **Ganadores de 3 o 4**, **Clásicos y Copas** y lotes de **3 y 4 años** jamás ganó un ejemplar con `0% Sin FV` en La Rinconada.
   - Los `0% Sin FV` se concentran en **Perdedores / Debutantes (`45.5%`)** y **Caballos de `5 y más años` / `Ganadores de 5+` (`45.5%`)**.

### B. Sistema de Clasificación de Carreras en 2 Fases (`classifyPreFvRaceRisk` + Ajuste Asíncrono FV)
1. **Fase 1 (Pre-FV, apenas se sube el PDF de inscritos antes de existir pronósticos):**
   - **`🟢 Fase 1 Noble`:** `Distancia ≥ 1.500m` (`0%` batacazos), o llamados de `Reclamo`, `Ganadores de 1` (`3 y 4 años`) y `Clásicos` en `≥ 1.400m` o con `Lote ≤ 8`.
   - **`🟡 Fase 1 Intermedia`:** `1.300m–1.400m` con `9–10 ejemplares` o `6 y más años`.
   - **`🔴 Fase 1 Explosiva`:** `Perdedores / Debutantes`, `Ganadores de 2` o `5 y más años` en `1.100m–1.300m` o con `10 a 14 ejemplares`.
2. **Fase 2 (Post-FV, actualización dinámica a medida que se publican pronósticos):**
   - Confirma **Doble Línea (`1º+2º`)** cuando hay corte limpio (`1º ≥ 44%, 2º ≥ 23%, 3º < 11%`), **Trilogía (`1º–3º`)** cuando los 3 primeros superan `19.5%` con `4º < 13%`, y abre a **5 o 6 caballos del FV (o `2º al 6º FV sin el 1º`)** en las carreras de Fase 1 Explosiva o con `1º FV < 40%`.

---

## 9. Auditoría Exclusiva de las Válidas del 5y6 (`192 Válidas` en Caracas y `114` en Valencia): Cuántas veces se encendió cada Alerta (`ON`) y Cuándo Gana Fuera de la Trilogía (`4º FV o peor`)

Al aislar **únicamente las carreras válidas para el 5y6** (excluyendo las carreras no válidas):
- **En La Rinconada (`192 válidas` en 32 reuniones):**
  - **Ganó dentro de la Trilogía (`1º, 2º o 3º FV`):** `142 de 192` (**`74.0%`**).
  - **Ganó FUERA de la Trilogía (`4º FV o peor`):** **`50 de 192` (`26.0%`)**, repartidas así:
    - `4º o 5º del FV`: **23 válidas** (`12.0%`).
    - `6º, 7º u 8º del FV`: **21 válidas** (`10.9%`).
    - `0% Sin FV`: **6 válidas** (`3.1%`).
- **En Valencia (`114 válidas` en 19 reuniones):**
  - **Ganó dentro de la Trilogía (`1º, 2º o 3º FV`):** `94 de 114` (**`82.5%`**).
  - **Ganó FUERA de la Trilogía (`4º FV o peor`):** **`20 de 114` (`17.5%`)** (`10` en `4º–5º FV`, `2` en `6º–8º FV` y `8` en `0% Sin FV`).

### A. Efectividad de cada Chip en `ON` en las 192 Válidas de La Rinconada

| Chip / Indicador en el Tablero | En cuántas de las 192 Válidas estuvo `ON` | Ganó la Trilogía (`1º–3º FV`) | Ganó FUERA de la Trilogía (`4º FV o peor`) | Desglose de los Ganadores Fuera de la Trilogía |
|---|---|---|---|---|
| **🟢 `🔒 Corte Limpio` (Indicador de Seguridad)** | **47 de 192** (`24.5%`) | **38 (`80.9%`)** | **Solo 9 (`19.1%`)** | `4º–5º`: 3 · `6º–8º`: 4 · `0%`: 2 |
| **🔴 `📏 Tiro Corto (≤ 1.300m)`** | 141 de 192 (`73.4%`) | 102 (`72.3%`) | **39 (`27.7%`)** | `4º–5º`: 14 · **`6º–8º`: 20 (de 21!)** · `0%`: 5 |
| **🔴 `🐎 Lote Grande (≥ 10 ej.)`** | 106 de 192 (`55.2%`) | 76 (`71.7%`) | **30 (`28.3%`)** | `4º–5º`: 14 · `6º–8º`: 12 · `0%`: 4 |
| **🟠 `🏷️ Lote Riesgo (Perdedores / Gan.2 / 5+a)`** | 92 de 192 (`47.9%`) | 63 (`68.5%`) | **29 (`31.5%`)** | `4º–5º`: 11 · `6º–8º`: 14 · `0%`: 4 |
| **🟣 `🟣 Sin Favorito (1º FV < 40%)`** | 67 de 192 (`34.9%`) | 45 (`67.2%`) | **22 (`32.8%`)** | **`4º–5º`: 12** · `6º–8º`: 10 · **`0%`: 0** |
| **🟠 `🟠 Falso Fijo (48.5%–55.5% FV)`** | 26 de 192 (`13.5%`) | 18 (`69.2%`) | **8 (`30.8%`)** | `4º–5º`: 2 · `6º–8º`: 4 · `0%`: 2 |
| **⚡ `⚡ Cola 5º–8º FV Viva (≥ 3.5%)`** | 126 de 192 (`65.6%`) | 89 (`70.6%`) | **37 (`29.4%`)** | `4º–5º`: 18 · `6º–8º`: 16 · `0%`: 3 |

### B. La Ley de Acumulación de Chips `ON` (El Descubrimiento Clave en las 192 Válidas)

Cuando contamos **cuántos de los 6 chips de peligro están encendidos (`ON`) al mismo tiempo** en una misma válida de La Rinconada, aparece la frontera exacta entre una carrera segura y una carrera de batacazo:

| Cantidad de Chips de Peligro en `ON` en la Válida | Cantidad de Válidas (de 192) | Ganó la Trilogía (`1º, 2º o 3º FV`) | Ganó FUERA de la Trilogía (`4º FV o peor`) | Desglose Fuera del Top 3 | Conclusión Operativa |
|---|---|---|---|---|---|
| **`0 chips ON`** | 4 válidas | **4 (`100.0%`)** | **0 (`0.0%`)** | `0` | **🟢 Segura (Jugar 1 o 2)** |
| **`1 chip ON`** | 26 válidas | **21 (`80.8%`)** | **5 (`19.2%`)** | `4º–5º`: 3 · `6º–8º`: 1 · `0%`: 1 | **🟢 Segura (Jugar 2 o 3)** |
| **`2 chips ON`** | 44 válidas | **38 (`86.4%`)** | **6 (`13.6%`)** | `4º–5º`: 3 · `6º–8º`: 2 · `0%`: 1 | **🟢 Segura (Jugar 2 o 3)** |
| **Subtotal `0 a 2 chips ON`** | **74 válidas** | **63 de 74 (`85.1%`)** | **Solo 11 (`14.9%`)** | Solo 3 de `6º–8º` en todo el año | **En 0–2 chips ON no se buscan batacazos.** |
| **`3 chips ON`** | 47 válidas | 32 (`68.1%`) | **15 (`31.9%` — El Doble)** | **`4º–5º`: 9** · `6º–8º`: 5 · `0%`: 1 | **🟠 Alerta de `4º y 5º FV`** |
| **`4 o más chips ON`** | 71 válidas | 47 (`66.2%`) | **24 (`33.8%` — 1 de cada 3)** | `4º–5º`: 8 · **`6º–8º`: 13** · **`0%`: 3** | **🔴 Alerta de `6º–8º FV` y `0% Sin FV`** |
| **Subtotal `3 o más chips ON`** | **118 válidas** | 79 de 118 (`66.9%`) | **39 de 50 (`78.0%` de todas las sorpresas)** | **18 de los 21 ganadores `6º–8º FV` salieron aquí** | **Aquí se activa `✂️ Candidata a QUITAR 1º FV`.** |




