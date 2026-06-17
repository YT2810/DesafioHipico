# CONTEXT.md — Desafío Hípico
## Fuente de verdad para LLMs y desarrolladores

> **Propósito:** Este archivo es lo primero que debe leer cualquier LLM o desarrollador antes de tocar el proyecto.
> Contiene toda la lógica de negocio, decisiones de arquitectura, estado actual y reglas críticas.
> **Leer completo antes de escribir una sola línea de código.**
>
> **Última actualización:** Jun 2026

---

## 1. Qué es el producto

**Desafío Hípico** es un marketplace de pronósticos hípicos, actualmente enfocado en las carreras de los hipódromos venezolanos (La Rinconada en Caracas y el Hipódromo de Valencia). El modelo es freemium:

- **Handicappers** (expertos en carreras) publican sus pronósticos en la plataforma
- **Usuarios** consumen esos pronósticos pagando con Golds (créditos internos)
- **La plataforma** cobra 30% de cada transacción (revenue share configurable por handicapper)
- **Pago** vía Pago Móvil venezolano (BDV), con soporte futuro para más métodos

El producto es **mobile-first**, pensado para usuarios venezolanos con acceso preferente a Telegram y WhatsApp. Está en producción en [desafiohipico.com](https://www.desafiohipico.com).

### Tono y contexto cultural

El mundo hípico venezolano tiene jerga propia. Los usuarios son aficionados que van al hipódromo los domingos y siguen a sus expertos favoritos. La plataforma debe sentirse familiar para ellos:
- "Fijo del día" = caballo con alta probabilidad de ganar según el experto
- "La Línea" = la primera preferencia del handicapper (su pick más fuerte)
- "Dividendos" = los pagos por apuesta (equivalente a odds)
- "Inscritos" = los caballos participantes en una carrera (programa oficial)
- "Válidas" = las últimas carreras de una jornada (las que entran en el juego 5 y 6)
- "Reunión" = jornada completa de carreras (normalmente los domingos)

### Visión de escalabilidad (IMPORTANTE para LLMs)

El proyecto **NO es solo Venezuela ni solo hípica**. La arquitectura debe soportar:

| Dimensión | Alcance actual | Alcance futuro |
|-----------|---------------|----------------|
| **Mercado** | Venezuela (La Rinconada + Valencia) | Colombia, Panamá, USA, otros |
| **Deporte** | Carreras de caballos | Béisbol, fútbol, loterías, otros nichos |
| **Pago** | Pago Móvil BDV (Venezuela) | Zinli, Binance Pay, transferencia USD, tarjeta |
| **Idioma** | Español | Multiidioma |

**Regla para LLMs:** Nunca hardcodear lógica específica de Venezuela o de hípica en capas genéricas. Los modelos `Meeting`, `Race`, `Forecast` son genéricos por diseño.

---

## 2. Stack técnico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Framework | Next.js 15 App Router | Turbopack en dev, NO usar `pages/` |
| Base de datos | MongoDB Atlas + Mongoose 8 | Conexión singleton en `src/lib/mongodb.ts` |
| Autenticación | Auth.js v5 beta (NextAuth) | `src/auth.ts` — NO usar v4 |
| Estilos | Tailwind CSS v4 | Sin `tailwind.config.js`, config en CSS |
| Lenguaje | TypeScript 5 | Strict mode — `npx tsc --noEmit` debe dar 0 errores |
| Email | Resend API | Magic links propios, SIN adapter de NextAuth |
| PDF | pdf-parse v1.1.1 (CJS) | Solo server-side. Importar desde `src/lib/pdf-parse.js` |
| IA | Gemini 2.0 Flash via OpenRouter | OCR de imágenes + extracción de pronósticos de texto |
| Deploy | Vercel (activo) | Node.js 20+, auto-deploy en push a `main` |
| Iconos | SVG inline (NO lucide-react) | lucide-react NO está instalado en el proyecto |

### Regla crítica para Next.js 15
En Next.js 15, los `params` de rutas dinámicas son **Promise** y deben awaitearse:
```typescript
// CORRECTO en Next.js 15
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
// INCORRECTO (Next.js 13/14 — NO usar)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
```

---

## 3. Modelos de datos

### User (`src/models/User.ts`)
```typescript
{
  identifier: string        // teléfono o ID interno
  alias: string             // nombre de usuario
  email?: string
  phone?: string
  legalId?: string
  googleId?: string
  telegramId?: string
  fullName?: string
  identityDocument?: string // cédula con prefijo: V-12345678
  phoneNumber?: string      // +584120000000
  roles: ('customer'|'handicapper'|'staff'|'admin')[]
  balance: {
    golds: number           // créditos internos (1 Gold = $0.25 USD)
    diamonds: number        // reservado para futuro
  }
  meetingConsumptions: [{
    meetingId: string
    freeUsed: number        // cuántas gratis usó (max FREE_RACES_PER_MEETING=2)
    unlockedRaceIds: string[]
  }]
  followedHandicappers: ObjectId[]
}
```
**⚠️ Bug histórico (corregido):** Algunos usuarios tenían `balance: 0` (número) en vez de `{golds:0}`. Migración ejecutada con `scripts/fix-balance.mjs`. Las APIs de aprobación usan pipeline `$cond` para documentos legacy.

### Meeting (`src/models/Meeting.ts`)
```typescript
{
  trackId: ObjectId         // → Track
  date: Date
  meetingNumber: number
  status: 'scheduled'|'active'|'finished'|'cancelled'
  summaryVideoUrl?: string  // URL de embed YouTube del video resumen del día
  metadata: Record<string, unknown>
}
```
**Nota importante:** El `status` puede quedar en `scheduled` aunque ya tenga resultados cargados. La API `/api/resultados` filtra por carreras con `status: 'finished'`, no por `meeting.status`. Desde Mar 2026, `results/save` actualiza el meeting a `active`/`finished` automáticamente al guardar resultados.

### Race (`src/models/Race.ts`)
```typescript
{
  meetingId: ObjectId
  raceNumber: number        // número dentro de la jornada (ej: 3)
  annualRaceNumber?: number // número anual INH (ej: 089)
  llamado?: number
  distance: number          // en metros
  scheduledTime: string
  prizePool: { bs: number; usd: number }
  conditions?: string
  surface?: 'dirt'|'turf'|'synthetic'
  games: GameType[]         // jugadas habilitadas en esta carrera
  payouts: IPayouts         // dividendos por tipo de juego
  timeSplits: ITimeSplit[]
  officialTime?: string
  status: 'scheduled'|'active'|'finished'|'cancelled'
}
// GameType: GANADOR | PLACE | EXACTA | TRIFECTA | SUPERFECTA | TRIPLE_APUESTA | POOL_DE_4 | CINCO_Y_SEIS | LOTO_HIPICO
```

### Entry (`src/models/Entry.ts`)
```typescript
{
  raceId: ObjectId
  horseId: ObjectId
  jockeyId: ObjectId
  trainerId: ObjectId
  dorsalNumber: number
  postPosition: number
  weight: number
  morningLineOdds?: number
  finalOdds?: number
  status: 'declared'|'confirmed'|'scratched'|'finished'
  result: {
    finishPosition?: number
    officialTime?: string
    distanceMargin?: string  // ej: "1 cuerpo", "Nariz"
    isScratched: boolean
    scratchReason?: string
  }
}
```

### Forecast (`src/models/Forecast.ts`)
```typescript
{
  handicapperId: ObjectId   // → HandicapperProfile
  raceId: ObjectId
  meetingId: ObjectId
  marks: [{
    preferenceOrder: 1|2|3|4|5
    horseName: string
    dorsalNumber?: number
    label?: 'Línea'|'Casi Fijo'|'Súper Especial'|'Buen Dividendo'|'Batacazo'
    note?: string
  }]
  isVip: boolean
  isPublished: boolean
  publishedAt?: Date
  source: 'manual'|'youtube'|'social_text'|'image_ocr'|'audio'
  uploadedByRole?: 'handicapper'|'staff'|'admin'
  result?: {
    evaluated: boolean
    evaluatedAt?: Date
    hit1st: boolean         // 1ª marca fue el ganador
    hit2nd: boolean         // ganador entre las 2 primeras marcas
    hit3rd: boolean         // ganador entre las 3 primeras marcas
    hitAny: boolean         // ganador en cualquier marca
  }
}
```

### HandicapperProfile (`src/models/HandicapperProfile.ts`)
```typescript
{
  userId: ObjectId
  pseudonym: string         // nombre público único
  contactNumber?: string    // WhatsApp
  bio?: string
  isActive: boolean
  isGhost: boolean          // true = perfil creado automáticamente por IA, sin usuario real
  claimedAt?: Date          // fecha en que un handicapper real reclamó el perfil ghost
  revenueSharePct: number   // default 70
  stats: {
    totalForecasts: number
    e1: number | null       // % acierto 1ª marca
    eGeneral: number        // % acierto cualquier marca
    // ... otros campos de stats precalculados
  }
}
```
**Ghost profiles:** Cuando la IA extrae pronósticos de redes sociales/YouTube y el handicapper no tiene cuenta, se crea un perfil ghost. Al reclamar: se linkea al usuario, se resetean stats previas a `claimedAt`.

### TopUpRequest, GoldTransaction, ExchangeRate, Notification, MagicToken
Ver `src/models/` — documentados en README.md.

---

## 4. Lógica de negocio crítica

### Freemium por reunión
- `FREE_RACES_PER_MEETING = 2` en `src/lib/constants.ts`
- Cada usuario tiene `meetingConsumptions[]` en su documento
- Al abrir una carrera: si `freeUsed < 2` → gratis, si no → descuenta 1 Gold
- **Permanente:** una vez desbloqueada, queda desbloqueada para ese usuario en esa reunión
- `staff`, `handicapper`, `admin` → acceso total gratuito
- Lógica en `src/services/forecastAccessService.ts`

### Flujo de recarga (Pago Móvil BDV)
1. Usuario abre `TopUpModal` → selecciona paquete (40/100/200/400 Golds)
2. Si no tiene perfil de facturación → paso de billing (nombre, cédula, teléfono)
3. Muestra destino: BDV 0102, V-16108291, 04122220545, monto en Bs (tasa BCV)
4. Usuario envía comprobante → `TopUpRequest` en `pending`
5. Admin aprueba en `/admin/topup` → `$inc balance.golds` + notifica

### Ingestión de pronósticos (flujo completo)
1. **PDF inscritos** (`/admin/ingest`): Parser INH (La Rinconada) o HINAVA (Valencia) → crea Meeting + Race + Entry + Horse + Person + Stud en MongoDB. Upsert idempotente.
2. **Pronósticos via IA** (`/admin/intelligence`): Staff pega texto (tweet, WhatsApp, transcripción) → Gemini 2.0 Flash extrae raceNumber/dorsal/nombre/etiqueta → tabla de revisión → upsert en Forecast + ExpertForecast.
3. **Resultados via imagen** (`/admin/ingest`, pestaña resultados): Gemini Vision extrae posiciones, tiempos, dividendos desde imagen INH → tabla editable → guarda en Race.payouts + Entry.result.

### Evaluación automática de pronósticos
Al guardar resultados (`POST /api/admin/results/save`):
1. Marca la carrera y sus entries como `finished`
2. Evalúa todos los `Forecast` de esa carrera: `hit1st`, `hit2nd`, `hit3rd`, `hitAny`
3. Recalcula stats del handicapper (`recalcHandicapperStats`)
4. Actualiza `meeting.status` a `active` o `finished` según % de carreras terminadas

### Métricas de handicappers
| Métrica | Descripción |
|---------|-------------|
| **E1** | % carreras donde la 1ª marca fue el ganador |
| **E1-2** | % donde el ganador estuvo entre las 2 primeras marcas |
| **E1-3** | % donde el ganador estuvo entre las 3 primeras marcas |
| **E-General** | % donde el ganador estuvo en cualquier marca |
| **ROI** | Retorno simulado apostando 100 Bs a la 1ª marca cada carrera |

Mínimo 5 carreras evaluadas para aparecer en rankings (anti-ruido).

### Cintillo dinámico (ExpertTickerBar)
- Componente sticky bajo el header en `/pronosticos`
- Se auto-fetcha de `/api/ticker/today?meetingId=X&raceId=Y`
- Muestra "fijos del día": handicappers con `Línea` como preferenceOrder=1 para la carrera activa
- Al cambiar de carrera, refetcha con el nuevo `raceId` — el cintillo se actualiza automáticamente
- Rellena con handicappers del ranking si no hay suficientes fijos

---

## 5. Páginas y rutas clave

### Públicas (sin auth requerida)
| Ruta | Descripción |
|------|-------------|
| `/` | Home: hero + CTA + top ranking + próximas reuniones |
| `/pronosticos` | Dashboard principal (auth gate en componente) |
| `/resultados` | Resultados de carreras por fecha con dividendos y video YouTube |
| `/programa/[meetingId]` | Inscritos con preview de pronósticos (blur/CTA para no registrados) |
| `/ranking` | Ranking público de handicappers |
| `/handicapper/[id]` | Perfil público de un handicapper |
| `/retirados` | Caballos retirados del día |

### Admin / Staff
| Ruta | Descripción |
|------|-------------|
| `/admin/ingest` | Ingestión PDFs INH + HINAVA + resultados via imagen |
| `/admin/intelligence` | Ingestor Gemini: pronósticos desde texto/imagen |
| `/admin/topup` | Aprobar/rechazar recargas |
| `/admin/handicapper-request` | Aprobar/rechazar solicitudes de handicapper |
| `/admin/users` | Gestión de usuarios y roles |
| `/admin/exchange-rate` | Tasa BCV manual |
| `/admin/meetings` | Video resumen de jornadas (YouTube embed) |
| `/staff/fuentes` | Catálogo de handicappers conocidos con estado en DB |

---

## 6. APIs — Referencia rápida

### Públicas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/meetings/upcoming?limit=N` | Próximas reuniones |
| GET | `/api/resultados?limit=5&page=1` | Resultados públicos con payouts |
| GET | `/api/exchange-rate` | Tasa BCV actual |
| GET | `/api/programa/[meetingId]` | Inscritos + preview forecasts |
| GET | `/api/handicapper/ranking` | Ranking global de handicappers |
| GET | `/api/handicapper/[id]/stats` | Stats on-the-fly de un handicapper |
| GET | `/api/ticker/today?meetingId=&raceId=` | Datos del cintillo de expertos |

### Requieren auth
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/forecasts?meetingId=&userId=` | Pronósticos + access map |
| POST | `/api/forecasts/unlock` | Desbloquear carrera |
| POST | `/api/topup` | Enviar solicitud de recarga |

### Admin / Staff
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/admin/ingest` | Procesar PDF INH |
| POST | `/api/admin/results/save` | Guardar resultados de carrera |
| POST | `/api/admin/intelligence/process` | Extraer pronósticos con Gemini |
| PATCH | `/api/admin/meetings/[id]/video` | Guardar URL YouTube del resumen |

---

## 7. Servicios clave

### `notificationService.ts`
**CRÍTICO:** Nunca crear documentos `Notification` directamente. Siempre usar este servicio.
```typescript
notifyUser(userId, payload)
notifyAdmins(payload)
notifyHandicappers(payload)
notifyFollowers(handicapperProfileId, payload)
notifyAllUsers(payload)     // en batches de 500
// Helpers wired en triggers:
notifyTopUpPending / notifyTopUpApproved / notifyTopUpRejected
notifyHandicapperRequestPending / Approved / Rejected
notifyFollowersNewForecast / notifyNewMeeting / notifyGoldLow
```

### `forecastAccessService.ts`
- `requestRaceAccess(userId, meetingId, raceId)` — consume quota o Gold, idempotente
- `getMeetingAccessMap(userId, meetingId, raceIds)` — solo lectura

### `forecastStatsService.ts`
- `recalcHandicapperStats(handicapperIds[])` — recalcula E1/E-General/etc. y persiste en HandicapperProfile

---

## 8. Autenticación

### Proveedores activos
| Proveedor | Estado |
|-----------|--------|
| Google OAuth | ✅ Funcional en producción |
| Magic Link (Resend) | ✅ Funcional (requiere dominio verificado en Resend) |
| Telegram Credentials | 🔧 Estructura lista, validación HMAC pendiente |

### Reglas críticas de Auth.js v5
- **NO usar `auth()` en middleware** — usar `getToken()` (edge compatible)
- **NO usar Email provider de NextAuth** — magic link propio via Resend + MagicToken model
- El callback `jwt` en `src/auth.ts` enriquece el token con `id`, `roles`, `balance`
- Usuario admin: `yolfry@gmail.com` — se auto-asigna rol `admin` en cada login

### Protección de rutas (`src/middleware.ts`)
```
/admin/*        → requiere rol admin o staff
/handicapper/*  → requiere rol handicapper o admin
/perfil         → requiere autenticación
/pronosticos    → auth gate en el componente (no en middleware)
```

---

## 9. Constantes importantes (`src/lib/constants.ts`)

```typescript
GOLD_RATE = { usd: 0.25, golds: 1 }  // 1 Gold = $0.25 USD
FREE_RACES_PER_MEETING = 2
GOLD_COST_PER_RACE = 1
GOLD_LOW_THRESHOLD = 3

PAYMENT_DESTINATION = {
  bank: 'Banco de Venezuela (BDV)',
  code: '0102',
  legalId: 'V-16108291',
  phone: '04122220545',
}

FORECAST_LABELS = ['Línea', 'Casi Fijo', 'Súper Especial', 'Buen Dividendo', 'Batacazo']
```

---

## 10. Decisiones de arquitectura tomadas

| Decisión | Razón |
|----------|-------|
| Magic link propio (sin adapter NextAuth) | NextAuth v5 beta requiere adapter para Email provider; implementamos el nuestro |
| `getToken()` en middleware (no `auth()`) | `auth()` no es compatible con edge runtime |
| Freemium por reunión (no por tiempo) | Más justo — si el usuario paga, la tiene para siempre |
| Tasa BCV manual | BCV no tiene API pública estable |
| Notificaciones in-app (no push) | Web Push requiere service worker; in-app es suficiente para MVP |
| Upsert idempotente en ingestión | Permite re-subir PDFs corregidos sin duplicar datos |
| SVG inline para iconos | lucide-react no está instalado; usar SVGs directamente en componentes |
| Resultados filtrados por Race.status, no Meeting.status | Meeting.status puede quedar desactualizado; Race.status es la fuente de verdad |

---

## 11. Errores conocidos y soluciones

| Error | Causa | Solución |
|-------|-------|---------|
| `Cannot create field 'golds' in element {balance: 0}` | Usuarios legacy con `balance: 0` | `scripts/fix-balance.mjs` ya ejecutado. APIs usan `$cond` |
| `Type ... does not satisfy RouteHandlerConfig` | params no awaiteado en Next.js 15 | `const { id } = await params` — params es Promise en Next.js 15 |
| `/resultados` no muestra datos aunque hay resultados | Filtraba por `meeting.status` que quedaba en `scheduled` | Fix: filtrar por `Race.distinct('meetingId', {status:'finished'})` |
| `Cannot find module 'lucide-react'` | lucide-react no está instalado | Usar SVGs inline en componentes |
| Magic links no llegan en producción | Dominio no verificado en Resend | Verificar dominio en resend.com/domains |
| Track no encontrado en API | Mongoose no registra el modelo Track automáticamente | Importar `'@/models/Track'` explícitamente en la ruta |

---

## 12. Estado del proyecto (Jun 2026)

### ✅ Completo y en producción
- Autenticación completa (Google + Magic Link + Telegram estructura)
- Ingestión de PDFs INH (La Rinconada) + HINAVA (Valencia) — parser híbrido regex+Gemini
- Ingestor Gemini: pronósticos desde texto, tweets, transcripciones
- Ingestor de resultados desde imágenes (OCR + tabla editable)
- Dashboard de pronósticos freemium (`/pronosticos`)
- Sistema de Golds + Pago Móvil BDV + aprobación manual
- Evaluación automática de pronósticos al guardar resultados
- Ranking público de handicappers con métricas E1/E-General
- Perfil público de handicapper con desglose por hipódromo
- Página de resultados públicos (`/resultados`) con dividendos completos + video YouTube
- Cintillo dinámico de expertos (sticky, actualiza por carrera)
- Sistema de notificaciones in-app (10 triggers, polling 120s)
- SEO: sitemap dinámico, OG images, robots.ts, JSON-LD, H1s optimizados
- Panel admin completo (topup, usuarios, roles, tasa BCV, video reuniones)
- `/revista/[meetingId]` — programa hípico clásico con historial, workouts, nationality
- `/traqueos` — página pública de trabajos de entrenamiento por hipódromo y fecha
- `/en-vivo` — resultados en tiempo real del día de carreras
- El Melli — chatbot de IA con economía Gold integrada
- 26+ handicappers rankeados con datos reales

### 🔧 Pendiente de desarrollo
- Manejo de retirados en stats (no penalizar si su caballo se retira)
- Upgrade MongoDB Atlas M0 → M10+ (capacidad de conexiones)
- Workout Gemini parser: reemplazar parser PDF/Excel por Gemini data entry
- Batch YouTube: procesamiento automatizado de pronósticos por pronosticador
- Automatizar ingesta: poller files.fm, parser workouts robusto
- Factor de Victoria ponderado por calidad del pronosticador
- Auditar economía Gold (emisión vs consumo)
- Dashboard admin KPIs reales (visitas, Golds in/out, retención)
- Notificaciones push (Telegram Bot o Web Push)
- Tasa BCV automática

---

## 13. Modelos adicionales (desde Mar 2026)

### WorkoutEntry (`src/models/WorkoutEntry.ts`)
```typescript
{
  horseId?: ObjectId          // opcional — link a Horse si se resuelve
  horseName: string           // nombre tal como aparece en el archivo fuente
  trackId: ObjectId           // → Track
  workoutDate: Date
  distance: number            // punto de corte en metros (no distancia total)
  workoutType: 'EP'|'ES'|'AP'|'galopo'
  splits: string              // texto raw: "23.1/46.3//58.4 COMODA"
  comment?: string            // observación adicional
  jockeyName?: string
  trainerName?: string
  daysRest?: number           // días desde última carrera
  rm?: number                 // récord del mes del hipódromo
  raceNumber?: string         // carrera asignada en el programa
  sourceFile?: string         // nombre del archivo de origen
}
```
**Lógica de splits:** parciales acumulados cada 200m. Pares: primer parcial a 200m. Impares: primer parcial a 300m. `/` = corte parcial, `//` = tiempo final en el punto de corte. Calificación después de `//`: COMODA, MUY COMODA, DURA, etc.

### Horse (`src/models/Horse.ts`)
```typescript
{
  name: string                // nombre completo incluyendo país: "CORONATION DAY (USA)"
  nationality?: string        // código país extraído: "USA", "ARG", "CHI"
  pedigree: { sire, dam, sireSire, damSire }
  birthDate?: Date
  color?: string
  gender?: 'male'|'female'|'gelding'
  registrationId?: string
  currentStudId?: ObjectId
  studHistory: [{ studId, studName, from, to? }]
}
```
**Regla de nationality:** Gemini extrae el sufijo `(PAIS)` del nombre durante la ingestión de PDFs. El nombre se guarda completo incluyendo el país (ej: `CORONATION DAY (USA)`), y `nationality` se guarda por separado.

**Deduplicación horses:** `upsertHorse` en `ingestService.ts` — si llega un horse sin país pero existe uno con `(PAIS)` en BD con el mismo nombre base, reutiliza el `_id` existente. Migración ejecutada Jun 2026: 18 duplicados mergeados.

### Track (`src/models/Track.ts`)
```typescript
{
  name: string
  location: string
  country: string             // default 'VE'
  code?: string               // 'C' = La Rinconada/Caracas, 'V' = Valencia
}
```
El campo `code` se usa para construir `annualRaceNumber` en formato `C089`, `V034`.

### JargonEntry (`src/models/JargonEntry.ts`)
Modelo para el jergario semántico del chatbot Melli. Cada entrada mapea vocabulario hípico venezolano a intents accionables.

### AgentLog (`src/models/AgentLog.ts`)
Auditoría de conversaciones del Melli: mensajes, intents detectados, acciones tomadas, gold cobrado, quejas.

### HandicapperAudio (`src/models/HandicapperAudio.ts`)
Audios de pronósticos de handicappers procesados.

---

## 14. Páginas nuevas (desde Mar 2026)

### `/revista/[meetingId]` — Programa hípico clásico
- Vista tipo "revista de turf" para el programa oficial de una jornada
- Por cada caballo muestra: dorsal, nombre + (PAIS) en azul, medication, implementos, entrenador, jinete (al lado del entrenador en ámbar)
- Historial de últimas 4 carreras con columnas: Fecha, CarreraAnual (C122/V034), Pos, Dist, T.1°, T.Ej, Diff vs 1°
- Diff vs 1° = `(ownTime - winnerTime) / 0.2` en cuerpos — calculado en API
- Trabajos (workouts): ventana 60 días, máx 4 por caballo, filtrados desde última carrera
- Workout matching: normaliza nombre quitando `(PAIS)` para buscar en `WorkoutEntry.horseName`
- API: `GET /api/revista/[meetingId]`

### `/traqueos` — Trabajos públicos
- Página pública de trabajos de entrenamiento organizados por hipódromo
- Sub-rutas: `/traqueos/valencia`, `/traqueos/[date]`
- Fuente: `WorkoutEntry` collection

### `/en-vivo` — En vivo
- Resultados del día de carreras en tiempo real
- Muestra carrera activa, resultados parciales, próximas carreras
- Polling cada 60 segundos (`REFRESH_MS = 60000`)
- Detecta y cierra automáticamente reuniones "stale" que quedaron en `active`
- Prefiere la reunión del día sobre reuniones viejas que quedaron activas

### `/retrospectos` — Historial de Revistas
- Lista de revistas pasadas para navegar el historial

### `/programa/[meetingId]` — Inscritos públicos (mejorado)
- Preview borroso de pronósticos para usuarios no registrados (CTA de registro)
- Botón de acceso directo a `/revista/[meetingId]`

---

## 15. Ingesta de datos — detalles técnicos

### Parser PDF híbrido (`src/services/ai/pdfGeminiParser.ts`)
- **Regex** para campos deterministas del header: raceNumber, annualRaceNumber, distance, scheduledTime, games, prizePool
- **Gemini** para datos complejos: horses (nombre + nationality + medication + implements), conditions, trainer, jockey
- Llamadas **paralelas** — una llamada Gemini por bloque de carrera (`splitIntoRaceBlocks`)
- Evita el problema de truncamiento de tokens al limitarse a 1 carrera por llamada
- Modelo: `google/gemini-2.5-flash` via OpenRouter (variable `OPENROUTER_MODEL`)

### `pdfProcessor.ts` — funciones exportadas
```typescript
export preprocessText(text: string): string
export parseMeeting(text: string): MeetingData
export splitIntoRaceBlocks(text: string): string[]
export parseRaceHeader(block: string): RaceHeaderData
```

### `ingestService.ts` — upsert idempotente
- `upsertHorse`: detecta horses duplicados por país antes de crear nuevo
- `annualRaceNumber`: nunca sobreescribe un valor existente si ya hay uno en BD
- Todos los upserts son idempotentes — se puede re-subir el mismo PDF sin duplicar datos

### Ingestor de resultados desde imagen (`/api/admin/results/extract`)
- Sube 1-3 imágenes (orden de llegada, dividendos, foto finish)
- Gemini Vision extrae: finishOrder, payouts, officialTime, timeSplits, raceNumber
- Tabla editable antes de confirmar → `POST /api/admin/results/save`
- **Modelo:** usa `OPENROUTER_MODEL` — actualmente en producción puede estar usando `google/gemini-2.0-flash-001` (DEPRECADO). Fix pendiente: cambiar a `google/gemini-2.5-flash`

### Parser de trabajos (`/admin/workouts`)
- Soporta PDF y `.xlsx` en el mismo upload
- PDF: usa posiciones X del renderer de pdf-parse para asignar columnas
- Excel: dinámico por contenido de headers
- El texto raw (splits + comment) se muestra tal cual en la revista, sin reformatear

---

## 16. El Melli — Chatbot de IA

### Arquitectura (3 pasos, LLM NUNCA ve datos de caballos)
1. **Clasificar intención** (doble vía):
   - Jergario semántico (`classifyIntent` → busca en `JargonEntry` collection)
   - Regex estructural (`detectAction` → patrones como "carrera 3", "5y6", "trabajos")
2. **DATA → DB directo** (`generateDirectResponse`): consulta MongoDB, templates con jerga, cobra Gold
3. **CONVERSACIÓN → LLM ligero** (solo si paso 2 no aplica): prompt de personalidad, contexto mínimo, max_tokens 200, gratis

### Economía Gold del Melli (`ACTION_COSTS` en `melli-logic.ts`)
| Acción | Costo |
|--------|-------|
| marks_1race | 3G |
| marks_all_day | 15G |
| pack_5y6 | 10G |
| workouts (todos de 1 carrera) | 2G |
| workouts_1horse | 1G |
| program | 1G |
| Conversación libre | 0G |

### Terminología hípica venezolana (crítica para prompts)
- **Válidas** = últimas 6 carreras del día (entran en el juego 5 y 6)
- **No válidas** = las carreras previas
- **1V, 2V** = 1ª, 2ª carrera válida del día (NO significa Valencia)
- **Fijo del día** = caballo más fuerte según el experto
- **La Línea** = primera preferencia del handicapper
- **Dividendos** = pagos por apuesta (equivalente a odds)
- **Reunión** = jornada completa de carreras (normalmente domingos)
- **Inscritos** = caballos participantes en una carrera

### Archivos clave del Melli
- `src/app/api/melli/chat/route.ts` — pipeline principal
- `src/lib/melli-direct-responses.ts` — handlers de data (buildAllMarks, buildRaceMarks, buildPack5y6, buildHorseWorkout, buildRaceProgram…)
- `src/lib/melli-logic.ts` — detectAction regex + ACTION_COSTS
- `src/lib/melli-intent-classifier.ts` — classifyIntent via jergario DB
- `src/models/JargonEntry.ts` — modelo + MelliIntent type
- `src/components/ElMelliChat.tsx` — frontend chat widget

---

## 17. SEO — estado actual

### Implementado
- `robots.ts` — bloquea `/admin`, `/api`, `/perfil`
- `sitemap.ts` — dinámico: genera URLs de todas las revistas, resultados, programas, handicappers activos
- OG image genérico: `/api/og` (1200×630)
- OG image por pronóstico compartible: `/api/og/forecast` (1080×1080, para WhatsApp/Telegram)
- JSON-LD `SportsEvent` en páginas de resultados
- Google Analytics: `G-DB6H4TPMJ1` en `layout.tsx`
- Google Search Console: verificación en `google0bee1e7eda283beb.html`
- H1s optimizados en 7 páginas clave (jun 2026): `/pronosticos`, `/revista`, `/programa`, `/resultados`, home, `/en-vivo`, `/traqueos`
- Keywords long-tail integradas en títulos y meta descriptions
- `NEXT_PUBLIC_BASE_URL=https://www.desafiohipico.com` requerida en Vercel env vars

### Rutas con tráfico orgánico confirmado
- "resultados La Rinconada" / "resultados hipódromo Valencia"
- "pronósticos hípicos Venezuela"
- "traqueos caballos Venezuela"

---

## 18. Performance y conexiones MongoDB

### Contexto del problema
MongoDB Atlas **M0 Free Tier** tiene límite de ~500 conexiones simultáneas. Vercel serverless crea una nueva instancia por cada request. En domingos de carreras con 20+ usuarios simultáneos, el sistema llegó a 493/500 conexiones.

### Cambios aplicados Jun 2026 (commit `61f046d`)
- `NotificationBell.tsx`: polling de 30s → 120s
- 4 rutas públicas cambiadas de `force-dynamic` a `revalidate=60`: `/api/ticker/today`, `/api/ticker-slots`, `/api/meetings/upcoming`, `/api/handicapper/ranking`
- `mongodb.ts`: añadido `maxPoolSize: 5, serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000`

### Regresión detectada (domingo siguiente al commit)
El `maxPoolSize: 5` en serverless **causó lentitud severa**. En Vercel cada instancia tiene su propio pool — limitar a 5 no reduce conexiones totales sino que genera **queue y latencia** cuando hay contención. El usuario hizo revert en Vercel Dashboard al commit del 30-may.

### Estado actual en producción
El código en GitHub (`main`) tiene los cambios de `61f046d` pero Vercel está sirviendo un deploy anterior. Antes de volver a deployar:
- **Eliminar** `maxPoolSize: 5` de `mongodb.ts` (o subirlo a 10)
- **Evaluar** si `revalidate=60` en `/api/ticker/today` causó también problemas (ticker mostrando datos viejos confundidos con lentitud)
- La solución real es **upgrade a Atlas M10+** (1500 conexiones)

### Rutas críticas por carga en domingos
| Ruta | Tipo | Frecuencia |
|------|------|-----------|
| `/api/notifications` | auth, polling | cada 120s por usuario |
| `/api/ticker/today` | público | cada carga de página |
| `/api/ticker-slots` | público | cada carga de página |
| `/api/forecasts` | auth | cada cambio de carrera |
| `/api/en-vivo` | público | cada 60s en página en-vivo |

---

## 19. Economía de Golds — estado actual

### Tasas
```typescript
GOLD_RATE = { golds: 40, usd: 10 }  // 40 Golds = $10 USD
```
Por lo tanto: **1 Gold = $0.25 USD**

### Paquetes de recarga
| Paquete | Golds | USD | Bs (tasa BCV) |
|---------|-------|-----|---------------|
| Básico  | 40    | $10 | BCV × 10      |
| Popular | 100   | $25 | BCV × 25      |
| Pro     | 200   | $50 | BCV × 50      |
| VIP     | 400   | $100| BCV × 100     |

### Flujo de consumo
- 2 carreras gratis por reunión (`FREE_RACES_PER_MEETING = 2`)
- Carrera 3+ → 1 Gold (`GOLD_COST_PER_RACE = 1`)
- Una vez desbloqueada, la carrera queda accesible para siempre para ese usuario en esa reunión
- Melli cobra Gold por consultas de data (ver sección 16)

### Revenue share
- Default: handicapper recibe 70%, plataforma 30%
- Configurable por handicapper en `HandicapperProfile.revenueSharePct`
- **Pendiente:** la distribución automática no está implementada — actualmente es informativo

### Cuenta destino Pago Móvil
```
Banco: BDV (0102) | Cédula: V-16108291 | Teléfono: 04122220545
```

---

## 20. Factor de Victoria — pendiente de implementar

### Concepto
El "Factor de Victoria" es una métrica ponderada que combina:
- **E1** (% de acierto en 1ª marca) — ya calculado
- **Calidad del competidor** (quiénes más acertaron esa misma carrera)
- **Nivel de dificultad** de la carrera (campo grande, caballos parejos)

### Estado actual
Las métricas calculadas actualmente son:
- `e1` = % hit1st / totalRaces (mínimo 5 carreras para aparecer)
- `e1_2`, `e1_3`, `eGeneral` — acumulativos simples
- `roi1st` — retorno simulado apostando $100 a la 1ª marca

**No hay ponderación por calidad del pronosticador ni de la carrera.** El ranking es puramente por `eGeneral` con filtro de mínimo `orderedRaces >= 5`.

### Implementación futura
Ponderar E1 por: número de handicappers que acertaron la misma carrera (acierto fácil vs difícil), racha reciente (últimas 10 vs historico), hipódromo específico (`byTrack`).

---

## 21. Cómo retomar el proyecto con otro LLM

1. **Comparte este archivo** (`CONTEXT.md`) como primer mensaje
2. **Stack exacto:** Next.js 15 App Router, Auth.js v5 beta, Mongoose 8, Tailwind v4
3. **Reglas críticas de código:**
   - `npx tsc --noEmit` antes de cada commit — debe dar 0 errores
   - `getToken()` en middleware, NUNCA `auth()`
   - `notificationService.ts` para notificaciones, nunca `Notification.create()` directo
   - `params` en route handlers son **Promise** en Next.js 15 — siempre `await params`
   - `lucide-react` NO está instalado — usar SVGs inline
   - El usuario admin es `yolfry@gmail.com`
   - `user.balance.golds` (objeto anidado), nunca `user.balance` (número legacy)
   - `/api/resultados` filtra por `Race.status === 'finished'`, no por `Meeting.status`
   - `OPENROUTER_MODEL` en env vars → default `google/gemini-2.5-flash` (OpenRouter)
   - NO hardcodear el modelo Gemini — usar siempre la variable de entorno

4. **Regla crítica de deploy:**
   - El código en `main` en GitHub puede estar adelantado respecto al deploy activo en Vercel
   - Verificar siempre el commit que está activo en Vercel Dashboard antes de asumir que un fix está en producción

5. **Variables de entorno requeridas en Vercel:**
   ```
   MONGODB_URI
   AUTH_SECRET
   AUTH_URL=https://www.desafiohipico.com
   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
   RESEND_API_KEY / RESEND_FROM
   OPENROUTER_API_KEY
   OPENROUTER_MODEL=google/gemini-2.5-flash
   NEXT_PUBLIC_WHATSAPP_NUMBER
   NEXT_PUBLIC_BASE_URL=https://www.desafiohipico.com
   ```
