# DesafioHipico — Instrucciones para agentes de IA

## Comandos del proyecto

```bash
# Desarrollo local
npm run dev

# Verificar tipos
npx tsc --noEmit

# Build
npm run build
```

## Git — Push a producción

Las credenciales de GitHub están guardadas en `~/.git-credentials` con permisos `600` (solo el usuario del sistema puede leerlo). El token **nunca** aparece en el remote URL ni en archivos del repositorio.

**Protocolo obligatorio antes de hacer push:**

1. NO pedir el token al usuario — ya está configurado.
2. NO poner el token en el remote URL.
3. Usar siempre:

```bash
git push origin main
```

El credential helper (`git config --global credential.helper store`) lo resuelve automáticamente.

Si el push falla por autenticación, verificar:
```bash
ls -la ~/.git-credentials       # debe existir con permisos -rw-------
git config --global credential.helper  # debe decir "store"
```

**Nunca** regenerar ni pedir nuevamente el token sin antes verificar los pasos anteriores.

## Stack

- Next.js 15 (App Router)
- MongoDB (Mongoose)
- Resend (email / broadcasts)
- TypeScript

## Hipódromos soportados

| Clave | Hipódromo | Formato PDF |
|---|---|---|
| `inh` | La Rinconada | INH — bloques `Carrera Programada:` |
| `hinava` | Nacional de Valencia | HINAVA — bloques `REUNION:` |

## Modelo de negocio actual (octubre 2026)

**Pase Nacional** — único producto activo de acceso premium:
- Precio: Bs. 6.000 / semana
- Acceso: pronósticos completos + FV + diagnóstico por carrera para La Rinconada
- Futuro: se creará "Pase Americanas" cuando arranque esa temporada

**Golds** — en desuso como producto de venta. El sistema técnico sigue funcionando internamente pero NO se ofrecen ni promocionan a los usuarios. No crear contenido ni house ads que mencionen Golds.

## Inteligencia del Factor de Victoria — Informes Anuales Permanentes

Los hallazgos estadísticos, leyes por distancia/tamaño de lote, umbrales (`+40%`, `+50%`, `+60%`) y el backtesting del 5y6 viven en:

- `docs/fv-intelligence/INFORME_FV_2026.md` (y un archivo nuevo por cada año: `INFORME_FV_2027.md`, etc.)
- Servicio en vivo (100% solo lectura): `src/services/fvAccuracyService.ts` (`getFvLabAnalytics`)
- Vista Admin: `/admin` → pestaña `🧪 Laboratorio FV` (`src/app/admin/_components/LaboratorioFvTab.tsx`)

**Reglas obligatorias para agentes:**
1. **NUNCA borrar** los archivos dentro de `docs/fv-intelligence/`.
2. **Actualizar, no sobrescribir años anteriores:** Debido al parón hípico de diciembre en Venezuela, cada temporada anual se archiva en su propio documento (`INFORME_FV_<AÑO>.md`) y el Laboratorio FV permite filtrar por año (`?year=2026`, etc.).
3. Toda consulta analítica del Laboratorio FV debe ser estrictamente de solo lectura (`.lean()`), sin modificar ni corromper documentos de `Meeting`, `Race`, `Entry` o `Forecast`.

---

## Sistema de Publicidad — Arquitectura y Metodología

### Archivos clave
| Archivo | Rol |
|---|---|
| `src/models/SponsorCampaign.ts` | Modelo Mongoose — campos: slug, brand, targetUrl, slots, active, isHouseAd, creative, startsAt, endsAt |
| `src/services/adService.ts` | `getActiveCampaign(slot)` — selección aleatoria entre campañas activas del slot |
| `src/components/AnimatedSponsorBanner.tsx` | Banner animado principal — recibe prop `ad` (ISponsorCampaign) + `isPaidUser?: boolean` |
| `src/app/admin/_components/CampaignTab.tsx` | Admin UI — plantillas house ads + 1xBET |
| `src/app/api/admin/sponsors/route.ts` | API CRUD de campañas |
| `src/app/api/ads/impression/route.ts` | Tracking de impresiones |
| `src/app/api/go/sponsor/route.ts` | Redirect de clicks con tracking |

### Slots disponibles
| Slot ID | Página | Tipo |
|---|---|---|
| `retrospectos_inline` | /retrospectos | ISR 1h — selección server-side |
| `revista_inline` | /revista/[id] | Dinámica — selección server-side |
| `resultados_inline` | /resultados | Dinámica |
| `traqueos_inline` | /traqueos | ISR 5m |
| `header_leaderboard` | Global | Reservado para cliente premium |
| `sticky_mobile` | Global | Reservado para cliente premium |

### Reglas del sistema house ads
- `isHouseAd: true` → el banner se oculta automáticamente cuando `isPaidUser=true` (usuario con Pase activo).
- En `AnimatedSponsorBanner`, si `isHouseAd && isPaidUser` → retorna `null` sin renderizar.
- Las páginas de pago (pronosticos) NO muestran house ads a usuarios con pase — se pasa `isPaidUser={passUnlocked || isPrivileged}`.
- Retrospectos y Revista son públicas — house ads sí aparecen para usuarios sin pase.

### Logo dinámico (AnimatedSponsorBanner)
- Si `creative.logoUrl` → mostrar imagen.
- Si brand es "1xBET" o slug empieza con "1xbet" → mostrar `OneXBetWordmark` SVG.
- En caso contrario → mostrar inicial del brand en badge de color.

### Rotación A/B
- `getActiveCampaign()` selecciona aleatoriamente entre TODAS las campañas activas del slot.
- Para A/B real por usuario: hay que pasar todas las campañas activas al cliente y rotar en `useEffect`. Pendiente — actualmente la rotación es por render/caché.
- `/retrospectos` tiene ISR 1h → todos ven la misma variante durante la ventana de caché. Aceptado temporalmente.

### Plantillas pre-cargadas (Admin → Campañas → Nueva Campaña)
**House Ads (Publicidad Propia):**
- `house-retro-pase-a/b` → Retrospectos — empuja al Pase Nacional
- `house-revista-pase-a/b` → Revista — momento pre-carrera
- `house-result-pase-a/b` → Resultados — momento post-carrera
- `house-traqueos-pase` → Traqueos — audiencia analista avanzada

**Sponsor externo:**
- `1xbet-a/b/c` → variantes hipismo, LVBP y código exclusivo

---

## Diagnóstico FV en Pronósticos — Arquitectura

**Archivo:** `src/app/pronosticos/page.tsx` — función `RacePanel` → `useMemo raceDiag`

### Qué computa raceDiag
Retorna: `{ riskChips, favorChips, dangerCount, fvScope, recommendation, legendTitle }`

- `riskChips[]` — chips negativos con stat real: tiro corto, lote riesgoso, sin favorito, falso fijo, cola viva
- `favorChips[]` — chips positivos: tiro largo, noble, moderador de edad, corte limpio, trilogía
- `fvScope` — cuántos caballos FV considerar: 2-3 / 4-5 / 6
- `recommendation` — texto de acción final para el usuario
- `legendTitle` — título del bloque: "X riesgos · Y a favor"

### Regla Noble + Risky simultáneo
Si `isNobleLote && isRiskyLote` → NO se anula ninguno. El noble pasa a `favorChips` como "Moderador de edad" con su stat real (92.6% Top 3). El risky sigue en `riskChips`. El balance final refleja ambos.

### Visibilidad
El bloque de diagnóstico solo se renderiza para `passUnlocked || isPrivileged`. No cambia con los house ads.

### FV display
Se muestran siempre los primeros 6 (`.slice(0,6)`). El texto `fvScope` guía al usuario sobre cuántos usar activamente. No se cortan a 5 porque el 6° importa en carreras de alto riesgo.

---

## Tareas pendientes para la próxima sesión

1. **Activar las house ads desde Admin**: ir a `/admin` → Campañas → Nueva Campaña → seleccionar plantilla de Publicidad Propia → guardar. Hacer esto para cada slot (retro-a, retro-b, revista-a, revista-b, result-a, result-b, traqueos).
2. **Rotación A/B equitativa en Retrospectos**: cuando haya tráfico suficiente para medir, implementar selección client-side en `AnimatedSponsorBanner` recibiendo array de campañas en vez de una sola.
3. **Pase Americanas**: cuando arranque la temporada americana, crear el producto y las house ads correspondientes.
4. **header_leaderboard y sticky_mobile**: reservados para primer cliente premium externo.

