# CONTEXT.md — Desafío Hípico
## Fuente de verdad para LLMs y desarrolladores

> **Propósito:** Este archivo es lo primero que debe leer cualquier LLM o desarrollador antes de tocar el proyecto.
> Contiene toda la lógica de negocio, decisiones de arquitectura, estado actual y reglas críticas.
> **Leer completo antes de escribir una sola línea de código.**

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

## 12. Estado del proyecto (Mar 2026)

### ✅ Completo y en producción
- Autenticación completa (Google + Magic Link + Telegram estructura)
- Ingestión de PDFs INH (La Rinconada) + HINAVA (Valencia)
- Ingestor Gemini: pronósticos desde texto, tweets, transcripciones
- Ingestor de resultados desde imágenes (OCR + tabla editable)
- Dashboard de pronósticos freemium (`/pronosticos`)
- Sistema de Golds + Pago Móvil BDV + aprobación manual
- Evaluación automática de pronósticos al guardar resultados
- Ranking público de handicappers con métricas E1/E-General
- Perfil público de handicapper con desglose por hipódromo
- Página de resultados públicos (`/resultados`) con dividendos completos + video YouTube
- Cintillo dinámico de expertos (sticky, actualiza por carrera)
- Sistema de notificaciones in-app (10 triggers)
- SEO: sitemap dinámico, OG images, robots.ts, JSON-LD
- Panel admin completo (topup, usuarios, roles, tasa BCV, video reuniones)
- 26+ handicappers rankeados con datos reales

### 🔧 Pendiente de desarrollo
- Manejo de retirados en stats (no penalizar al handicapper si su caballo se retira)
- Notificaciones push (Telegram Bot o Web Push)
- Tasa BCV automática (scraping bcv.org.ve)
- Módulo Pollas (jugadas grupales)
- Validación HMAC Telegram Mini App

---

## 13. Cómo retomar el proyecto con otro LLM

1. **Comparte este archivo** (`CONTEXT.md`) como primer mensaje
2. **Di el stack exacto:** Next.js 15 App Router, Auth.js v5 beta, Mongoose 8, Tailwind v4
3. **Reglas críticas:**
   - `npx tsc --noEmit` antes de cada commit — debe dar 0 errores
   - `getToken()` en middleware, NUNCA `auth()`
   - `notificationService.ts` para notificaciones, nunca `Notification.create()` directo
   - `params` en route handlers son Promise en Next.js 15 — siempre awaitear
   - lucide-react NO está instalado — usar SVGs inline
   - El usuario admin es `yolfry@gmail.com`
   - `user.balance.golds` (objeto), nunca `user.balance` (número)
   - `/api/resultados` filtra por `Race.status === 'finished'`, no por `Meeting.status`
