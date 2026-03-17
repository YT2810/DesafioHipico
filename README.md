# 🏇 Desafío Hípico

**La plataforma de pronósticos hípicos de Venezuela.**

Desafío Hípico conecta a los mejores expertos (handicappers) con los aficionados a las carreras de caballos en Venezuela. Los handicappers publican sus picks y análisis; los usuarios los consumen con un sistema simple de créditos llamados Golds. Todo está construido para el celular, pensado para el venezolano que lleva su teléfono al hipódromo.

> **En producción:** [desafiohipico.com](https://www.desafiohipico.com) — Vercel + MongoDB Atlas
> **Contexto técnico completo → [`CONTEXT.md`](./CONTEXT.md)**

---

## ¿Qué resuelve?

Antes de Desafío Hípico, los pronósticos de los expertos hípicos venezolanos estaban dispersos: algunos en Twitter/X, otros en YouTube, otros en canales de Telegram privados. No había una fuente única, no había historial de aciertos, y el usuario no sabía en quién confiar.

La plataforma resuelve tres cosas:

1. **Concentración:** todos los pronósticos en un solo lugar, por carrera y jornada
2. **Transparencia:** cada handicapper tiene un perfil público con su porcentaje de acierto real (calculado automáticamente)
3. **Acceso justo:** 2 carreras gratis por jornada para cualquier usuario registrado; más carreras con Golds

---

## Cómo funciona

### Para el usuario
1. Entra a `/pronosticos`, selecciona la jornada y la carrera
2. Ve los pronósticos de los expertos ordenados por efectividad histórica
3. Las primeras 2 carreras son gratis; a partir de la 3ra paga 1 Gold
4. Recarga Golds por Pago Móvil (BDV) — el admin aprueba manualmente

### Para el handicapper
1. Solicita el rol desde su perfil
2. El admin aprueba y se crea su perfil público
3. El staff ingesta sus pronósticos desde Twitter/X, YouTube o imagen usando IA (Gemini)
4. Cada vez que hay resultados, el sistema evalúa automáticamente sus aciertos
5. Su ranking sube o baja según su historial real

### Para el admin/staff
- Ingestión de PDFs oficiales INH (La Rinconada) y HINAVA (Valencia) para crear el programa de cada jornada
- Ingestión de resultados desde imágenes usando Gemini Vision (OCR)
- Ingestor de pronósticos desde texto/tweets/transcripciones usando Gemini
- Panel de aprobación de recargas, usuarios y solicitudes

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 App Router + Turbopack |
| Base de datos | MongoDB Atlas (Mongoose 8) |
| Autenticación | Auth.js v5 beta (NextAuth) |
| Estilos | Tailwind CSS v4 |
| Lenguaje | TypeScript 5 (strict, 0 errores) |
| IA | Gemini 2.0 Flash via OpenRouter |
| Email | Resend API (magic links) |
| PDF Parsing | pdf-parse v1.1.1 (server-side, CJS) |
| Deploy | Vercel |

---

## Inicio rápido

```bash
npm install
npm run dev
```

Crea `.env` en la raíz:

```env
MONGODB_URI="mongodb+srv://..."
AUTH_SECRET="openssl rand -base64 32"
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="xxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="GOCSPX-xxxx"
RESEND_API_KEY="re_xxxx"
RESEND_FROM="Desafío Hípico <noreply@tudominio.com>"
NEXT_PUBLIC_WHATSAPP_NUMBER="584120000000"
OPENROUTER_API_KEY="sk-or-xxxx"
```

---

## Lo que está construido

### Núcleo del producto
- **`/pronosticos`** — dashboard principal: pronósticos por carrera, ordenados por efectividad (E1), auth gate, 2 gratis por jornada, pago con Golds, badge de ranking, estadísticas en vivo
- **`/resultados`** — resultados oficiales con posiciones, tiempos, dividendos completos y video resumen YouTube; ordenados por fecha
- **`/ranking`** — ranking público de handicappers con métricas E1/E1-2/E1-3/E-General, ordenable, sin login
- **`/handicapper/[id]`** — perfil público de cada experto con historial de aciertos y desglose por hipódromo
- **`/programa/[meetingId]`** — inscritos públicos con preview borroso de pronósticos (CTA para registro)
- **`/retirados`** — caballos retirados del día con SEO

### Ingesta de datos (el corazón operativo)
- **Parser PDFs INH** (La Rinconada) + **HINAVA** (Valencia): crea automáticamente el programa completo de la jornada — Meeting, Race, Entry, Horse, Jockey, Trainer, Stud — desde el PDF oficial
- **Ingestor Gemini** (`/admin/intelligence`): el staff pega texto (tweet, WhatsApp, transcripción de YouTube) y la IA extrae los pronósticos, los cruza con los inscritos reales, muestra tabla de revisión, y los publica
- **Ingestor de resultados** (`/admin/ingest`): el staff sube imagen del boletín INH y Gemini Vision extrae posiciones, tiempos y dividendos — tabla editable antes de confirmar
- **Evaluación automática**: al confirmar resultados, el sistema evalúa todos los pronósticos de esa carrera y actualiza las estadísticas de cada handicapper

### Sistema económico
- Golds (créditos): 1 Gold = $0.25 USD — paquetes de 40/100/200/400 Golds
- Pago Móvil BDV con aprobación manual por admin
- Revenue share configurable por handicapper (default 70/30)
- Historial de transacciones en perfil de usuario

### Sistema de notificaciones
10 tipos de notificación in-app: recargas aprobadas/rechazadas, nuevo pronóstico de experto seguido, nueva jornada disponible, Gold bajo, etc.

### SEO y compartibilidad
- Sitemap dinámico, robots.ts, Open Graph, Twitter Card
- JSON-LD para resultados de hipódromos (schema `SportsEvent`)
- SEO por hipódromo: "RESULTADOS LA RINCONADA", "RESULTADOS VALENCIA"
- Cards compartibles 1080×1080 para WhatsApp/Telegram (`/api/og/forecast`)

### Cintillo de expertos (ExpertTickerBar)
Marquee sticky bajo el header en `/pronosticos` que muestra el "fijo del día" de cada handicapper para la carrera actualmente seleccionada. Se actualiza automáticamente al cambiar de carrera.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx                    # Home
│   ├── pronosticos/page.tsx        # Dashboard principal
│   ├── resultados/                 # Resultados de carreras
│   ├── ranking/page.tsx            # Ranking público
│   ├── handicapper/[id]/           # Perfil público handicapper
│   ├── programa/[meetingId]/       # Inscritos públicos
│   ├── retirados/                  # Retirados del día
│   ├── admin/                      # Panel admin
│   │   ├── ingest/                 # PDFs + resultados imagen
│   │   ├── intelligence/           # Ingestor Gemini pronósticos
│   │   ├── topup/                  # Recargas
│   │   ├── meetings/               # Video resumen jornadas
│   │   ├── users/                  # Usuarios y roles
│   │   └── exchange-rate/          # Tasa BCV
│   └── api/                        # Todos los endpoints
├── models/                         # Mongoose schemas
├── services/                       # Lógica de negocio
│   ├── pdfProcessor.ts             # Parser INH + HINAVA
│   ├── ingestService.ts            # Upsert idempotente
│   ├── forecastAccessService.ts    # Freemium + Golds
│   ├── forecastStatsService.ts     # Métricas handicappers
│   ├── notificationService.ts      # Central de notificaciones
│   └── followService.ts            # Follow/unfollow
├── components/
│   ├── ExpertTickerBar.tsx         # Cintillo sticky de expertos
│   ├── TopUpModal.tsx              # Recarga de Golds (4 pasos)
│   └── NotificationBell.tsx        # Campana con badge
└── lib/
    ├── mongodb.ts                  # Conexión singleton
    └── constants.ts                # Configuración central
```

---

## Pendiente

### Alta prioridad
- [ ] Manejo de retirados en estadísticas — si un caballo se retira, no penalizar al handicapper que lo tenía
- [ ] Notificaciones push — Telegram Bot o Web Push API
- [ ] Panel admin para TickerSlots — sponsors y promos en el cintillo

### Media prioridad
- [ ] Módulo Pollas — jugadas grupales entre amigos
- [ ] Revista digital hípica — programa con trabajos, pedigree y rating propio
- [ ] Ingestor en lote — todas las carreras de una jornada en una sola pasada

### Baja prioridad
- [ ] Tasa BCV automática
- [ ] PWA instalable
- [ ] Soporte multi-hipódromo internacional

---

## Scripts útiles

```bash
# Verificar TypeScript (debe dar 0 errores)
npx tsc --noEmit

# Backfill de pronósticos históricos
npx tsx scripts/backfill-forecasts.ts

# Test ranking
curl http://localhost:3000/api/handicapper/ranking
```

---

## Usuarios de prueba

| Email | Rol |
|-------|-----|
| `yolfry@gmail.com` | admin (auto-asignado en cada login) |
| Cualquier Google | customer |

---

*Documentación técnica detallada → [`CONTEXT.md`](./CONTEXT.md)*
