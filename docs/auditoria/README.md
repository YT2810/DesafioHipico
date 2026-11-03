# Auditoría Técnica — Desafío Hípico / Holding TYM

ADN completo del proyecto para replicación, fork y escalado Multi-Tenant.

## Archivos

| # | Archivo | Contenido |
|---|---|---|
| 01 | `01_arquitectura_y_tecnologias.md` | Stack exacto, estructura de carpetas, schemas MongoDB, pool de conexiones, ISR |
| 02 | `02_seo_llm_y_rutas.md` | Sitemap dinámico, LLM indexing, keywords por capa, JSON-LD, mapa de rutas |
| 03 | `03_psicologia_usuario_y_embudo.md` | Embudo de conversión, qué es público y por qué, mobile-first, posición de ads |
| 04 | `04_sistema_ads_y_afiliacion.md` | 6 slots del media kit, arquitectura backfill, tracking first-party, house ads |
| 05 | `05_factor_de_victoria_logica.md` | Algoritmo FV, diagnóstico, factor 5y6, backtesting, cómo abstraer para otros nichos |
| 06 | `06_auditoria_multi_tenant_tym.md` | Qué hardcodear vs. parametrizar, schemas abstractos, roadmap de extracción, checklist TYM |
| 07 | `07_deuda_tecnica_y_pendientes.md` | Warnings de build, features pausadas, descartados, seguridad, qué refactorizar |

## Cómo Usar Esta Documentación

**Si estás iniciando una nueva sesión o cambiando de modelo:**
1. Leer este README
2. Leer el archivo relevante según la tarea
3. Leer `AGENTS.md` en la raíz para reglas operativas actuales
4. Ejecutar `git log --oneline -10` para ver los últimos cambios

**Si estás haciendo un fork para un nuevo tenant:**
1. Leer `06_auditoria_multi_tenant_tym.md` completo
2. Seguir el checklist de "Qué Está Hardcodeado Hoy"
3. El roadmap de extracción está en la sección "Fases"

**Si estás mejorando el FV o el sistema de ads:**
1. Leer `05_factor_de_victoria_logica.md`
2. Leer `04_sistema_ads_y_afiliacion.md`
3. Nunca borrar `docs/fv-intelligence/INFORME_FV_*.md`

## Estado del Proyecto (Noviembre 2026)

- Sistema de ads: 6 slots funcionales con backfill automático
- Pase Nacional: único producto activo (Bs. 6.000/semana)
- FV Factor: Bs. 50 para todos los hipódromos desde 31/10/2026
- LLM indexing: GPTBot, ClaudeBot, PerplexityBot permitidos explícitamente
- Próximo: hipismo americano (subcarpeta /us/ en DH → nuevo dominio Anglo)
