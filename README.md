# 🏇 Desafío Hípico

**Marketplace de pronósticos hípicos para Venezuela.**
Plataforma freemium donde handicappers publican pronósticos y usuarios los consumen con un sistema de créditos (Golds). Incluye ranking público de efectividad por hipódromo, ingesta de resultados oficiales INH con IA, y evaluación automática de handicappers.

> **Estado actual (Mar 2026):** En producción en [desafiohipico.com](https://www.desafiohipico.com) (Vercel + MongoDB Atlas). Parser INH + HINAVA operativo. Ingestor Gemini Vision operativo. Sistema de métricas de efectividad activo con 26+ handicappers rankeados.
> Para contexto completo de arquitectura y lógica → ver [`CONTEXT.md`](./CONTEXT.md)

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 App Router + Turbopack |
| Base de datos | MongoDB Atlas (Mongoose 8) |
| Autenticación | Auth.js v5 beta (NextAuth) |
| Estilos | Tailwind CSS v4 |
| Lenguaje | TypeScript 5 |
| Email | Resend API (magic links sin contraseña) |
| PDF Parsing | pdf-parse v1.1.1 (CJS, server-side) |
| Deploy | Vercel (recomendado) o cualquier Node.js 20+ host |

---

## Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Crea `.env` en la raíz:

```env
# ── Base de datos ──────────────────────────────────────────
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/desafiohipico"

# ── Auth.js v5 ─────────────────────────────────────────────
AUTH_SECRET="genera con: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"
# En producción: AUTH_URL="https://tudominio.com"

# ── Google OAuth ───────────────────────────────────────────
# Google Cloud Console → APIs & Services → Credenciales → OAuth 2.0
# URI de redirección autorizada: https://tudominio.com/api/auth/callback/google
AUTH_GOOGLE_ID="xxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxx"

# ── Resend (magic links por email) ─────────────────────────
# resend.com → API Keys → crear clave
# ⚠️ REQUIERE dominio verificado en resend.com/domains antes de usar en producción
RESEND_API_KEY="re_xxxx"
RESEND_FROM="Desafío Hípico <noreply@tudominio.com>"

# ── Telegram Bot (Mini App) ────────────────────────────────
# @BotFather en Telegram → /newbot → copiar token
TELEGRAM_BOT_TOKEN=""

# ── WhatsApp soporte flotante ──────────────────────────────
NEXT_PUBLIC_WHATSAPP_NUMBER="584120000000"
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Arquitectura del Proyecto

```
src/
├── app/
│   ├── page.tsx                          # Home: hero + próximas reuniones + menú usuario
│   ├── layout.tsx                        # Root layout + SessionProvider + WhatsAppButton
│   ├── auth/
│   │   ├── signin/page.tsx               # Login: Google OAuth + Magic Link email
│   │   └── error/page.tsx               # Errores OAuth con mensajes amigables
│   ├── perfil/page.tsx                   # Perfil: saldo, historial, solicitud handicapper
│   ├── pronosticos/page.tsx              # Dashboard pronósticos freemium (API real)
│   ├── programa/[meetingId]/page.tsx    # Pública: inscritos + preview pronósticos con blur/CTA
│   ├── admin/
│   │   ├── ingest/page.tsx               # Ingestión PDFs INH + HINAVA (drag & drop + preview)
│   │   ├── topup/page.tsx                # Aprobar/rechazar recargas Pago Móvil
│   │   ├── handicapper-request/page.tsx  # Aprobar/rechazar solicitudes handicapper
│   │   ├── users/page.tsx                # Buscar usuarios + asignar/quitar roles
│   │   └── exchange-rate/page.tsx        # Tasa BCV manual (Bs/USD)
│   ├── handicapper/
│   │   └── forecast/page.tsx             # Subir pronósticos por carrera
│   └── api/
│       ├── auth/[...nextauth]/           # Auth.js handler
│       ├── auth/magic/send/              # POST: enviar magic link por email
│       ├── auth/magic/verify/            # GET: verificar token magic link
│       ├── admin/ingest/                 # POST: procesar PDF INH → MongoDB
│       ├── admin/topup/                  # GET: listar recargas pendientes
│       ├── admin/topup/[id]/review/      # POST: aprobar o rechazar recarga
│       ├── admin/handicapper-request/    # GET: listar solicitudes
│       ├── admin/handicapper-request/[id]/review/  # POST: aprobar/rechazar
│       ├── admin/users/                  # GET: buscar usuarios
│       ├── admin/users/[id]/roles/       # POST: actualizar roles
│       ├── exchange-rate/                # GET/POST: tasa BCV Bs/USD
│       ├── forecasts/                    # GET: pronósticos por reunión + access map
│       ├── forecasts/unlock/             # POST: desbloquear carrera (Gold o gratis)
│       ├── handicapper/forecast/         # POST/GET: crear/listar pronósticos propios
│       ├── handicapper-request/          # POST/GET: solicitar ser handicapper
│       ├── handicappers/[id]/follow/     # POST: seguir/dejar de seguir
│       ├── meetings/upcoming/            # GET: próximas reuniones
│       ├── meetings/[id]/races/          # GET: carreras de una reunión
│       ├── programa/[meetingId]/         # GET: público — inscritos + preview forecasts
│       ├── notifications/                # GET: notificaciones del usuario
│       ├── notifications/read-all/       # POST: marcar todas como leídas
│       ├── topup/                        # POST/GET: solicitudes de recarga
│       ├── topup/upload/                 # POST: subir comprobante de pago
│       └── user/
│           ├── billing/                  # GET/POST: perfil de facturación
│           └── transactions/             # GET: historial de transacciones Gold
├── auth.ts                               # Config NextAuth: Google + MagicLink + Telegram
├── middleware.ts                         # Protección rutas por rol (edge, getToken)
├── models/
│   ├── User.ts                           # Usuario (roles, balance Golds, consumos, follows)
│   ├── Track.ts                          # Hipódromo
│   ├── Meeting.ts                        # Reunión hípica
│   ├── Race.ts                           # Carrera individual
│   ├── Horse.ts                          # Ejemplar
│   ├── Person.ts                         # Jinete / Entrenador
│   ├── Entry.ts                          # Inscripción (ejemplar en carrera)
│   ├── Stud.ts                           # Cuadra / Stud
│   ├── HandicapperProfile.ts             # Perfil handicapper + stats de acierto
│   ├── HandicapperRequest.ts             # Solicitud de rol handicapper
│   ├── Forecast.ts                       # Pronóstico (hasta 5 marcas por carrera)
│   ├── GoldTransaction.ts                # Ledger de movimientos de Golds
│   ├── TopUpRequest.ts                   # Solicitudes de recarga Pago Móvil
│   ├── MagicToken.ts                     # Tokens magic link (TTL 15 min)
│   ├── ExchangeRate.ts                   # Tasa BCV manual (Bs/USD)
│   └── Notification.ts                   # Notificaciones in-app (TTL 90 días)
├── services/
│   ├── pdfProcessor.ts                   # Parser PDFs INH + detector de fuente (INH/HINAVA)
│   ├── parsers/
│   │   └── hinava.ts                     # Parser PDFs HINAVA (Hipódromo Valencia)
│   ├── ingestService.ts                  # Upsert idempotente en MongoDB
│   ├── forecastAccessService.ts          # Lógica freemium + notifyGoldLow
│   ├── forecastStatsService.ts           # Actualización automática stats handicapper
│   ├── followService.ts                  # Follow/unfollow + notifyFollowers
│   ├── notificationService.ts            # Servicio central notificaciones (10 tipos)
│   └── aiHandicapperService.ts           # Stubs: YouTube, OCR, audio (futuro)
├── components/
│   ├── SessionProviderWrapper.tsx        # Client wrapper NextAuth
│   ├── TopUpModal.tsx                    # Modal recarga Golds (4 pasos + tasa BCV)
│   ├── NotificationBell.tsx              # Campana 🔔 con badge + panel dropdown
│   └── WhatsAppButton.tsx                # Botón flotante soporte WhatsApp
└── lib/
    ├── mongodb.ts                        # Conexión singleton MongoDB
    └── constants.ts                      # GOLD_RATE, VENEZUELAN_BANKS, PAYMENT_DESTINATION
```

---

## ✅ Funcionalidades Completadas

### Autenticación y Usuarios
- [x] Google OAuth, Magic Link via Resend, Telegram Credentials
- [x] Middleware edge-compatible con `getToken()` — protege `/admin/*` y `/staff/*`
- [x] Roles: `customer | handicapper | staff | admin`
- [x] Auto-asignación rol admin al email `yolfry@gmail.com`
- [x] Solicitud y aprobación de rol handicapper
- [x] Al aprobar: si existe perfil ghost con mismo pseudónimo → se linkea automáticamente y se resetean las stats previas

### 🆕 Sistema de Métricas de Efectividad
- [x] **Evaluación automática** al guardar resultados: `hit1st / hit2nd / hit3rd / hitAny` en cada `Forecast.result`
- [x] **`/api/handicapper/[id]/stats`** — calcula on-the-fly: E1, E1-2, E1-3, E-General, ROI simulado + `byTrack[]` por hipódromo
- [x] **Filtro por `claimedAt`** — si el perfil fue reclamado por un handicapper real, stats solo cuentan desde esa fecha
- [x] **Reset automático al reclamar perfil ghost** — forecasts anteriores a `claimedAt` → `evaluated=false`
- [x] **`/api/handicapper/ranking`** — ranking global agregado, mínimo 5 carreras
- [x] **`scripts/backfill-forecasts.ts`** — evalúa pronósticos históricos sin re-subir imágenes (evaluó 259 en producción)

| Métrica | Descripción |
|---------|-------------|
| **E1** | % carreras donde la **1ª marca** fue el ganador |
| **E1-2** | % donde el ganador estuvo entre las **2 primeras** marcas |
| **E1-3** | % donde el ganador estuvo entre las **3 primeras** marcas |
| **E-General** | % donde el ganador estuvo en **cualquier** marca |
| **ROI** | Retorno simulado apostando 100 Bs a la 1ª marca cada carrera |

### 🆕 Ranking Público `/ranking`
- [x] Página pública accesible sin login — SEO indexada
- [x] Tabla ordenable por E1 / E1-2 / E1-3 / E-General con tabs
- [x] Medallas 🥇🥈🥉 top-3, barra visual por métrica activa, glosario
- [x] Mínimo 5 carreras evaluadas para aparecer (anti-ruido)

### 🆕 Resultados Oficiales INH (`/admin/ingest`)
- [x] Gemini Vision extrae resultados de imágenes (posición, dorsal, nombre, distancia, tiempo)
- [x] Tabla editable antes de guardar — revisión humana del resultado de IA
- [x] Cálculo de tiempos estimados: 1 cuerpo = 1 quinto (0.2s), acumulado desde 1er lugar, formato `sss.f` venezolano
- [x] `annualRaceNumber` (ej: C089) guardado en `Race`, `raceNumber` de jornada no se sobreescribe
- [x] Protección de sobreescritura: confirma si la carrera ya tiene status `finished`
- [x] Dividendos INH completos: GANADOR, PLACE, EXACTA, TRIFECTA, SUPERFECTA, TRIPLE_APUESTA, POOL_DE_4, CINCO_Y_SEIS, LOTO_HIPICO
- [x] Marker `NO_HUBO` para jugadas sin ganador
- [x] API `/api/horses/[id]/history` para historial de carrera de un caballo

### Pronósticos (`/pronosticos`) — mejoras
- [x] Forecasts **ordenados por E1 descendente** dentro de cada carrera
- [x] **Badge de posición global** 🥇🥈🥉 / `#N` en cada HandicapperBlock
- [x] Estadísticas **E1 + E-General en vivo** junto al nombre
- [x] Botón 🏆 en header → `/ranking`
- [x] Auth gate, 2 carreras gratis/reunión, factor de consenso, follow/unfollow

### Perfil Público `/handicapper/[id]`
- [x] Tabla E1 / E1-2 / E1-3 / E-General / ROI cargada on-the-fly
- [x] Desglose **por hipódromo** (La Rinconada vs Valencia) cuando hay datos de ambos
- [x] Nota de fecha de verificación si el perfil fue reclamado
- [x] Skeleton de carga, skeleton vacío con mensaje si no hay datos aún

### Homepage `/`
- [x] **Widget Top-3 ranking** 🥇🥈🥉 con E1 y link a `/ranking`
- [x] Preview expertos con blur/CTA para no registrados
- [x] Próximas reuniones con link a inscritos
- [x] Sticky bottom CTA para no logueados

### Ingestor Gemini (`/admin/intelligence`)
- [x] Pronósticos desde texto/tweet: extrae `raceNumber`, `dorsalNumber`, `rawName`, `rawLabel`, `hasOrder`
- [x] Match por dorsal (100%) → fallback similitud de nombre
- [x] Tabla comparación raw vs. DB con barra de confianza + corrección manual
- [x] Ghost `HandicapperProfile` + `ExpertSource` automáticos
- [x] Upsert por `(expertSourceId + raceNumber + meetingId)`, deduplicación por `contentHash`

### Ingesta de Inscritos (PDFs)
- [x] Parser PDF INH (La Rinconada) + HINAVA (Valencia) con detección automática de fuente
- [x] Upsert idempotente, UI drag & drop, modo debug

### Notificaciones In-App
- [x] `NotificationBell` 🔔 en headers, TTL 90 días, polling 30s
- [x] 10 triggers: recargas, solicitudes handicapper, pronósticos, reuniones, Gold bajo

### UI/UX y SEO
- [x] Open Graph + Twitter card, sitemap dinámico (incluye `/ranking`), robots.ts
- [x] OG image 1080×1080 para cards compartibles (`/api/og/forecast`)
- [x] `/retirados`: página pública con SEO, display tachado en `/pronosticos`
- [x] `/staff/fuentes`: catálogo de handicappers conocidos con estado en DB

---

## 🔜 Pendiente — Próximas Sesiones

### Alta prioridad
- [ ] **Manejo de retirados en stats** — cuando un caballo se retira, marcar el pronóstico que lo incluye sin penalizar las estadísticas del handicapper
- [ ] **Botón de compartir pronósticos** — card visual 1080×1080 para WhatsApp/Telegram, incentivo Golds por compartido que traiga nuevo usuario, límite diario
- [ ] **Notificación a seguidores** al publicar pronóstico externo (ghost handicapper)
- [ ] **Verificar compartir card ghost** desde `/handicapper/[id]` para staff/admin

### Media prioridad
- [ ] **Envío en lote ingestor Gemini** — todas las carreras de una pasada + modo carrera a carrera actual
- [ ] **Ingestor Gemini desde imagen/OCR** — ya existe `processImage`, esfuerzo bajo
- [ ] **Advertencia de fecha incorrecta** en ingestor Gemini — comparar fecha del texto con reunión seleccionada
- [ ] **Módulo Pollas** — gestión de jugadas grupales (scope separado)

### Baja prioridad
- [ ] **Tasa BCV automática** — scraping diario de bcv.org.ve (actualmente manual)
- [ ] **Notificaciones push** — Web Push API o Telegram Bot
- [ ] **PWA / App móvil** — instalable en Android/iOS
- [ ] **YouTube automático** — dividir transcript por carrera antes del prompt Gemini

---

## 🤔 Preguntas Abiertas / Decisiones de Diseño

### Ingestor Gemini — Estrategia de fuentes

El prompt actual funciona bien para **texto pegado directamente** (redes sociales, WhatsApp, imagen transcrita a mano). Las preguntas abiertas son:

1. **¿Sirve para transcripciones largas de YouTube?**
   - El prompt actual es minimalista (extrae solo dorsal/nombre/etiqueta). Para transcripciones largas (10-30 min) el riesgo es truncación aunque `max_tokens` está en 8192.
   - Opciones: (a) el staff copia solo la parte relevante, (b) dividir por carrera antes de enviar, (c) usar modelo con ventana más grande.

2. **¿Link de noticia / URL como fuente?**
   - Alternativa: el staff pega una URL y el modelo lee el contenido via OpenRouter (algunos modelos en OpenRouter soportan URLs directas).
   - Ventaja: menos trabajo manual. Desventaja: contenido externo puede cambiar/eliminarse, y agrega latencia.
   - Ideal: ofrecer ambas opciones (texto pegado + URL directa) en la misma UI.

3. **¿Estrategia multi-modal?**
   - **Texto pegado** (actual) → más barato y rápido.
   - **URL** → más cómodo para el staff, más caro (el modelo lee la página completa).
   - **Imagen/OCR** → para imágenes de WhatsApp sin transcribir manualmente.
   - **YouTube link** → transcripción automática via YouTube API o Whisper, luego el prompt procesa el texto.

4. **¿Cuándo es problemática la fecha incorrecta?**
   - Si el staff no lee la fecha y asigna la data a la reunión equivocada, los pronósticos quedan en la carrera incorrecta.
   - Mitigación posible: mostrar en la UI la fecha de la reunión seleccionada en grande + advertencia si el texto menciona una fecha diferente.

---

## 🚀 Deploy

### Opción A: Vercel (recomendado para MVP)

```bash
# 1. Conectar repo en vercel.com → Import Project
# 2. Configurar todas las variables de entorno en Vercel Dashboard
# 3. Agregar en Google Cloud Console:
#    URI de redirección: https://tudominio.com/api/auth/callback/google
# 4. Deploy automático en cada push a main
```

**Costos Vercel:**
- Hobby (gratis): suficiente para MVP y pruebas
- Pro ($20/mes): necesario si hay equipo o más de 100GB bandwidth

### Opción B: VPS / Servidor propio

```bash
npm run build
npm start
# o con PM2:
pm2 start npm --name "desafiohipico" -- start
```

Requiere: Node.js 20+, nginx como reverse proxy, SSL con Let's Encrypt.

### MongoDB Atlas
- **M0 (gratis):** suficiente para MVP y pruebas
- **M10 ($57/mes):** recomendado para producción con usuarios reales
- Configurar IP Whitelist: `0.0.0.0/0` para Vercel (IPs dinámicas)

### Checklist pre-deploy
- [ ] `AUTH_URL` apunta al dominio de producción
- [ ] `AUTH_SECRET` generado con `openssl rand -base64 32`
- [ ] Google OAuth: URI de callback actualizada
- [ ] Dominio verificado en Resend
- [ ] MongoDB Atlas: IP whitelist abierta para Vercel
- [ ] `NEXT_PUBLIC_WHATSAPP_NUMBER` con número real de soporte

---

## Lógica de Negocio

### Freemium
- **2 carreras gratis** por reunión por usuario (permanente, no se resetea por tiempo)
- **3ra carrera en adelante:** 1 Gold por carrera
- `staff`, `handicapper`, `admin` → acceso total gratuito siempre
- Una vez desbloqueada una carrera, queda desbloqueada para ese usuario para siempre

### Golds (créditos internos)

| Paquete | Golds | USD |
|---------|-------|-----|
| Starter | 40 | $10 |
| Popular | 100 | $25 |
| Pro | 200 | $50 |
| Elite | 400 | $100 |

- Pago exclusivamente por **Pago Móvil** venezolano
- Cuenta destino: BDV (0102), V-16108291, 04122220545
- Aprobación manual por admin/staff en `/admin/topup`
- Tasa BCV configurable manualmente en `/admin/exchange-rate`

### Roles

| Rol | Acceso |
|-----|--------|
| `customer` | 2 carreras gratis/reunión, paga Gold para más |
| `handicapper` | Acceso total gratuito + puede subir pronósticos |
| `staff` | Acceso total gratuito + panel admin (sin gestión de roles) |
| `admin` | Todo + gestión de usuarios, roles y configuración |

### Revenue Share
- Default: **70% handicapper / 30% plataforma**
- Configurable por handicapper en `HandicapperProfile.revenueSharePct`

---

## Scripts Útiles

```bash
# Desarrollo
npm run dev

# Verificar tipos TypeScript (0 errores esperados)
npx tsc --noEmit

# ── Migraciones / Backfill ──────────────────────────────────────────────────

# Evaluar pronósticos históricos sin re-subir imágenes (conecta directo a MongoDB)
npx tsx scripts/backfill-forecasts.ts

# One-time: fix POOL_4 → POOL_DE_4 en Race.games (ya ejecutada Mar 2026)
npx tsx scripts/migrate-pool4.ts

# One-time: fix usuarios con balance=0 (ya ejecutada Feb 2026)
node --env-file=.env scripts/fix-balance.mjs

# ── Tests manuales ──────────────────────────────────────────────────────────

# Test ingestión PDF (modo debug — muestra texto extraído)
curl -X POST 'http://localhost:3000/api/admin/ingest?debug=true' \
  -F 'file=@"Ejemplares inscritos reunión 9.pdf"'

# Test ranking de handicappers
curl http://localhost:3000/api/handicapper/ranking

# Test stats de un handicapper específico
curl http://localhost:3000/api/handicapper/HANDICAPPER_ID/stats

# Test tasa BCV
curl http://localhost:3000/api/exchange-rate
```

---

## Usuarios de Prueba

| Email | Rol | Notas |
|-------|-----|-------|
| `yolfry@gmail.com` | admin | Auto-asignado en cada login |
| Cualquier Google | customer | Rol por defecto |

---

*Ver [`CONTEXT.md`](./CONTEXT.md) para documentación técnica detallada orientada a LLMs y nuevos desarrolladores.*
