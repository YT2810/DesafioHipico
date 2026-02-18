# 🏇 Desafío Hípico

Marketplace de pronósticos hípicos para Venezuela. Plataforma freemium donde handicappers publican pronósticos y usuarios los consumen con un sistema de créditos (Golds).

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Base de datos | MongoDB Atlas (Mongoose 9) |
| Autenticación | Auth.js v5 (NextAuth) |
| Estilos | Tailwind CSS v4 |
| Lenguaje | TypeScript 5 |
| PDF Parsing | pdfjs-dist (server-side) |

---

## Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Crea un archivo `.env` en la raíz con las siguientes variables:

```env
# Base de datos
MONGODB_URI="mongodb+srv://..."

# Auth.js v5
AUTH_SECRET="genera con: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"

# Google OAuth (Google Cloud Console → APIs → Credenciales)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Email Magic Link (SMTP — puedes usar Gmail, Resend, etc.)
EMAIL_SERVER_HOST=""
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER=""
EMAIL_SERVER_PASSWORD=""
EMAIL_FROM="noreply@desafiohipico.com"

# Telegram Mini App (@BotFather → /newbot)
TELEGRAM_BOT_TOKEN=""
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Arquitectura del Proyecto

```
src/
├── app/
│   ├── page.tsx                    # Home / Marketplace
│   ├── layout.tsx                  # Root layout + SessionProvider
│   ├── auth/
│   │   └── signin/page.tsx         # Página de login
│   ├── admin/
│   │   └── ingest/page.tsx         # Ingestión de PDFs INH (staff/admin)
│   ├── pronosticos/
│   │   └── page.tsx                # Dashboard de pronósticos (freemium)
│   └── api/
│       ├── auth/[...nextauth]/     # Auth.js handler
│       ├── admin/ingest/           # POST: procesar PDF INH
│       ├── forecasts/              # GET: pronósticos por reunión
│       ├── forecasts/unlock/       # POST: desbloquear carrera
│       ├── handicappers/[id]/follow/ # POST: seguir/dejar de seguir
│       ├── meetings/upcoming/      # GET: próximas reuniones
│       └── topup/                  # POST/GET: solicitudes de recarga
├── auth.ts                         # Configuración NextAuth (Google + Email + Telegram)
├── middleware.ts                   # Protección de rutas por rol
├── models/
│   ├── User.ts                     # Usuario (roles, balance Golds, consumos por reunión)
│   ├── Track.ts                    # Hipódromo
│   ├── Meeting.ts                  # Reunión hípica
│   ├── Race.ts                     # Carrera individual
│   ├── Horse.ts                    # Ejemplar
│   ├── Person.ts                   # Jinete / Entrenador
│   ├── Entry.ts                    # Inscripción (ejemplar en carrera)
│   ├── Stud.ts                     # Cuadra / Stud
│   ├── HandicapperProfile.ts       # Perfil del handicapper + stats de acierto
│   ├── Forecast.ts                 # Pronóstico (hasta 5 marcas por carrera)
│   ├── GoldTransaction.ts          # Ledger de movimientos de Golds
│   ├── Notification.ts             # Notificaciones in-app
│   └── TopUpRequest.ts             # Solicitudes de recarga (Pago Móvil)
├── services/
│   ├── pdfProcessor.ts             # Parser de PDFs oficiales INH
│   ├── ingestService.ts            # Upsert idempotente en MongoDB
│   ├── forecastAccessService.ts    # Lógica freemium (2 gratis por reunión)
│   ├── forecastStatsService.ts     # Actualización automática de stats
│   ├── followService.ts            # Follow/unfollow + notificaciones
│   └── aiHandicapperService.ts     # Stubs: YouTube, texto, OCR, audio
├── lib/
│   ├── mongodb.ts                  # Conexión singleton a MongoDB
│   └── constants.ts                # Constantes compartidas (GOLD_RATE, bancos, etc.)
├── components/
│   ├── SessionProviderWrapper.tsx  # Client wrapper para NextAuth
│   └── TopUpModal.tsx              # Modal de recarga de Golds (Pago Móvil)
└── types/
    └── next-auth.d.ts              # Extensión de tipos de sesión
```

---

## Modelos de Datos

### User
- `identifier` — teléfono o ID interno
- `email`, `googleId`, `telegramId` — proveedores de auth (vinculables)
- `phone`, `legalId` — requeridos para recargas
- `roles` — `customer | handicapper | staff | admin`
- `balance.golds` — saldo de créditos
- `meetingConsumptions[]` — registro de carreras desbloqueadas por reunión (sin reset temporal)
- `followedHandicappers[]` — handicappers seguidos

### Forecast
- Vincula `handicapperId` + `raceId`
- Hasta **5 marcas** por carrera con `preferenceOrder` (1ra, 2da, 3ra, 4ta, 5ta)
- Etiquetas: `Línea | Casi Fijo | Súper Especial | Buen Dividendo | Batacazo`
- `isVip` — pronóstico de pago (VIP) vs gratuito
- `source` — `manual | youtube | social_text | image_ocr | audio`
- `result` — evaluado automáticamente al cargar resultados oficiales

### HandicapperProfile
- `pseudonym`, `contactNumber` (WhatsApp)
- `revenueSharePct` — porcentaje para el handicapper (default 70%, plataforma 30%, negociable)
- `stats` — `pct1st`, `pct2nd`, `pct3rd`, `pctGeneral` calculados automáticamente

### TopUpRequest (Pago Móvil)
- Campos: `referenceNumber`, `phone`, `legalId`, `bank`, `amountBs`, `amountUsd`
- `goldAmount` — calculado automáticamente (40 Golds = $10 USD)
- `status` — `pending | approved | rejected`
- `referenceNumber` tiene índice único para evitar duplicados

---

## Lógica de Negocio

### Freemium (por reunión)
- **2 carreras gratis** por reunión por usuario (sin reset temporal — es por reunión, no por día)
- A partir de la 3ra carrera: **1 Gold** por carrera
- `staff`, `handicapper`, `admin` → acceso total gratuito
- Una vez desbloqueada una carrera, queda desbloqueada permanentemente para ese usuario

### Golds
- **40 Golds = $10 USD** (compra mínima)
- Pago vía Pago Móvil venezolano → aprobación manual por staff
- Cada transacción queda registrada en `GoldTransaction` con revenue share configurable

### Revenue Share
- Default: **70% handicapper / 30% plataforma**
- Configurable por contrato en `HandicapperProfile.revenueSharePct`

### Stats de Handicappers
- Se calculan automáticamente al cargar resultados oficiales
- Compara marcas del pronóstico vs `finishPosition` de cada carrera
- Actualiza `pct1st`, `pct2nd`, `pct3rd`, `pctGeneral` acumulativamente

---

## Ingestión de PDFs INH

El sistema procesa los PDFs oficiales del **Instituto Nacional de Hipismo (INH)**:

1. Subir PDF en `/admin/ingest`
2. El sistema extrae: reunión, hipódromo, 11 carreras, ejemplares, jinetes, entrenadores, pesos
3. Los pesos con descargo se almacenan como `weightRaw` (ej. `"53-2"`) y `weight` neto (ej. `51`)
4. Upsert idempotente por `{trackId, date, meetingNumber}` — se puede subir el mismo PDF sin duplicar datos

---

## Autenticación

| Proveedor | Uso |
|-----------|-----|
| **Google OAuth** | Usuarios web |
| **Magic Link (email)** | Acceso sin contraseña |
| **Telegram initData** | Mini App de Telegram (verificación HMAC) |

Un usuario puede vincular Google y Telegram al mismo perfil (por email o telegramId).

### Protección de rutas (middleware)
- `/admin/*` → requiere rol `admin` o `staff`
- `/handicapper/*` → requiere rol `handicapper` o `admin`

---

## Roadmap

### ✅ Etapa 1 — Ingestión de Programas INH
- Parser PDF calibrado al formato real INH
- Extracción de 11 carreras con todos los campos
- Upsert idempotente en MongoDB
- UI admin drag & drop con previsualización

### ✅ Etapa 2 — Ecosistema de Pronósticos
- Modelos Forecast, HandicapperProfile, GoldTransaction, Notification
- Lógica freemium (2 gratis por reunión)
- Sistema de Follow con notificaciones
- Dashboard `/pronosticos` mobile-first
- Stubs de ingestión multi-canal (YouTube, RRSS, OCR, audio)

### ✅ Etapa 3 — Marketplace y Auth
- Home marketplace con próximas reuniones
- Auth.js v5 (Google + Magic Link + Telegram)
- Sistema de Golds y Pago Móvil
- Middleware de protección por roles

### 🔜 Etapa 4 — Pendiente
- [ ] UI de carga de pronósticos para handicappers
- [ ] Conectar `/pronosticos` a API real
- [ ] Panel admin para aprobar/rechazar recargas
- [ ] Historial de ejemplares (Gaceta Hípica)
- [ ] Notificaciones push (Web Push / Telegram)
- [ ] Resultados oficiales y dividendos

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Verificar tipos TypeScript
npx tsc --noEmit

# Test de ingestión PDF (debug)
curl -X POST 'http://localhost:3000/api/admin/ingest?debug=true' \
  -F 'file=@"Ejemplares inscritos reunión 9.pdf"'

# Test de ingestión completa
curl -X POST 'http://localhost:3000/api/admin/ingest' \
  -F 'file=@"Ejemplares inscritos reunión 9.pdf"'
```
