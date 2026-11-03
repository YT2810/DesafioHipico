# TYM Holding — Starter Kit

Kit base para arrancar cualquier nuevo repo del holding TYM.
Copiarlo a la raíz del nuevo repo al hacer fork.

## Estructura

```
.devin/skills/          → Skills de proceso global (contexto, decidir, deploy)
.agents/skills/         → 8 skills de ingeniería (copiar de /home/ai/Taquillero/.agents/skills/)
DECISIONS.md            → Crear vacío con la plantilla de abajo
AGENTS.md               → Adaptar desde DesafioHipico/AGENTS.md
```

## Pasos para arrancar un nuevo repo TYM

1. Hacer fork de DesafioHipico (Repo 3 boilerplate)
2. Copiar esta carpeta `docs/tym-starter/` a la raíz del nuevo repo
3. Copiar `.agents/skills/` desde `/home/ai/Taquillero/.agents/skills/` (8 skills de ingeniería)
4. Crear `DECISIONS.md` con la plantilla de abajo
5. Adaptar `AGENTS.md`: cambiar nombre del proyecto, dominio, variables de entorno
6. Crear skills de dominio en `.devin/skills/[nombre-nicho]/SKILL.md`
7. Configurar variables de entorno en Vercel
8. Push a main → deploy automático

## Plantilla DECISIONS.md

```markdown
# DECISIONS.md — [Nombre del Proyecto]
## Memoria persistente del proyecto

> El agente lee este archivo al inicio de cada sesión.
> Para registrar una nueva decisión, usa el skill `/decidir`.

---

## ORIGEN DEL PROYECTO

### El problema que resolvemos
[Describir el problema de negocio]

### Producto central
[El "Factor de Victoria" de este nicho — el core IP diferenciador]

---

## MODELO DE NEGOCIO ACTUAL

- **Producto de pago**: [nombre, precio, duración]
- **Publicidad**: [slots activos]

---

## DECISIONES DE ARQUITECTURA

[Se registran aquí con /decidir]

---

## HOJA DE RUTA

### ⬜ Fase 1 — [Nombre]
- [ ] Tarea 1
- [ ] Tarea 2

---

## REGISTRO DE SESIONES

### [Fecha] Sesión inicial
**Construido**: Setup inicial del repo
**Próximo paso**: [Primera tarea]
```

## Skills de ingeniería (copiar de Taquillero)

Los 8 skills de `.agents/skills/` son genéricos y aplican a cualquier proyecto:

| Skill | Cuándo usar |
|---|---|
| `code-review-and-quality` | Antes de mergear cualquier cambio |
| `debugging-and-error-recovery` | Cuando algo se rompe |
| `frontend-ui-engineering` | Al construir o modificar UI |
| `incremental-implementation` | En cualquier feature multi-archivo |
| `interview-me` | Cuando un pedido es ambiguo |
| `planning-and-task-breakdown` | Para descomponer trabajo grande |
| `security-and-hardening` | En auth, inputs, APIs públicas |
| `test-driven-development` | Al implementar lógica nueva |

Fuente: `/home/ai/Taquillero/.agents/skills/`

## Skills de proceso global (incluidos aquí)

- `.devin/skills/contexto/` — estado del proyecto y roadmap
- `.devin/skills/decidir/` — registro de decisiones
- `.devin/skills/deploy/` — protocolo de push a producción

## Skills de dominio (crear por nicho)

Cada vertical necesita sus propios skills de dominio. Ejemplos:
- Hipismo americano: `/factor-victoria`, `/adapter-equibase`, `/racing-pools`
- Loterías: `/tendencias-sorteo`, `/pools-loteria`, `/geo-routing`
- Finanzas: `/senales-momentum`, `/risk-management`
