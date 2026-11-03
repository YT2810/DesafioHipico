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
3. Ejecuta `git log --oneline -10`

Responde con:

## Estado actual — [Nombre del Proyecto]

**De dónde venimos**: [origen, 2 líneas]
**Producto central**: [el core IP del nicho]
**Modelo de negocio**: [producto de pago + publicidad]
**Qué está construido**: [lista de lo que existe]
**Decisiones clave recientes**: [últimas 3 de DECISIONS.md]
**Fase actual**: [según HOJA DE RUTA en DECISIONS.md]
**Próximo paso concreto**: [qué construir ahora mismo]
**Deuda técnica activa**: [pendientes conocidos]
