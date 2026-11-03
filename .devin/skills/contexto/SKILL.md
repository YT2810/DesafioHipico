---
name: contexto
description: Lee DECISIONS.md y da el estado completo del proyecto — de dónde venimos, qué hicimos, hacia dónde vamos
triggers:
  - user
  - model
allowed-tools:
  - read
  - exec
---

Lee los siguientes archivos en orden y presenta un resumen ejecutivo:

1. Lee `DECISIONS.md` completo
2. Lee `AGENTS.md`
3. Ejecuta `git log --oneline -10` para ver los últimos cambios

Responde con:

## Estado actual — Desafío Hípico

**De dónde venimos**: [origen del proyecto, 2 líneas]

**Modelo de negocio activo**:
- Producto de pago: Pase Nacional (Bs. 6.000/sem · Bs. 20.000/mes)
- Golds: en desuso — no mencionar ni promover
- Publicidad: [slots activos, sponsors activos si los hay]

**Qué está construido**:
- Motor FV + backtesting + diagnóstico por carrera
- Sistema de ads 6 slots con backfill automático
- Landing /pase + auth + JWT hasActivePass
- SEO programático + LLM indexing (GPTBot, ClaudeBot, PerplexityBot)

**Decisiones clave recientes**: [últimas 3 de DECISIONS.md]

**Fase actual**: [según HOJA DE RUTA en DECISIONS.md]

**Próximo paso concreto**: [qué construir ahora mismo]

**Deuda técnica activa**:
- URL relativa en prerender (no bloquea producción)
- Duplicate indexes Mongoose en 4 modelos
- pronosticos_inline slot huérfano sin página
- Takeover Web y logo Gaceta PDF prometidos en media kit pero no implementados
