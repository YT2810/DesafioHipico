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

## Inteligencia del Factor de Victoria — Informes Anuales Permanentes

Los hallazgos estadísticos, leyes por distancia/tamaño de lote, umbrales (`+40%`, `+50%`, `+60%`) y el backtesting del 5y6 viven en:

- `docs/fv-intelligence/INFORME_FV_2026.md` (y un archivo nuevo por cada año: `INFORME_FV_2027.md`, etc.)
- Servicio en vivo (100% solo lectura): `src/services/fvAccuracyService.ts` (`getFvLabAnalytics`)
- Vista Admin: `/admin` → pestaña `🧪 Laboratorio FV` (`src/app/admin/_components/LaboratorioFvTab.tsx`)

**Reglas obligatorias para agentes:**
1. **NUNCA borrar** los archivos dentro de `docs/fv-intelligence/`.
2. **Actualizar, no sobrescribir años anteriores:** Debido al parón hípico de diciembre en Venezuela, cada temporada anual se archiva en su propio documento (`INFORME_FV_<AÑO>.md`) y el Laboratorio FV permite filtrar por año (`?year=2026`, etc.).
3. Toda consulta analítica del Laboratorio FV debe ser estrictamente de solo lectura (`.lean()`), sin modificar ni corromper documentos de `Meeting`, `Race`, `Entry` o `Forecast`.

