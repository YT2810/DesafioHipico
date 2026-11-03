# Arquitectura y Tecnologías — Desafío Hípico

> ADN técnico para replicación en el Holding TYM. Generado automáticamente desde el código fuente.

## Stack Exacto

| Capa | Tecnología | Versión | Rol |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 / Turbopack | SSR + ISR + API Routes |
| Runtime | React | 19.2.3 | UI client/server components |
| Base de datos | MongoDB + Mongoose | ^9.2.1 | Almacén principal |
| Auth | next-auth (v5 beta) | ^5.0.0-beta.30 | JWT sessions + Google OAuth + Magic Link |
| Adapter Auth | @auth/mongodb-adapter | ^3.11.1 | Persistencia de sesiones en MongoDB |
| Email | Nodemailer + Resend API | ^7.0.13 | Transaccional + marketing |
| Analytics | @google-analytics/data | ^7.3.0 | GA4 server-side + eventos custom |
| IA | openai SDK | ^6.32.0 | Gemini vía OpenAI-compat (handicapper IA, chat Melli) |
| PDF parsing | pdf-parse | ^1.1.1 | Ingesta de programas INH/HINAVA |
| Excel | xlsx | ^0.18.5 | Importación traqueos Valencia (.xlsx) |
| OG Images | @vercel/og | ^0.9.0 | Open Graph dinámico por reunión/handicapper |
| CSS | Tailwind CSS | ^4 | Mobile-first utility classes |
| Hosting | Vercel (Serverless) | — | Edge + SSR functions |
| Repo | GitHub | — | Branch `main` → producción directa |

---

## Estructura de Carpetas

```
src/
├── app/                        # App Router — cada carpeta es una ruta
│   ├── layout.tsx              # Root layout: metadata global, GA4, banners globales
│   ├── sitemap.ts              # Sitemap dinámico (consulta MongoDB en build)
│   ├── robots.ts               # Robots.txt con reglas para bots IA
│   ├── [ruta pública]/         # pronosticos, retrospectos, resultados, traqueos, etc.
│   ├── admin/                  # Panel admin (protegido, noindex)
│   ├── staff/                  # Panel staff (protegido, noindex)
│   ├── auth/                   # Signin, magic-complete, error
│   ├── pase/                   # Landing de venta del Pase Nacional
│   ├── publicidad/             # Media kit público para anunciantes
│   └── api/                    # Todos los endpoints serverless
│       ├── admin/              # CRUD admin: sponsors, users, topup, results
│       ├── ads/                # active (selección de campaña), impression (tracking)
│       ├── go/sponsor          # Redirect rastreado con UTM
│       ├── forecasts/          # public, access, unlock, pass
│       ├── topup/              # Pago móvil: packages, payment-info, upload
│       └── ...
├── components/                 # Componentes reutilizables globales
│   ├── AnimatedSponsorBanner.tsx   # Banner in-text con animaciones CSS
│   ├── GlobalSponsorBanner.tsx     # Header leaderboard + sticky mobile
│   ├── SponsorDemoBanner.tsx       # Demo 1xBET (modo ?demo=1xbet)
│   ├── VipFiveAndSixWidget.tsx     # Widget flotante 5y6
│   ├── TopUpModal.tsx              # Modal de pago Pase Nacional
│   └── ...
├── models/                     # Schemas Mongoose
├── services/                   # Lógica de negocio pura (sin HTTP)
│   ├── fvAccuracyService.ts    # Motor FV completo + backtesting 5y6
│   ├── adService.ts            # Selección de campaña + tracking
│   ├── forecastAccessService.ts # Verificación de acceso al FV
│   └── parsers/                # Adapters PDF → MongoDB (INH, HINAVA, xlsx)
└── lib/
    ├── mongodb.ts              # Conexión cacheada (CRÍTICO — ver abajo)
    └── constants.ts            # Precios, configuración global
```

---

## Schemas MongoDB Principales

### Meeting (Reunión hípica)
```typescript
{ meetingNumber, date, trackId (ref Track), status, meetingType,
  payouts: { cincoYSeis, exacta, trifecta, ... },
  streamUrl, videoUrl, hasForecasts, hasResults }
```

### Race (Carrera)
```typescript
{ meetingId, raceNumber, distance, category, ageGroup,
  conditions, status, fieldSize, results: [{ position, entryId, ... }] }
```

### Entry (Inscripto)
```typescript
{ raceId, meetingId, dorsalNumber, horseName, jockeyName,
  trainerName, weight, barrier, scratched, scratchReason }
```

### Forecast (Pronóstico de handicapper)
```typescript
{ meetingId, raceId, handicapperId, picks: [{ horseName, rank, fvScore }],
  _locked, publishedAt, accuracy }
```

### SponsorCampaign (Campaña publicitaria)
```typescript
{ slug, brand, targetUrl, slots: AdSlot[], active, isHouseAd,
  creative: { badgeText, title, subtitle, ctaText, logoUrl, accentColor },
  startsAt, endsAt, notes }
```

### AdDailyStat (Estadísticas de ads)
```typescript
{ campaignSlug, slot, date, impressions, clicks }
// CTR se calcula: clicks/impressions en el cliente
```

### TopupRequest (Pago Pase Nacional)
```typescript
{ userId, packageId, amountBs, paymentMethod, receiptUrl,
  status: 'pending'|'approved'|'rejected', reviewedAt, reviewedBy }
```

---

## Solución al Pool de Conexiones (CRÍTICO para Vercel)

**El problema:** Vercel Serverless crea una función nueva por cada request. Sin control, cada función abre su propia conexión a MongoDB → el cluster se satura con miles de conexiones simultáneas en picos de tráfico.

**La solución** (`src/lib/mongodb.ts`):
```typescript
// La conexión se guarda en la variable GLOBAL del proceso Node.js
// En Vercel, múltiples invocaciones de la misma función COMPARTEN
// el mismo proceso (warm lambda) → comparten la conexión cacheada.
let cached: Cached = global.mongoose;

cached.promise = mongoose.connect(MONGODB_URI!, {
  maxPoolSize: 10,          // Máximo 10 conexiones simultáneas al cluster
  bufferCommands: false,    // Falla rápido si no hay conexión (no espera)
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  heartbeatFrequencyMS: 10000,
});
```

Cada función serverless que llama `dbConnect()` recibe la **misma conexión cacheada** si el proceso está caliente (warm). En frío (cold start), abre una nueva y la cachea.

---

## Estrategia de Caché ISR por Página

| Página | Revalidación | Razón |
|---|---|---|
| `/retrospectos` | 1 hora | Contenido histórico, baja frecuencia de cambio |
| `/publicidad` | 1 hora | Media kit estático |
| `/traqueos` | 5 minutos | Trabajos se actualizan frecuentemente en días de semana |
| `/traqueos/valencia` | 5 minutos | Mismo patrón |
| `/api/handicapper/ranking` | 1 minuto | Rankings cambian con cada reunión |
| `/api/ads/active` | Sin caché (force-dynamic) | Selección de campaña debe ser por usuario |
| `/programa/[meetingId]` | Dinámica (SSR) | Estado de carrera cambia en tiempo real |

La ISR de Vercel sirve páginas desde Edge Cache (memoria del CDN) → la mayoría de visitantes nunca llegan a MongoDB.

---

## Hipódromos Soportados

| Clave | Nombre | Formato de ingesta |
|---|---|---|
| `inh` | La Rinconada (Caracas) | PDF con bloques `Carrera Programada:` |
| `hinava` | Nacional de Valencia | PDF con bloques `REUNION:` |

Los parsers son **Adapters** específicos por fuente: `src/services/parsers/inh.ts` y `src/services/parsers/hinava.ts`. Para agregar un nuevo hipódromo o fuente de datos, se crea un nuevo adapter que transforma al schema `Meeting/Race/Entry`.
