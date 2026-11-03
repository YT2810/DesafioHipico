# SEO, LLM Indexing y Rutas — Desafío Hípico

## Sitemap Programático Dinámico

`src/app/sitemap.ts` — se ejecuta en build y en cada revalidación ISR.

**Lógica de frecuencia inteligente:**
```typescript
function isRaceWeekend(): boolean {
  // Detecta sábado/domingo en hora venezolana (UTC-4)
  // En fin de semana de carreras → changeFrequency: 'hourly'
  // Entre semana → 'daily'
}
```

Genera 3 tipos de URLs:
1. **Páginas estáticas** con prioridades calibradas: `/` (1.0) → `/pronosticos` (0.95) → `/traqueos` (0.92) → `/retirados` (0.9) → `/retrospectos` (0.88)
2. **Reuniones dinámicas**: últimas 30 + próximas 14 desde MongoDB. Reuniones recientes (<3 días) → prioridad 0.9; antiguas → 0.7
3. **Traqueos por fecha**: hasta 60 fechas únicas de WorkoutEntry desde MongoDB

## LLM Indexing — Permitido Explícitamente

`src/app/robots.ts` — bloque dedicado a bots de IA:
```typescript
{
  // Allow AI crawlers explicitly for LLM indexing
  userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Googlebot-News'],
  allow: ['/', '/pronosticos', '/retirados', '/programa/', '/ranking',
          '/traqueos', '/retrospectos', '/revista/', '/resultados',
          '/handicapper/', '/publicidad'],
  disallow: ['/admin/', '/api/', '/staff/'],
}
```

**Por qué:** GPT, Claude y Perplexity indexan páginas para responder consultas de usuarios. Si alguien pregunta "quién ganó la carrera 5 en La Rinconada el domingo", Desafío Hípico puede aparecer como fuente citada. Acceso libre a todo el contenido editorial público.

**Falta implementar:** `llms.txt` (estándar Anthropic) en `/public/llms.txt` con descripción estructurada del sitio para citación directa por LLMs.

## Keywords por Capa (layout.tsx)

```
NAVEGACIONAL (marca):       "inscritos La Rinconada", "Gaceta Hípica"
TRANSACCIONAL (intención):  "retirados La Rinconada", "cuánto pagó el 5y6 hoy"
INFORMACIONAL (long-tail):  "pronósticos la rinconada hoy domingo", "datos La Rinconada"
MARCA competidora:          "Chicho Báez hípica", "Mundo Hípico Venezuela"
```

## Open Graph e Imágenes Dinámicas

- **Global:** `/api/og` — imagen 1200×630 generada con @vercel/og
- **Por reunión:** `/api/og/forecast?meetingId=X`
- **Por handicapper:** `/api/og/handicapper?id=X`
- Locale: `es_VE` en todos los OG tags

## JSON-LD Schema.org (layout.tsx)

```json
{
  "@type": "SportsOrganization",
  "name": "Desafío Hípico",
  "sport": "Horse Racing",
  "areaServed": { "@type": "Country", "name": "Venezuela" }
}
```

## Mapa Completo de Rutas

| Ruta | Tipo | SEO | Acceso |
|---|---|---|---|
| `/` | Static | index | Público |
| `/pronosticos` | Static | index | Público (FV bloqueado sin pase) |
| `/programa/[meetingId]` | Dynamic SSR | index | Público |
| `/retirados` | Dynamic SSR | index | Público |
| `/resultados` | Dynamic SSR | index | Público |
| `/retrospectos` | ISR 1h | index | Público |
| `/traqueos` | ISR 5m | index | Público |
| `/traqueos/[date]` | Dynamic SSR | index | Público |
| `/traqueos/valencia` | ISR 5m | index | Público |
| `/revista/[meetingId]` | Dynamic SSR | index | Público |
| `/ranking` | Static | index | Público |
| `/en-vivo` | Static | index | Público |
| `/handicapper/[id]` | Dynamic SSR | index | Público |
| `/pase` | Static | index | Público (landing de venta) |
| `/publicidad` | ISR 1h | index | Público (media kit) |
| `/perfil` | Static | noindex | Requiere login |
| `/admin/*` | Static | noindex | admin/staff |
| `/staff/*` | Static | noindex | staff |
| `/auth/*` | Static | noindex | — |

## Estrategia Anti-Sandbox Google

- URLs canónicas limpias sin query params (no `?meetingId=X`, sino `/programa/X`)
- `changeFrequency: 'hourly'` los fines de semana de carrera → señal de frescura
- Contenido editorial original en cada reunión (Gaceta/Revista) → diferenciación vs. sitios de solo datos
- Páginas públicas con datos reales (no muros totales) → crawleable por Google
- `max-snippet: -1` y `max-image-preview: large` en robots meta → Google puede mostrar extractos completos
