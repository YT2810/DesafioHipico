# DECISIONS.md — Desafío Hípico
## Memoria persistente del proyecto: de dónde venimos, qué hicimos, hacia dónde vamos

> **Protocolo**: Este archivo es la fuente de verdad histórica. Cada decisión importante
> se registra aquí. El agente lo lee al inicio de cada sesión para tener contexto completo.
> Para registrar una nueva decisión, usa el skill `/decidir`.

---

## ORIGEN DEL PROYECTO (2024-2026)

### El problema que resolvemos
El hipismo venezolano no tenía una plataforma digital seria. Los apostadores buscaban inscritos, retirados y pronósticos en PDFs físicos, grupos de WhatsApp y sitios desactualizados. La oportunidad: ser la plataforma de referencia digital del hipismo venezolano con analítica propia.

### Producto central
**Factor de Victoria (FV)** — motor estadístico propio que rankea caballos por probabilidad relativa de ganar. Validado: 79.9% de los ganadores de La Rinconada 2026 salieron en el Top 3 del FV.

---

## MODELO DE NEGOCIO ACTUAL (Noviembre 2026)

- **Pase Nacional** — único producto activo: Bs. 6.000/semana, Bs. 20.000/mes
- **Golds** — en desuso. Sistema técnico existe pero NO se ofrecen ni promocionan
- **Publicidad** — 6 slots con backfill automático (house ads → sponsors pagos)
- **Futuro próximo**: Pase Americanas, hipismo americano en `/us/`, holding TYM

---

## DECISIONES DE ARQUITECTURA

### [Oct 2026] Stack: Next.js App Router + MongoDB + Vercel
**Decisión**: Next.js 16.x con App Router, MongoDB/Mongoose, deploy en Vercel.
**Razón**: ISR nativo, serverless sin gestión de infraestructura, MongoDB flexible para schemas semi-estructurados del FV.

### [Oct 2026] Pool de conexiones MongoDB con global cache
**Decisión**: Conexión cacheada en `global.mongoose` con `maxPoolSize: 10`.
**Contexto**: Vercel serverless crea funciones nuevas por request. Sin cache, cada request abría una conexión nueva → colapso del cluster en picos.
**Impacto**: `src/lib/mongodb.ts` — nunca modificar sin entender el patrón.

### [Oct 2026] ISR por página según frecuencia de cambio
**Decisión**: retrospectos=1h, publicidad=1h, traqueos=5m, slots globales=sin caché (force-dynamic).
**Razón**: Slots globales seleccionan campaña por usuario — ISR congelaría el mismo ad para todos.

### [Oct 2026] Sistema de ads first-party con backfill
**Decisión**: Sponsor pago gana el slot; house ads llenan slots vacíos automáticamente.
**Razón**: Estándar de la industria. Sponsor pago = 100% de tráfico comprometido. House ads no diluyen sponsors.
**Impacto**: `src/services/adService.ts` → `getActiveCampaign()`.

### [Oct 2026] hasActivePass en JWT (no passUnlocked)
**Decisión**: Exponer `hasActivePass` en el token JWT via `hasActiveNationalPass(userId)`.
**Contexto**: `passUnlocked` era un campo por-reunión calculado en servidor, no existía en sesión. House ads se mostraban a pagadores.
**Impacto**: `src/auth.ts`.

### [Oct 2026] Landing /pase en vez de modal en /pronosticos
**Decisión**: El checkout de Pase Nacional es `/pase` — URL real, indexable, compartible.
**Razón**: CTA en house ads que abre modal = click perdido. URL directa = conversión.

### [Oct 2026] Factor 5y6 con tramos históricos
**Decisión**: `get5y6FactorBs(dateStr)` devuelve 20/35/50 según la fecha.
**Contexto**: El INH cambió el multiplicador. El backtest histórico debe conservar su factor real de época.
**Tramos**: ≤2026-09-03 → Bs.20 | ≤2026-10-30 → Bs.35 | desde 2026-10-31 → Bs.50

### [Nov 2026] Arquitectura multi-tenant TYM Holding
**Decisión**: DH es el Repo 3 (boilerplate) del Holding TYM. El backend headless (Repo 2) y el super-admin (Repo 1) se construyen como repos separados.
**Razón**: Escalar a hipismo americano, loterías y otros nichos reutilizando el motor FV y el sistema de ads.
**Impacto**: `docs/auditoria/06_auditoria_multi_tenant_tym.md` — roadmap completo.

---

## HOJA DE RUTA

### ✅ Fase 1 — Plataforma base VE (Completada)
- Ingesta PDF INH/HINAVA → MongoDB
- Motor FV + backtesting
- Auth NextAuth + Pase Nacional
- Sistema de ads 6 slots + backfill + house ads
- SEO programático + LLM indexing

### 🔄 Fase 2 — Expansión inmediata (En curso)
- [ ] Hipismo americano: subcarpeta `/us/[track]/[date]` en DH
- [ ] Adapter Equibase para parsear programas americanos
- [ ] Skills de dominio DH (este commit)
- [ ] Deuda técnica: URL relativa en build, duplicate indexes Mongoose

### ⬜ Fase 3 — Holding TYM
- [ ] Repo 1: Super-Admin TYM (RBAC multi-tenant, email centralizado, jergario global)
- [ ] Repo 2: Backend headless (schemas abstractos Event/Participant/Result)
- [ ] Primer fork: racingtym.com para mercado Anglo
- [ ] Melli chat (ElMelliChat — actualmente comentado en layout)

---

## REGISTRO DE SESIONES

### [Nov 2026] Sesión — Auditoría ADN + Skills
**Construido**:
- `docs/auditoria/` — 7 archivos + README con ADN completo del proyecto
- `.devin/skills/` — 8 skills de dominio para DH
- `docs/tym-starter/` — starter kit para el holding TYM
- `DECISIONS.md` — este archivo, memoria persistente

**Próximo paso**: Aplicar adapter Equibase para hipismo americano, o arrancar Repo 1 TYM.

### [Oct 2026] Sesión — Factor 5y6 + Banners globales
**Construido**: Factor Bs.50 todos los hipódromos, banner global visual, logo DH, fix LVBP.
**Commits**: `048b278`, `5fa2109`, `170e0d1`

### [Oct 2026] Sesión — Sistema de ads completo
**Construido**: 6 slots, backfill, house ads (9 campañas), landing /pase, hasActivePass JWT.
**Commits**: `0afa9fe`, `de2b853`

### [Nov 2026] Sesión — Otorgar Pase manual (efectivo/regalo/cortesía)
**Decisión**: Nuevo endpoint `POST /api/admin/users/grant-pass` + UI "🎟️ Otorgar Pase" en `/admin/users`.
**Contexto**: Con el Pase Nacional activo no había forma de activar acceso por pago en efectivo o regalo — solo existía el flujo de solicitud+revisión vía Pago Móvil y la asignación manual de Golds.
**Seguridad**:
- **Solo rol `admin`** — ni siquiera `staff` (a diferencia de `/admin/topup/[id]/review`). Es la operación más delicada de la monetización: salta la verificación de pago por completo.
- `identifier` sanitizado contra regex injection (el endpoint de Gold no lo hace; este sí).
- Guard anti-duplicado: si el usuario ya tiene pase activo → `409 requiresConfirm`, el admin debe confirmar explícitamente.
- Auditoría: crea `TopUpRequest` pre-aprobado con `referenceNumber MANUAL-*`, `bank: Efectivo|Manual`, `adminNote` (nuevo campo en el modelo), `reviewedBy` = admin.
**Notas**: `amountBs` opcional para registrar efectivo recibido (0 = regalo). Las estadísticas de ingresos suman `amountUsd`, así que un regalo NO infla revenue. Dispara `ActivityEvent` pass_activation y notificación al usuario igual que una aprobación normal.

### [Nov 2026] Sesión — Filtro por pase + vista de usuario (solo lectura)
**Decisión**: `GET /api/admin/users?pass=activo|tuvo|nunca` + `GET /api/admin/users/[id]/vista`.
**Contexto**: No había forma de listar quién tiene pase activo/quién alguna vez lo tuvo, ni de verificar que una asignación manual (regalo/efectivo) llegó al usuario.
**Implementación**:
- `src/services/passService.ts` — replica las reglas de `hasActiveNationalPass` en batch: `getActivePassUserIds`, `getEverPassUserIds`, `getPassInfoForUser(s)` con `computePassInfo` (mensual > semanal > expired > never). 4 queries para una página de 20 usuarios, no N.
- Filtro en `/admin/users` con botones Todos/Pase activo/Tuvo/Nunca + badge por fila (👑 Mensual, 🎟️ Semanal, ⏰ Expirado).
- Vista de solo lectura en la tarjeta expandida: pase que ve el usuario + expiración, facturación completa, uso (jornadas/carreras), recargas y pases con motivo, notificaciones recibidas con leída/sin leer.
**Seguridad**: `/vista` solo rol `admin` (ni staff) — expone datos privados (notificaciones, documento de identidad vía billingComplete, historial). Semanal = semana calendario (reinicia lunes 00:00 VE), mensual = reviewedAt + 30d.
**Descartado por ahora**: impersonación real (JWT como otro usuario) — toca auth y permite actuar como el usuario. Solo si la vista de lectura resulta insuficiente.
