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

Cuando el usuario o el agente tome una decisión importante, regístrala en `DECISIONS.md`.

## Cuándo invocar automáticamente
- Se elige una librería, patrón o enfoque sobre otro
- Se resuelve un bug con enfoque no obvio
- Se cambia un modelo de datos ya definido
- Se decide cambiar el alcance de una fase
- El usuario describe un nuevo requerimiento que modifica lo anterior
- Se descubre un edge case importante en el negocio
- Se cambia el modelo de negocio (precios, productos, reglas)

## Qué registrar

1. Lee `DECISIONS.md` para ver el formato existente
2. Agrega una nueva entrada en **DECISIONES DE ARQUITECTURA**:

```markdown
### [Fecha] Título corto de la decisión
**Decisión**: Qué se decidió, en una oración clara.
**Contexto**: Por qué surgió, qué problema resuelve.
**Alternativas consideradas**: Otras opciones evaluadas.
**Razón**: Por qué se eligió esta opción.
**Impacto**: Qué archivos/módulos afecta. Deuda técnica si aplica.
```

3. Si la decisión actualiza la hoja de ruta, modificar la sección **HOJA DE RUTA** también.
4. Al final de la sesión, agregar entrada en **REGISTRO DE SESIONES**:
   - Qué se construyó
   - Decisiones tomadas
   - Próximo paso concreto

## Después de editar DECISIONS.md

```bash
git add DECISIONS.md
git commit -m "docs: [tema de la decisión]"
```
