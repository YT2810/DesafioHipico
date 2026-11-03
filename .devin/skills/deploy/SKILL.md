---
name: deploy
description: Protocolo completo de verificación y deploy a producción en Desafío Hípico
triggers:
  - user
  - model
allowed-tools:
  - exec
---

## Protocolo obligatorio antes de cada push

```bash
# 1. Verificar tipos
npx tsc --noEmit

# 2. Build completo
npm run build

# 3. Si todo pasa — push a producción
git push origin main
```

## Warnings conocidos que NO bloquean producción
- `TypeError: Failed to parse URL from /api/meetings/recent?limit=30` — pre-existente, build completa igual
- `Duplicate schema index` en HandicapperProfile, MeetingSnapshot, MagicToken — warnings, no errores
- `Using edge runtime disables static generation` — comportamiento esperado

## Credenciales
- Token en `~/.git-credentials` con permisos 600 — credential helper lo resuelve solo
- NUNCA poner token en el remote URL
- NUNCA pedir token al usuario — ya está configurado

## Commits
```bash
git commit -m "$(cat <<'EOF'
Título del cambio

Descripción del por qué (no del qué).

Generated with [Devin](https://devin.ai)

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>
EOF
)"
```

## Post-deploy
- Vercel auto-despliega en cada push a `main`
- Si cambió copy de house ads → Admin → Campañas → "🏠 Sincronizar House Ads"
- Si cambió lógica de auth → verificar que `hasActivePass` llega correctamente al cliente
