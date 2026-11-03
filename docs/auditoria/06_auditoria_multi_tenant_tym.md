# Auditoría Multi-Tenant — Roadmap TYM Holding

> Análisis de qué está hardcodeado en Desafío Hípico hoy vs. qué debe parametrizarse para convertirlo en el Boilerplate (Repo 3) del Holding TYM.

## Los 3 Repos del Holding TYM

```
Repo 1: Panel Super-Admin TYM
  → ERP privado: gestión de marcas, RBAC multi-tenant, email centralizado,
    diccionarios de jerga por país, repositorio de prompts/metodología

Repo 2: Backend Headless (Motor Core)
  → API serverless que procesa y expone datos a todos los frontends
  → Schemas abstractos: Event, Participant, Result, Prediction
  → Patrón Adapter: cada fuente de datos tiene su translator

Repo 3: Frontend Boilerplate
  → Fork de Desafío Hípico depurado de todo lo específico de VE/hipismo
  → Config por tenant: marca, colores, precios, terminología, slots de ads
  → Módulos activables: FV Engine, Paywall, Ad Inventory, Handicapper Profiles
```

## Dónde Está DH en Esta Arquitectura

DH hoy = **Repo 2 + Repo 3 mezclados** en un monorepo. Contiene embriones de Repo 1 (admin panel). La separación es el trabajo principal para el holding.

## Qué Está Hardcodeado Hoy → Debe Volverse Config por Tenant

| Elemento | Ubicación actual | Para Multi-Tenant |
|---|---|---|
| URL del dominio | `layout.tsx`, `sitemap.ts`, `robots.ts` | `NEXT_PUBLIC_BASE_URL` env var (ya está) |
| Hipódromos `inh`/`hinava` | Múltiples archivos, enum hardcodeado | Tabla `Track` dinámica (parcialmente así ya) |
| Precios del Pase | `constants.ts` / TopUpModal | Config por tenant en BD o env vars |
| Factor 5y6 (`50`) | `fvAccuracyService.ts` | Config por hipódromo en BD |
| Nombre del producto analítico | Strings "Factor de Victoria" por todo | CMS de Repo 1 |
| Terminología ("inscritos", "retirados") | Strings hardcodeados en UI | Jergario por locale (ya existe el modelo) |
| Colores/branding | Tailwind classes + CSS vars | Tema por tenant |
| Keywords SEO | `layout.tsx` global | Metadata por tenant en Repo 1 |
| Texto de house ads | `CampaignTab.tsx` templates | Admin por tenant |

## Schemas Que Deben Abstraerse (Repo 2)

**Actual (específico de hipismo):**
```
Meeting → Race → Entry → Forecast → Result
```

**Abstracto para cualquier vertical:**
```
Event      → Participant → Prediction → Result
(Reunión)    (Caballo)     (Pronóstico)  (Resultado)
(Sorteo)     (Número)      (Tendencia)
(Partido)    (Equipo)      (Señal)
```

El **patrón Adapter** ya existe en DH como los parsers PDF. Para el Repo 2:
```
DataSource (INH PDF)      → Adapter → Event/Participant/Result
DataSource (Equibase API) → Adapter → mismo esquema
DataSource (Lottery API)  → Adapter → mismo esquema
DataSource (Sports API)   → Adapter → mismo esquema
```

## Dos Modelos de Expansión del Holding

**Modelo A — Multi-Marca** (Hipismo VE vs. Hipismo Anglo):
```
Repo 2 (backend compartido)
  ├── desafiohipico.com  → español, jerga VE, FV venezolano
  └── racingtym.com      → inglés, jerga anglosajona, mismo motor FV
```
- Misma base de datos, dos frontends (dos forks del Repo 3)
- Estrategia de entrada: `/us/[track]` como subcarpeta de DH mientras el dominio anglo madura

**Modelo B — Multi-Locale** (Loterías, Finanzas):
```
Repo 2 (backend compartido)
  └── loteriastym.com
        ├── /ve/   → Lotería de Venezuela, jerga local
        ├── /us/   → Mega Millions, Powerball
        └── /co/   → Baloto, Chance
```
- Un dominio, routing por locale `[lang]/[country]/[product]`
- CMS de Repo 1 gestiona terminología por locale

## Roadmap de Extracción (Primer Fork: Hipismo Americano)

### Fase 1 — Subcarpeta Rápida (0 código nuevo, esta semana)
```
desafiohipico.com/us/[track]/[date]
→ Agregar adapter Equibase al parser existente
→ Nuevas rutas heredan auth, ads, SEO de DH
→ Monetiza con 1xBET US o RaceTrack afiliado
```

### Fase 2 — Separar Backend (4-6 semanas)
```
→ Mover schemas abstractos a Repo 2
→ API REST/GraphQL pública para frontends
→ Variables de entorno por tenant en Vercel
→ DH y racingtym.com apuntan al mismo Repo 2
```

### Fase 3 — Admin TYM (8-12 semanas)
```
→ Repo 1: panel donde se registran nuevas marcas
→ RBAC: cada tenant tiene su admin con scope limitado
→ Email centralizado: una instancia Resend, audiencias segmentadas
→ Repositorio de prompts: metodología del FV para nuevos nichos
```

## Lo Que NO Debe Copiarse en el Fork

- `docs/fv-intelligence/INFORME_FV_2026.md` → Es específico de DH/VE, no es boilerplate
- Slugs de house ads actuales → Cada tenant crea los suyos desde el admin
- Credenciales y .env.local → Cada deployment tiene sus propias vars
- Datos de MongoDB de producción → No migrar datos, solo el schema

## Checklist TYM vs. Estado Actual DH

| Item del Checklist | En DH | Para Repo 1/2/3 |
|---|---|---|
| Jerga por país | ✅ Jergario en DB | Repo 1: CMS de jerga centralizado |
| RBAC granular | ⚠️ Solo admin/staff global | Repo 1: scope por tenant/país |
| Email centralizado | ✅ Resend integrado | Repo 1: audiencias por marca |
| Schemas abstractos | ❌ Específicos de hipismo | Repo 2: Event/Participant |
| Patrón Adapter | ✅ Parsers PDF | Repo 2: factory de adapters |
| ISR / Edge Cache | ✅ Por página | Repo 3: plantilla con ISR lista |
| Muro de pago | ✅ Pase Nacional | Repo 3: módulo activable |
| Ad Inventory | ✅ 6 slots + backfill | Repo 3: slots parametrizables |
| Geo-IP middleware | ❌ No existe | Repo 3: Edge Middleware |
| CPA link rotation | ❌ Un link por campaña | Repo 2: AffiliateLinkByCountry |
| Sitemap programático | ✅ Dinámico con MongoDB | Repo 3: template parametrizable |
| GA4 + Search Console | ✅ GA4 integrado | Repo 3: env var NEXT_PUBLIC_GA_ID |
