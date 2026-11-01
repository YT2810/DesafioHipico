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

### Slots disponibles (todos montados y funcionales)
| Slot ID | Página | Tipo |
|---|---|---|
| `retrospectos_inline` | /retrospectos | ISR 1h — selección server-side |
| `revista_inline` | /revista/[id] | Dinámica — selección server-side |
| `resultados_inline` | /resultados | Dinámica — prop `sponsorBanner` a ResultadosClient |
| `traqueos_inline` | /traqueos + /traqueos/valencia | ISR 5m — prop `sponsorBanner` a TraqueosClient |
| `header_leaderboard` | Global (layout) | Client-side fetch `/api/ads/active` via GlobalSponsorBanner |
| `sticky_mobile` | Global (layout, solo móvil) | Igual — barra inferior dismissible, `sm:hidden` |

### Reglas del sistema de ads
- **Backfill:** `getActiveCampaign()` prioriza campañas pagas (`isHouseAd: false`). House ads solo sirven en slots SIN sponsor activo — al vender el slot desaparecen solas.
- **House ads:** `isHouseAd: true` → ocultas a `session.user.hasActivePass` o roles admin/staff. Navegan en la misma pestaña (no `_blank`).
- **hasActivePass** se expone vía JWT en `auth.ts` usando `hasActiveNationalPass(userId)` — cubre pase semanal Y mensual. `session.user.passUnlocked` NO existe (es por-reunión).
- **Destino house ads:** `/pase` — landing dedicada de checkout (TopUpModal en modo `inline`). NUNCA apuntar a `/pronosticos` — el usuario tendría que buscar el botón de pago.
- `/api/ads/active?slots=a,b` — endpoint client-side para slots globales; evita que el layout haga llamadas DB y la selección sea por usuario, no por caché ISR.
- Banners globales ocultos en `/admin`, `/staff`, `/auth`, `/pase`.

### Logo dinámico (AnimatedSponsorBanner)
- Si `creative.logoUrl` → mostrar imagen.
- Si brand es "1xBET" o slug empieza con "1xbet" → mostrar `OneXBetWordmark` SVG.
- En caso contrario → mostrar inicial del brand en badge de color.

### Rotación A/B
- `getActiveCampaign()` selecciona aleatoriamente entre TODAS las campañas activas del slot.
- Para A/B real por usuario: hay que pasar todas las campañas activas al cliente y rotar en `useEffect`. Pendiente — actualmente la rotación es por render/caché.
- `/retrospectos` tiene ISR 1h → todos ven la misma variante durante la ventana de caché. Aceptado temporalmente.

### House Ads — 9 campañas (botón "🏠 Crear House Ads" las crea todas)
Copy mezclado dolor/beneficio, todas → `/pase`:
- `house-retro-pase-a` → "¿Leíste el retrospecto y aún no sabes por quién ir?"
- `house-retro-pase-b` → "¿Cuántos 'fijos' de grupo te han tumbado la combinada?"
- `house-revista-pase-a` → "El FV te dice cuándo cerrar en 2 y cuándo abrir a 5"
- `house-revista-pase-b` → "¿Sigues jugando por corazonada?"
- `house-result-pase-a` → "El ganador estaba en el Top 3 del FV. ¿Lo tenías?"
- `house-result-pase-b` → "El FV marcó esta carrera como Alerta antes de correrse"
- `house-traqueos-pase` → "Ya tienes los trabajos — te falta el orden de llegada"
- `house-global-header` → "79.9% de los ganadores salieron del Top 3 del FV"
- `house-global-sticky` → "El FV de esta jornada ya está listo. ¿Vas a jugar a ciegas?"

**Sponsor externo (templates):** `1xbet-a/b/c` → hipismo, LVBP, código exclusivo

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

1. **Crear las house ads**: Admin → Campañas → botón "🏠 Crear House Ads" — un click las crea todas (9).
2. **Takeover Web**: único formato del media kit sin implementar — requiere slot `takeover` + skin global en layout.
3. **Logo en Gaceta PDF**: `GacetaPrintTemplate` solo tiene DHLogo — falta `sponsorLogoUrl`.
4. **Rotación A/B equitativa en Retrospectos**: ISR 1h congela la variante — evaluar migrar a fetch client-side como los slots globales.
5. **Pase Americanas**: cuando arranque la temporada americana, crear el producto y las house ads.

