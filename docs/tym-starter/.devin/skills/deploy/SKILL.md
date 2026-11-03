---
name: deploy
description: Protocolo de verificación y deploy a producción para proyectos TYM
triggers:
  - user
  - model
allowed-tools:
  - exec
---

## Protocolo obligatorio antes de cada push

```bash
npx tsc --noEmit   # verificar tipos
npm run build      # build completo
git push origin main
```

## Credenciales
- Token en `~/.git-credentials` — credential helper lo resuelve solo
- NUNCA poner token en el remote URL

## Commits
```bash
git commit -m "$(cat <<'EOF'
Título imperativo del cambio

Por qué se hizo (no el qué).

Generated with [Devin](https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
EOF
)"
```

## Post-deploy
- Vercel auto-despliega en cada push a `main`
- Registrar en DECISIONS.md sección REGISTRO DE SESIONES
