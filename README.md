# 🏇 Desafío Hípico

**Marketplace de pronósticos hípicos para Venezuela.**
Plataforma freemium donde handicappers publican pronósticos y usuarios los consumen con un sistema de créditos (Golds). Pago vía Pago Móvil venezolano, aprobación manual por staff.

> **Estado actual (Feb 2026):** MVP funcional corriendo en local. Listo para deploy en Vercel + MongoDB Atlas.
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
| PDF Parsing | pdfjs-dist (server-side) |
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
│   ├── admin/
│   │   ├── ingest/page.tsx               # Ingestión PDFs INH (drag & drop + preview)
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
│   ├── pdfProcessor.ts                   # Parser PDFs oficiales INH
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
- [x] Google OAuth (credenciales reales configuradas)
- [x] Magic Link por email via Resend API (requiere dominio verificado en producción)
- [x] Telegram Credentials (estructura lista, validación HMAC pendiente)
- [x] Middleware edge-compatible con `getToken()` — protege `/admin/*` y `/handicapper/*`
- [x] `/auth/signin` con toggle Entrar/Registrarse
- [x] `/auth/error` con mensajes amigables por tipo de error OAuth
- [x] Roles: `customer | handicapper | staff | admin`
- [x] Auto-asignación rol admin al email `yolfry@gmail.com` en cada login
- [x] `/perfil`: saldo Golds, historial recargas + transacciones Gold, solicitud handicapper
- [x] Panel admin `/admin/users`: buscar, asignar/quitar roles
- [x] Solicitud de rol handicapper (form → pending → admin aprueba/rechaza)

### Pronósticos y Freemium
- [x] `/pronosticos` conectado a API real (eliminados todos los MOCK_MEETINGS)
- [x] Auth gate: usuarios no logueados ven pantalla de login con CTA
- [x] 2 carreras gratis por reunión, resto 1 Gold/carrera (permanente, sin reset)
- [x] Pronósticos VIP bloqueados para no suscriptores (teaser visible)
- [x] Factor de consenso visual por caballo (barra de porcentaje)
- [x] Follow/unfollow handicappers
- [x] Skeletons de carga para meetings y carreras
- [x] `/handicapper/forecast`: subir pronósticos por carrera (admin + handicapper)

### Sistema de Golds y Pagos
- [x] `TopUpModal` 4 pasos: paquete → perfil facturación → destino BDV → formulario → éxito
- [x] Perfil de facturación: nombre completo, cédula (prefijo V/E/J/P/G), teléfono (+58)
- [x] Paquetes: 40/100/200/400 Golds = $10/$25/$50/$100 USD
- [x] Tasa BCV manual: panel `/admin/exchange-rate`, muestra Bs en paquetes automáticamente
- [x] Alerta si tasa lleva >24h sin actualizar
- [x] Panel admin `/admin/topup`: aprobar/rechazar con motivo de rechazo
- [x] 16 bancos venezolanos con códigos BCV oficiales en constantes
- [x] Fix: documentos legacy con `balance: 0` (número) migrados a `{golds:0, diamonds:0}`

### Ingestión de Datos INH
- [x] Parser PDF INH calibrado al formato real (11 carreras, ejemplares, jinetes, pesos)
- [x] Upsert idempotente — mismo PDF no duplica datos
- [x] UI drag & drop con previsualización antes de confirmar ingestión
- [x] Modo debug para inspeccionar texto extraído del PDF

### Notificaciones In-App
- [x] Modelo `Notification` con 12 tipos, TTL 90 días automático (MongoDB TTL index)
- [x] `NotificationBell` 🔔 en header de `/` y `/pronosticos`: badge dorado, polling 30s
- [x] Marca como leídas al abrir el panel, links directos a la acción
- [x] **10 triggers activos:**

| Evento | Audiencia | Tipo |
|--------|-----------|------|
| Usuario envía recarga | Admin + Staff | `topup_pending` |
| Admin aprueba recarga | Usuario | `topup_approved` |
| Admin rechaza recarga | Usuario | `topup_rejected` |
| Usuario solicita ser handicapper | Admin + Staff | `handicapper_request` |
| Admin aprueba solicitud | Usuario | `request_approved` |
| Admin rechaza solicitud | Usuario | `request_rejected` |
| Handicapper publica pronóstico | Sus seguidores | `followed_forecast` |
| Admin ingesta PDF INH | Todos los usuarios | `new_meeting` |
| Admin ingesta PDF INH | Todos los handicappers | `new_meeting_hcp` |
| Usuario desbloquea con < 3 Golds | Usuario | `gold_low` |

---

## 🔜 Pendiente — Próximas Sesiones

### Infraestructura (hacer primero)
- [ ] **Comprar dominio** — `desafiohipico.com` o similar (Namecheap, Cloudflare Registrar)
- [ ] **Verificar dominio en Resend** → [resend.com/domains](https://resend.com/domains) para activar magic links
- [ ] **Deploy en Vercel** — conectar repo GitHub, configurar env vars, agregar callback URL en Google Cloud Console
- [ ] **Actualizar `AUTH_URL`** a `https://tudominio.com` en producción

### Funcionalidades pendientes
- [ ] **Telegram Mini App** — validar `initData` con HMAC-SHA256 en backend (`TELEGRAM_BOT_TOKEN`)
- [ ] **Resultados oficiales** — ingestar PDF de resultados INH, evaluar pronósticos automáticamente, actualizar stats
- [ ] **Tasa BCV automática** — scraping diario de bcv.org.ve (actualmente manual)
- [ ] **Notificaciones push** — Web Push API o Telegram Bot para notificaciones fuera de la app
- [ ] **Plan VIP handicapper** — usuarios pagan Gold para ver pronósticos VIP de un handicapper específico
- [ ] **Gaceta Hípica** — historial de ejemplares, estadísticas de caballos por pista

### Futuro / Paralelo
- [ ] **Módulo Pollas** — gestión de jugadas grupales con dinero real (scope separado, proyecto paralelo)
- [ ] **AI Handicapper** — ingestión desde YouTube, redes sociales, OCR, audio (stubs listos en `aiHandicapperService.ts`)
- [ ] **Dividendos** — cargar dividendos oficiales post-carrera
- [ ] **PWA / App móvil** — instalable en Android/iOS

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

# Verificar tipos TypeScript (0 errores)
npx tsc --noEmit

# Migración one-time: fix usuarios con balance=0 (ya ejecutada Feb 2026)
node --env-file=.env scripts/fix-balance.mjs

# Test ingestión PDF (modo debug — muestra texto extraído)
curl -X POST 'http://localhost:3000/api/admin/ingest?debug=true' \
  -F 'file=@"Ejemplares inscritos reunión 9.pdf"'

# Test ingestión completa
curl -X POST 'http://localhost:3000/api/admin/ingest' \
  -F 'file=@"Ejemplares inscritos reunión 9.pdf"'

# Test tasa BCV
curl http://localhost:3000/api/exchange-rate

# Test notificaciones (requiere sesión activa)
curl http://localhost:3000/api/notifications
```

---

## Usuarios de Prueba

| Email | Rol | Notas |
|-------|-----|-------|
| `yolfry@gmail.com` | admin | Auto-asignado en cada login |
| Cualquier Google | customer | Rol por defecto |

---

*Ver [`CONTEXT.md`](./CONTEXT.md) para documentación técnica detallada orientada a LLMs y nuevos desarrolladores.*
