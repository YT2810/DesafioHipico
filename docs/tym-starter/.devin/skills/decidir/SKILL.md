---
name: decidir
description: Registra una decisión de negocio o arquitectura en DECISIONS.md — la memoria persistente del proyecto
triggers:
  - user
  - model
allowed-tools:
  - read
  - edit
  - exec
---

Registra decisiones importantes en `DECISIONS.md`. Invocar automáticamente cuando:
- Se elige una librería, patrón o enfoque sobre otro
- Se cambia un modelo de datos
- Se modifica el modelo de negocio (precios, productos, reglas)
- El usuario describe un nuevo requerimiento
- Se descubre un edge case importante

## Formato de entrada en DECISIONS.md

```markdown
### [Fecha] Título corto
**Decisión**: Qué se decidió.
**Contexto**: Por qué surgió, qué problema resuelve.
**Alternativas**: Otras opciones evaluadas.
**Razón**: Por qué se eligió esta opción.
**Impacto**: Archivos afectados. Deuda técnica si aplica.
```

Al final de cada sesión, agregar en **REGISTRO DE SESIONES**:
- Qué se construyó
- Decisiones tomadas
- Próximo paso concreto

```bash
git add DECISIONS.md && git commit -m "docs: [tema de la decisión]"
```
