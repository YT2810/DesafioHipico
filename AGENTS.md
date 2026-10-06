# DesafioHipico — Instrucciones para agentes de IA

## Comandos del proyecto

```bash
# Desarrollo local
npm run dev

# Verificar tipos
npx tsc --noEmit

# Build
npm run build
```

## Git — Push a producción

Las credenciales de GitHub están guardadas en `~/.git-credentials` con permisos `600` (solo el usuario del sistema puede leerlo). El token **nunca** aparece en el remote URL ni en archivos del repositorio.

**Protocolo obligatorio antes de hacer push:**

1. NO pedir el token al usuario — ya está configurado.
2. NO poner el token en el remote URL.
3. Usar siempre:

```bash
git push origin main
```

El credential helper (`git config --global credential.helper store`) lo resuelve automáticamente.

Si el push falla por autenticación, verificar:
```bash
ls -la ~/.git-credentials       # debe existir con permisos -rw-------
git config --global credential.helper  # debe decir "store"
```

**Nunca** regenerar ni pedir nuevamente el token sin antes verificar los pasos anteriores.

## Stack

- Next.js 15 (App Router)
- MongoDB (Mongoose)
- Resend (email / broadcasts)
- TypeScript

## Hipódromos soportados

| Clave | Hipódromo | Formato PDF |
|---|---|---|
| `inh` | La Rinconada | INH — bloques `Carrera Programada:` |
| `hinava` | Nacional de Valencia | HINAVA — bloques `REUNION:` |

## Precios actuales de Golds (verificar en SiteConfig de MongoDB si hay duda)

| Plan | Bs | Golds |
|---|---|---|
| Arranque | 3.000 | 10 |
| Jinete | 5.000 | 20 |
| Padrillo | 10.000 | 50 |

- Carrera individual: 2 Golds
- Jornada completa: N° de carreras × 1 Gold
