---
name: tym-holding
description: Arquitectura del Holding TYM — roadmap multi-tenant, qué parametrizar, modelos de expansión
triggers:
  - user
  - model
allowed-tools:
  - read
---

## Los 3 Repos del Holding TYM

```
Repo 1: Panel Super-Admin TYM
  → ERP privado: marcas, RBAC multi-tenant, email centralizado,
    jergario global por país, repositorio de prompts/metodología

Repo 2: Backend Headless (Motor Core)
  → API serverless compartida por todos los frontends
  → Schemas abstractos: Event, Participant, Result, Prediction
  → Patrón Adapter: cada fuente de datos tiene su translator

Repo 3: Frontend Boilerplate (fork de DH)
  → Config por tenant: marca, colores, precios, terminología
  → Módulos activables: FV Engine, Paywall, Ad Inventory
```

## DH en la Arquitectura TYM
DH hoy = Repo 2 + Repo 3 mezclados. Contiene embriones de Repo 1 (admin panel).

## Dos Modelos de Expansión

**Modelo A — Multi-Marca (Hipismo):**
```
Backend compartido
  ├── desafiohipico.com  → VE, español, FV venezolano
  └── racingtym.com      → Anglo, inglés, mismo motor FV
```

**Modelo B — Multi-Locale (Loterías, Finanzas):**
```
Backend compartido
  └── loteriastym.com
        ├── /ve/  → sorteos VE, jerga local
        ├── /us/  → Mega Millions, Powerball
        └── /co/  → Baloto, Chance
```

## Qué Está Hardcodeado Hoy → Debe Parametrizarse

| Elemento | Ubicación | Para Multi-Tenant |
|---|---|---|
| Hipódromos `inh`/`hinava` | Múltiples archivos | Tabla Track dinámica (parcial) |
| Precios del Pase | TopUpModal | Config por tenant |
| Factor 5y6 Bs.50 | fvAccuracyService | Config por hipódromo en BD |
| Keywords SEO | layout.tsx | Metadata por tenant en Repo 1 |
| Colores/branding | Tailwind + CSS vars | Tema por tenant |

## Estrategia de Caja Rápida (HOY, sin nuevo dominio)
```
desafiohipico.com/us/churchill-downs/2026-11-01
→ hereda autoridad de DH mientras racingtym.com madura en Google
→ necesita: adapter Equibase + rutas /us/[track]/[date]
```

## Roadmap Práctico

**Fase 1 (esta semana):** Subcarpeta `/us/` en DH — adapter Equibase
**Fase 2 (4-6 semanas):** Separar backend → Repo 2 con schemas abstractos
**Fase 3 (8-12 semanas):** Repo 1 Super-Admin TYM con RBAC multi-tenant

## Referencia completa
`docs/auditoria/06_auditoria_multi_tenant_tym.md`
