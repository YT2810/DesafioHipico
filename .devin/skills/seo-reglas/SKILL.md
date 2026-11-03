---
name: seo-reglas
description: Reglas SEO de Desafío Hípico — sitemap dinámico, LLM indexing, keywords, rutas, frecuencias
triggers:
  - user
  - model
allowed-tools:
  - read
---

## Sitemap dinámico (src/app/sitemap.ts)
- Detecta fin de semana venezolano (UTC-4) → `changeFrequency: 'hourly'` en race weekends
- Genera URLs de reuniones (últimas 30 + próximas 14 desde MongoDB)
- Genera URLs de traqueos por fecha (últimas 60 desde WorkoutEntry)
- Reuniones recientes (<3 días) → prioridad 0.9; antiguas → 0.7

## Prioridades SEO por página
```
/ → 1.0 | /pronosticos → 0.95 | /en-vivo → 0.95
/traqueos → 0.92 | /retirados → 0.90 | /retrospectos → 0.88
/programa/[id] → 0.9 (reciente) / 0.7 (antiguo)
```

## LLM Indexing — regla inamovible
```typescript
// robots.ts — NO remover este bloque
{
  userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Googlebot-News'],
  allow: ['/', '/pronosticos', '/retirados', '/programa/', '/ranking',
          '/traqueos', '/retrospectos', '/revista/', '/resultados',
          '/handicapper/', '/publicidad'],
  disallow: ['/admin/', '/api/', '/staff/'],
}
```
GPT, Claude y Perplexity indexan el contenido → DH puede ser citado como fuente.

## URLs canónicas — nunca query params
- Correcto: `/programa/[meetingId]`
- Incorrecto: `/programa?meetingId=X`
- Admin, staff, perfil, auth → siempre `noindex`

## Keywords por capa (layout.tsx)
- **Navegacional**: "inscritos La Rinconada hoy", "Gaceta Hípica"
- **Transaccional**: "retirados La Rinconada", "cuánto pagó el 5y6 hoy"
- **Long-tail**: "pronósticos la rinconada hoy domingo", "datos La Rinconada"

## Open Graph
- Global: `/api/og` (1200×630, @vercel/og)
- Por reunión: `/api/og/forecast?meetingId=X`
- Por handicapper: `/api/og/handicapper?id=X`
- Locale: `es_VE` en todos los OG tags

## JSON-LD
- `SportsOrganization` en layout root
- `sport: "Horse Racing"`, `areaServed: Venezuela`

## Lo que falta (deuda SEO)
- `llms.txt` en `/public/` (estándar Anthropic para citación directa)
- Sitemap de imágenes
