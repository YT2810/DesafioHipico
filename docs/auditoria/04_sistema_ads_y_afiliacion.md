# Sistema de Ads y Afiliación — Desafío Hípico

## Inventario de 6 Slots (Media Kit)

| Slot ID | Formato | Posición | Visibilidad |
|---|---|---|---|
| `header_leaderboard` | Barra superior fija | Global — todas las páginas | Desktop + Móvil |
| `sticky_mobile` | Barra inferior persistente | Global — todas las páginas | Solo móvil |
| `retrospectos_inline` | Banner in-text animado | Entre el contenido de retrospectos | Desktop + Móvil |
| `revista_inline` | Banner in-text animado | Dentro de la Gaceta digital | Desktop + Móvil |
| `resultados_inline` | Banner in-text animado | Página de resultados | Desktop + Móvil |
| `traqueos_inline` | Banner in-text animado | Página de traqueos (INH + Valencia) | Desktop + Móvil |

Slot huérfano (no renderizado): `pronosticos_inline` — existe en el enum pero ninguna página lo monta.

## Arquitectura de Backfill (Prioridad de Campañas)

```typescript
// src/services/adService.ts
const paid = campaigns.filter(c => !c.isHouseAd);
const pool = paid.length ? paid : campaigns;
// Si hay sponsor pago → solo sponsors pagos compiten
// Si no hay sponsor pago → house ads llenan el slot automáticamente
return pool[Math.floor(Math.random() * pool.length)];
```

Resultado operativo:
- Slot vendido → sponsor pago recibe 100% del tráfico
- Slot vacío → house ads rotan aleatoriamente
- Vencimiento del contrato → house ads regresan solos sin intervención

## Tracking First-Party (sin dependencia de plataforma de afiliados)

```
Impresión → navigator.sendBeacon('/api/ads/impression', {campaign, slot, page})
            → AdDailyStat.impressions++

Click    → /api/go/sponsor?campaign={slug}&slot={slot}&from={page}
         → AdDailyStat.clicks++
         → redirect a targetUrl con UTM (si es URL externa)

UTM automático para externos:
?utm_source=desafiohipico&utm_medium=banner&utm_campaign={slug}&utm_content={slot}

URLs internas (/pase): sin UTM, redirect directo
```

## Modelo de Datos de una Campaña

```typescript
// src/models/SponsorCampaign.ts
{
  slug: string,          // ID único — ej: "1xbet-a", "house-global-header"
  brand: string,         // Nombre del anunciante
  targetUrl: string,     // URL destino (externa o interna /pase)
  slots: AdSlot[],       // Qué slots ocupa
  active: boolean,       // On/Off sin borrar
  isHouseAd: boolean,    // true = Publicidad Propia (backfill)
  creative: {
    badgeText, title, subtitle, ctaText,
    logoUrl,             // URL del logo del anunciante
    accentColor,         // Color de marca (#hex)
  },
  startsAt, endsAt,      // Vigencia del contrato
  notes,                 // Notas internas
}
```

## Admin de Campañas (sin código)

`/admin` → pestaña Campañas:
- Crear/editar/pausar/eliminar campañas
- Botón "🏠 Sincronizar House Ads" → crea o actualiza las 9 house ads del sistema
- Templates 1xBET A/B/C listos para cuando se active el contrato
- Métricas en tiempo real: impresiones, clicks, CTR por slot (últimos 30 días)
- El copy, CTA, fechas, colores y activación se editan sin código

## House Ads del Sistema (9 campañas)

Todas apuntan a `/pase`, marcadas `isHouseAd: true`, se ocultan a usuarios con Pase activo:

| Slug | Slot | Ángulo |
|---|---|---|
| house-retrospectos-a | retrospectos_inline | Dolor post-jornada |
| house-retrospectos-b | retrospectos_inline | Beneficio estadístico |
| house-revista-a | revista_inline | Urgencia pre-carrera |
| house-revista-b | revista_inline | Prueba del algoritmo |
| house-resultados-a | resultados_inline | "El FV lo vio venir" |
| house-resultados-b | resultados_inline | "Para la próxima" |
| house-traqueos | traqueos_inline | Audiencia analista avanzada |
| house-global-header | header_leaderboard | Dato duro "79.9%" |
| house-global-sticky | sticky_mobile | Urgencia "¿Vas a jugar a ciegas?" |

## Componentes de Renderizado

**GlobalSponsorBanner** (`src/components/GlobalSponsorBanner.tsx`):
- Fetch client-side a `/api/ads/active?slots=header_leaderboard,sticky_mobile`
- Selección por usuario (no congelada por ISR)
- Logo pill: logoUrl → wordmark 1xBET → hexágono DH → iniciales 2 letras

**AnimatedSponsorBanner** (`src/components/AnimatedSponsorBanner.tsx`):
- Para slots in-text, recibe la campaña como prop desde el server component
- Animaciones CSS (gradiente sweep, shimmer, slide-up)
- Detector de variante: LVBP solo si badge explícito O campaña 1xBET con sufijo -b

## Lo que Falta para CPA Multi-País (Checklist TYM)

```
HOY:        Un link por campaña, sin geo-targeting
NECESITA:   Tabla AffiliateLinkByCountry { campaignId, countryCode, url }
            + Middleware Geo-IP que inyecta el link correcto antes del redirect
            + Edge Middleware en /api/go/sponsor para leer cf-ipcountry header
```
