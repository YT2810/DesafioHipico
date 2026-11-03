---
name: ads-sistema
description: Arquitectura completa del sistema de publicidad — 6 slots, backfill, house ads, tracking, campañas
triggers:
  - user
  - model
allowed-tools:
  - read
---

## Los 6 Slots del Media Kit

| Slot ID | Página | Tipo de render |
|---|---|---|
| `header_leaderboard` | Global — todas las páginas | Client-side fetch `/api/ads/active` |
| `sticky_mobile` | Global — solo móvil | Client-side fetch `/api/ads/active` |
| `retrospectos_inline` | /retrospectos | Server-side ISR 1h |
| `revista_inline` | /revista/[id] | Server-side dinámico |
| `resultados_inline` | /resultados | Server-side dinámico |
| `traqueos_inline` | /traqueos + /traqueos/valencia | Server-side ISR 5m |

Slot huérfano (enum existe, no renderiza): `pronosticos_inline`

## Regla de Backfill (CRÍTICA)
```typescript
// src/services/adService.ts
const paid = campaigns.filter(c => !c.isHouseAd);
const pool = paid.length ? paid : campaigns;
// Sponsor pago → 100% del tráfico
// Sin sponsor → house ads llenan el slot automáticamente
```

## Archivos clave
| Archivo | Rol |
|---|---|
| `src/services/adService.ts` | `getActiveCampaign()`, `trackImpression()`, `trackClick()` |
| `src/models/SponsorCampaign.ts` | Schema: slug, brand, targetUrl, slots, isHouseAd, creative |
| `src/models/AdDailyStat.ts` | Métricas diarias: impressions, clicks por slot/campaña |
| `src/components/GlobalSponsorBanner.tsx` | Header + sticky — fetch client-side |
| `src/components/AnimatedSponsorBanner.tsx` | Banners in-text animados |
| `src/app/api/go/sponsor/route.ts` | Redirect rastreado con UTM |
| `src/app/api/ads/active/route.ts` | Endpoint de selección client-side |

## House Ads (9 campañas)
Todas `isHouseAd: true`, apuntan a `/pase`, se ocultan a usuarios con `hasActivePass`.
Botón admin: "🏠 Sincronizar House Ads" — crea faltantes y actualiza copy de existentes.

## Reglas del logo en banners
- `creative.logoUrl` → mostrar imagen
- Brand "1xBET" o slug empieza con "1xbet" → wordmark SVG
- Brand "Desafío Hípico" / house ad → hexágono DH desde `/logo-dh.png`
- Otros sin logo → iniciales de 2 letras

## Detección de variante 1xBET (NO confundir con house ads)
```typescript
const is1xBet = /1xbet/i.test(ad.slug) || /1xbet/i.test(ad.brand);
const isLVBP = /lvbp/i.test(ad.badgeText) || (is1xBet && /-b$/i.test(ad.slug));
const isExclusiva = is1xBet && /-c$/i.test(ad.slug);
// NUNCA activar LVBP por sufijo -b en house ads
```

## House ads ocultas a pagadores
```typescript
if (ad.isHouseAd && session?.user?.hasActivePass) return null;
// hasActivePass en JWT via hasActiveNationalPass(userId) — cubre semanal Y mensual
// session.user.passUnlocked NO existe (es por-reunión, no en token)
```
