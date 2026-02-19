# CONTEXT.md — Desafío Hípico
## Documento de contexto para LLMs y nuevos desarrolladores

> **Propósito:** Este archivo es la fuente de verdad para cualquier LLM o desarrollador que retome el proyecto.
> Contiene toda la lógica de negocio, decisiones de arquitectura, estado actual y reglas importantes.
> **Leer antes de tocar cualquier código.**

---

## 1. Qué es el producto

**Desafío Hípico** es un marketplace de pronósticos hípicos para Venezuela, enfocado en las carreras del Hipódromo La Rinconada (Caracas). El modelo es freemium:

- **Handicappers** (expertos en carreras) publican sus pronósticos en la plataforma
- **Usuarios** consumen esos pronósticos pagando con Golds (créditos internos)
- **La plataforma** cobra 30% de cada transacción (revenue share configurable)
- **Pago real** se hace exclusivamente por Pago Móvil venezolano (BDV), aprobado manualmente por staff

El producto es mobile-first, pensado para usuarios venezolanos con acceso a Telegram y WhatsApp.

---

## 2. Stack técnico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Framework | Next.js 15 App Router | Turbopack en dev, no usar `pages/` |
| Base de datos | MongoDB Atlas + Mongoose 8 | Conexión singleton en `src/lib/mongodb.ts` |
| Autenticación | Auth.js v5 beta (NextAuth) | `src/auth.ts` — NO usar v4 |
| Estilos | Tailwind CSS v4 | Sin `tailwind.config.js`, config en CSS |
| Lenguaje | TypeScript 5 | Strict mode, 0 errores `tsc --noEmit` |
| Email | Resend API | Magic links propios, sin adapter de NextAuth |
| PDF | pdfjs-dist (legacy build) | Server-side únicamente |
| Deploy | Vercel (pendiente) | Node.js 20+ |

---

## 3. Modelos de datos

### User (`src/models/User.ts`)
```typescript
{
  identifier: string        // teléfono o ID interno
  alias: string             // nombre de usuario
  email?: string            // para Google OAuth y magic links
  phone?: string            // teléfono (guardado al primer topup)
  legalId?: string          // cédula (guardado al primer topup)
  googleId?: string         // ID de Google OAuth
  telegramId?: string       // ID de Telegram
  fullName?: string         // nombre completo (billing profile)
  identityDocument?: string // cédula con prefijo: V-12345678
  phoneNumber?: string      // +584120000000
  roles: ('customer'|'handicapper'|'staff'|'admin')[]
  balance: {
    golds: number           // créditos internos
    diamonds: number        // reservado para futuro
  }
  meetingConsumptions: [{   // carreras desbloqueadas por reunión
    meetingId: string
    freeUsed: number        // cuántas gratis usó (max FREE_RACES_PER_MEETING=2)
    unlockedRaceIds: string[]
  }]
  followedHandicappers: ObjectId[]  // HandicapperProfile IDs
}
```

**⚠️ Bug histórico (ya corregido):** Algunos usuarios tenían `balance: 0` (número) en vez de `{golds:0}`. La migración `scripts/fix-balance.mjs` ya se ejecutó (Feb 2026). La API de aprobación de recargas usa pipeline `$cond` para manejar documentos legacy.

### Meeting / Race / Entry
- `Meeting`: reunión hípica (número, fecha, hipódromo, estado: scheduled/completed)
- `Race`: carrera dentro de una reunión (número, distancia, condiciones, prizePool)
- `Entry`: inscripción de un ejemplar en una carrera (caballo, jinete, peso, posición final)
- `Track`: hipódromo (nombre, país, ubicación)
- `Horse`, `Person`, `Stud`: entidades del mundo hípico

### Forecast (`src/models/Forecast.ts`)
```typescript
{
  handicapperId: ObjectId   // → HandicapperProfile
  raceId: ObjectId          // → Race
  meetingId: ObjectId       // → Meeting
  marks: [{
    preferenceOrder: 1|2|3|4|5
    horseName: string
    dorsalNumber?: number
    label: 'Línea'|'Casi Fijo'|'Súper Especial'|'Buen Dividendo'|'Batacazo'
    note?: string
  }]
  isVip: boolean            // true = requiere Gold para ver
  isPublished: boolean
  publishedAt?: Date
  source: 'manual'|'youtube'|'social_text'|'image_ocr'|'audio'
  result?: { evaluated: boolean; hit1st: boolean; hit2nd: boolean; hit3rd: boolean }
}
```

**Etiquetas y puntos:**
- `Línea` = 1 punto
- `Casi Fijo` = 2 puntos + bonus si es 1ra preferencia
- `Súper Especial` = 3 puntos
- `Buen Dividendo` = 2 puntos
- `Batacazo` = 3 puntos

### HandicapperProfile (`src/models/HandicapperProfile.ts`)
```typescript
{
  userId: ObjectId
  pseudonym: string         // nombre público único
  contactNumber?: string    // WhatsApp del handicapper
  bio?: string
  isActive: boolean
  isPublic: boolean
  revenueSharePct: number   // default 70 (handicapper recibe 70%, plataforma 30%)
  stats: {
    totalForecasts: number
    pct1st: number          // % de acierto en 1er lugar
    pct2nd: number
    pct3rd: number
    pctGeneral: number
  }
}
```

### TopUpRequest (`src/models/TopUpRequest.ts`)
```typescript
{
  userId: ObjectId
  amountUsd: number         // 10, 25, 50, 100
  goldAmount: number        // calculado: (amountUsd / 0.25) = 40, 100, 200, 400
  referenceNumber: string   // único — índice único en MongoDB
  phone: string             // teléfono del pagador
  legalId: string           // cédula del pagador
  bank: string              // banco emisor
  amountBs: number          // monto en bolívares
  paymentDate: string
  receiptUrl?: string       // imagen del comprobante (opcional)
  status: 'pending'|'approved'|'rejected'
  rejectionReason?: string
  reviewedBy?: ObjectId     // admin/staff que revisó
  reviewedAt?: Date
}
```

### ExchangeRate (`src/models/ExchangeRate.ts`)
```typescript
{
  key: 'bcv'               // siempre 'bcv', documento único
  rateVes: number          // Bs por 1 USD (ej: 91.50)
  updatedBy: ObjectId      // admin que actualizó
  updatedAt: Date
}
```

### Notification (`src/models/Notification.ts`)
```typescript
{
  userId: ObjectId
  type: NotificationType    // ver lista completa abajo
  title: string             // max 120 chars
  body: string              // max 400 chars
  link?: string             // URL relativa para navegar al hacer click
  data?: Map<string, string>
  read: boolean
  readAt?: Date
  createdAt: Date           // TTL index: auto-eliminado a los 90 días
}
```

**Tipos de notificación:**
| Tipo | Audiencia | Trigger |
|------|-----------|---------|
| `topup_pending` | Admin+Staff | Usuario envía recarga |
| `topup_approved` | Usuario | Admin aprueba recarga |
| `topup_rejected` | Usuario | Admin rechaza recarga |
| `handicapper_request` | Admin+Staff | Usuario solicita ser handicapper |
| `request_approved` | Usuario | Admin aprueba solicitud handicapper |
| `request_rejected` | Usuario | Admin rechaza solicitud handicapper |
| `followed_forecast` | Seguidores | Handicapper publica pronóstico |
| `new_meeting` | Todos los usuarios | Admin ingesta PDF INH |
| `new_meeting_hcp` | Todos los handicappers | Admin ingesta PDF INH |
| `gold_low` | Usuario | Balance < 3 Golds tras desbloquear carrera |
| `vip_purchase` | Handicapper | Usuario compra plan VIP (futuro) |
| `system` | Cualquiera | Anuncios de plataforma |

---

## 4. Lógica de negocio crítica

### Freemium por reunión
- Constante `FREE_RACES_PER_MEETING = 2` en `src/lib/constants.ts`
- Cada usuario tiene `meetingConsumptions[]` en su documento
- Al abrir una carrera: si `freeUsed < 2` → gratis, si no → descuenta 1 Gold
- **Permanente:** una vez desbloqueada, queda desbloqueada para ese usuario en esa reunión para siempre
- `staff`, `handicapper`, `admin` → acceso total gratuito, sin consumir quota
- Lógica en `src/services/forecastAccessService.ts`

### Flujo de recarga (Pago Móvil)
1. Usuario abre `TopUpModal` → selecciona paquete
2. Si no tiene perfil de facturación completo → paso de billing (nombre, cédula, teléfono)
3. Muestra destino de pago: BDV 0102, V-16108291, 04122220545, monto en Bs (tasa BCV)
4. Usuario llena formulario: referencia, banco, fecha, monto
5. `POST /api/topup` → crea `TopUpRequest` en estado `pending`
6. Admin/staff ve en `/admin/topup` → aprueba o rechaza
7. Al aprobar: `$inc balance.golds` + crea `GoldTransaction` + notifica usuario
8. Al rechazar: cambia status + guarda motivo + notifica usuario

### Flujo de solicitud handicapper
1. Usuario en `/perfil` → sección "Quiero ser Handicapper" → llena pseudónimo + bio
2. `POST /api/handicapper-request` → crea `HandicapperRequest` en `pending` + notifica admins
3. Admin en `/admin/handicapper-request` → aprueba o rechaza
4. Al aprobar: agrega rol `handicapper` al usuario + crea `HandicapperProfile` + notifica usuario
5. Al rechazar: guarda motivo + notifica usuario

### Ingestión de PDFs INH
1. Admin sube PDF en `/admin/ingest`
2. `pdfProcessor.ts` extrae texto y parsea: reunión, hipódromo, 11 carreras, ejemplares, jinetes, pesos
3. Preview antes de confirmar (modo `?preview=true`)
4. `ingestService.ts` hace upsert idempotente por `{trackId, date, meetingNumber}`
5. Al confirmar: `notifyNewMeeting()` → todos los usuarios + handicappers reciben notificación

### Tasa BCV
- Almacenada en MongoDB como documento único con `key: 'bcv'`
- Admin actualiza manualmente en `/admin/exchange-rate`
- `TopUpModal` la consume para mostrar monto en Bs
- Alerta si lleva >24h sin actualizar
- Referencia: [bcv.org.ve](https://www.bcv.org.ve)

---

## 5. Autenticación

### Proveedores activos
| Proveedor | Estado | Notas |
|-----------|--------|-------|
| Google OAuth | ✅ Funcional | Credenciales reales en `.env` |
| Magic Link (Resend) | ⚠️ Requiere dominio | Funciona en local, necesita dominio verificado en Resend para producción |
| Telegram Credentials | 🔧 Estructura lista | Validación HMAC-SHA256 pendiente de implementar |

### Reglas importantes de NextAuth v5
- **NO usar `auth()` en middleware** — usar `getToken()` (compatible con edge runtime)
- **NO usar Email provider de NextAuth** — usamos magic link propio sin adapter
- **Credentials providers NO requieren adapter** en v5 beta
- El callback `jwt` en `src/auth.ts` enriquece el token con `id`, `roles`, `balance`
- El callback `session` expone esos campos al cliente

### Protección de rutas (`src/middleware.ts`)
```
/admin/*        → requiere rol admin o staff
/handicapper/*  → requiere rol handicapper o admin
/perfil         → requiere autenticación
/pronosticos    → auth gate en el componente (no en middleware)
```

### Usuario admin
- Email: `yolfry@gmail.com`
- Se auto-asigna rol `admin` en cada login via callback `signIn` en `src/auth.ts`
- No requiere configuración manual en base de datos

---

## 6. APIs — Referencia rápida

### Públicas (sin auth)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/meetings/upcoming?limit=N` | Próximas reuniones |
| GET | `/api/exchange-rate` | Tasa BCV actual |

### Requieren autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/forecasts?meetingId=&userId=` | Pronósticos + access map |
| POST | `/api/forecasts/unlock` | Desbloquear carrera |
| POST | `/api/topup` | Enviar solicitud de recarga |
| GET | `/api/topup` | Mis solicitudes de recarga |
| GET/POST | `/api/user/billing` | Perfil de facturación |
| GET | `/api/user/transactions` | Historial de transacciones |
| POST/GET | `/api/handicapper-request` | Solicitar/ver estado solicitud handicapper |
| POST | `/api/handicappers/[id]/follow` | Seguir/dejar de seguir handicapper |
| GET | `/api/notifications` | Mis notificaciones (últimas 30) |
| POST | `/api/notifications/read-all` | Marcar todas como leídas |
| POST/GET | `/api/handicapper/forecast` | Subir/listar pronósticos (rol handicapper) |

### Requieren rol admin o staff
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/admin/ingest` | Procesar PDF INH |
| GET | `/api/admin/topup` | Listar recargas pendientes |
| POST | `/api/admin/topup/[id]/review` | Aprobar/rechazar recarga |
| GET | `/api/admin/handicapper-request` | Listar solicitudes handicapper |
| POST | `/api/admin/handicapper-request/[id]/review` | Aprobar/rechazar solicitud |
| GET | `/api/admin/users` | Buscar usuarios |
| POST | `/api/admin/users/[id]/roles` | Actualizar roles |
| POST | `/api/exchange-rate` | Actualizar tasa BCV |

---

## 7. Servicios clave

### `notificationService.ts`
Servicio centralizado. **Nunca crear documentos `Notification` directamente** — siempre usar este servicio.

```typescript
// Funciones de audiencia
notifyUser(userId, payload)
notifyAdmins(payload)
notifyHandicappers(payload)
notifyFollowers(handicapperProfileId, payload)
notifyAllUsers(payload)  // en batches de 500

// Helpers de conveniencia (ya wired en los triggers)
notifyTopUpPending(userId, goldAmount, ref)
notifyTopUpApproved(userId, goldAmount)
notifyTopUpRejected(userId, reason)
notifyHandicapperRequestPending(requesterId, pseudonym)
notifyHandicapperRequestApproved(userId, pseudonym)
notifyHandicapperRequestRejected(userId, reason)
notifyFollowersNewForecast(handicapperProfileId, pseudonym, meetingNumber, raceNumber)
notifyNewMeeting(meetingNumber, trackName, date)
notifyVipPurchase(handicapperUserId, pseudonym, buyerAlias)
notifyGoldLow(userId, balance)
```

### `forecastAccessService.ts`
- `requestRaceAccess(userId, meetingId, raceId)` — consume quota o Gold, idempotente
- `getMeetingAccessMap(userId, meetingId, raceIds)` — solo lectura, para renderizar el dashboard

### `followService.ts`
- `followHandicapper(userId, handicapperProfileId)` — toggle follow/unfollow
- `notifyFollowers(handicapperProfileId, meetingNumber, raceNumber, isUpdate)` — fan-out

---

## 8. Componentes UI clave

### `TopUpModal.tsx`
4 pasos:
1. Selección de paquete (muestra USD + Bs con tasa BCV)
2. Billing profile gate (si no tiene nombre/cédula/teléfono)
3. Destino de pago BDV con monto en Bs
4. Formulario de comprobante → éxito

### `NotificationBell.tsx`
- Polling cada 30 segundos a `/api/notifications`
- Al abrir: llama `/api/notifications/read-all` (fire-and-forget)
- Badge dorado con conteo de no leídas
- Panel dropdown con lista, iconos por tipo, tiempo relativo

### `WhatsAppButton.tsx`
- Botón flotante en todas las páginas (bottom-right)
- Número configurable via `NEXT_PUBLIC_WHATSAPP_NUMBER`

---

## 9. Constantes importantes (`src/lib/constants.ts`)

```typescript
GOLD_RATE = { usd: 0.25, golds: 1 }  // 1 Gold = $0.25 USD = 40 Golds por $10
FREE_RACES_PER_MEETING = 2
GOLD_COST_PER_RACE = 1
GOLD_LOW_THRESHOLD = 3                // en forecastAccessService.ts

PAYMENT_DESTINATION = {
  bank: 'Banco de Venezuela (BDV)',
  code: '0102',
  legalId: 'V-16108291',
  phone: '04122220545',
}

VENEZUELAN_BANKS = [/* 16 bancos con códigos BCV oficiales */]

FORECAST_LABELS = ['Línea', 'Casi Fijo', 'Súper Especial', 'Buen Dividendo', 'Batacazo']
```

---

## 10. Decisiones de arquitectura tomadas

| Decisión | Razón |
|----------|-------|
| Magic link propio (sin adapter NextAuth) | NextAuth v5 beta requiere adapter para Email provider; implementamos el nuestro con Resend + MagicToken model |
| `getToken()` en middleware (no `auth()`) | `auth()` no es compatible con edge runtime de Next.js |
| Freemium por reunión (no por tiempo) | Más justo para el usuario — si paga por una reunión, la tiene para siempre |
| Tasa BCV manual (no automática) | BCV no tiene API pública estable; scraping es frágil; admin actualiza diariamente |
| Notificaciones in-app (no push) | Web Push requiere service worker + HTTPS; in-app es suficiente para MVP |
| Upsert idempotente en ingestión | Permite re-subir PDFs corregidos sin duplicar datos |
| `balance: {golds, diamonds}` como objeto | Permite agregar más tipos de crédito en el futuro sin migración |
| TTL index en Notification (90 días) | MongoDB limpia automáticamente, sin cron jobs |

---

## 11. Errores conocidos y soluciones

| Error | Causa | Solución |
|-------|-------|---------|
| `Cannot create field 'golds' in element {balance: 0}` | Usuarios creados antes del schema actual tenían `balance: 0` (número) | Migración ejecutada con `scripts/fix-balance.mjs`. API usa pipeline `$cond` |
| `Failed to connect to MetaMask` | Extensión MetaMask del browser inyecta código | No es del proyecto. Desactivar extensión MetaMask en el browser |
| Magic links no llegan en producción | Dominio no verificado en Resend | Verificar dominio en resend.com/domains |
| Google OAuth 404 en producción | URI de callback no configurada | Agregar `https://tudominio.com/api/auth/callback/google` en Google Cloud Console |
| Track no encontrado en `/api/meetings/upcoming` | Mongoose no registra el modelo Track automáticamente | Importar `Track` explícitamente en la ruta |

---

## 12. Estado del proyecto (Feb 2026)

### ✅ Completo y funcional
- Autenticación completa (Google + Magic Link + Telegram estructura)
- Sistema de roles y permisos
- Ingestión de PDFs INH
- Dashboard de pronósticos con datos reales
- Sistema de Golds y Pago Móvil
- Tasa BCV manual
- Paneles admin completos
- Sistema de notificaciones in-app (10 triggers)
- Perfil de usuario
- Follow/unfollow handicappers
- WhatsApp soporte flotante

### ⚠️ Requiere acción externa
- **Dominio:** comprar `desafiohipico.com` (o similar)
- **Resend:** verificar dominio para magic links en producción
- **Google Cloud:** actualizar URI de callback OAuth para producción
- **Vercel:** conectar repo y configurar variables de entorno

### 🔧 Pendiente de desarrollo
- Validación HMAC Telegram Mini App
- Resultados oficiales e ingestión de dividendos
- Tasa BCV automática
- Notificaciones push (fuera de la app)
- Plan VIP por handicapper
- Módulo Pollas (proyecto paralelo)

---

## 13. Cómo retomar el proyecto con otro LLM

Si usas otro LLM (Claude, GPT-4, Gemini, etc.) para continuar el desarrollo:

1. **Comparte este archivo** (`CONTEXT.md`) como primer mensaje
2. **Comparte `README.md`** para el estado actual y pendientes
3. **Di el stack exacto:** Next.js 15 App Router, Auth.js v5 beta, Mongoose 8, Tailwind v4
4. **Reglas críticas para el LLM:**
   - Usar `getToken()` en middleware, NUNCA `auth()`
   - Usar `notificationService.ts` para crear notificaciones, nunca `Notification.create()` directo
   - Compilar con `npx tsc --noEmit` antes de cada commit
   - El usuario admin es `yolfry@gmail.com`
   - No hay mock data en `/pronosticos` — todo viene de la API
   - El balance es `user.balance.golds` (objeto), no `user.balance` (número)
