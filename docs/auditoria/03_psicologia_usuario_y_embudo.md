# Psicología del Usuario y Embudo de Conversión — Desafío Hípico

## El Principio Base

Todo el diseño parte de una premisa: **el apostador venezolano ya sabe apostar, no necesita educación básica**. Lo que necesita es información de calidad antes de jugar. El embudo explota esa urgencia de información.

## Embudo Completo: 5 Pasos

```
1. ATRACCIÓN (SEO)
   Google → "retirados la rinconada" / "inscritos la rinconada hoy"
   Página pública: datos reales, sin login, sin paywall

2. ENGANCHE (Valor gratuito visible)
   Ve inscritos, retirados, traqueos — datos útiles
   Nota que hay pronósticos pero están bloqueados
   Curiosidad: "¿qué es el Factor de Victoria?"

3. REGISTRO (Barrera mínima)
   Google OAuth en un click → no requiere tarjeta
   Algunos Golds de bienvenida (legacy) → experimenta el FV

4. CONVERSIÓN (Paywall inteligente)
   Ve el FV parcialmente → diagnóstico bloqueado
   Banner house ad: "79.9% acierta el Top 3 del FV"
   CTA → /pase → Pase Semanal Bs. 6.000

5. RETENCIÓN
   House ads ocultos para pagadores (no se sienten perseguidos)
   Contenido VIP: 5y6 widget, diagnóstico completo, cuadros de costo
```

## Qué Es Público y Por Qué

| Contenido | Acceso | Razón psicológica |
|---|---|---|
| Inscritos / Programa | Público | Hook SEO + urgencia pre-carrera |
| Retirados | Público | Dato crítico de último momento, alta intención |
| Traqueos | Público | Señal de analista serio, atrae audiencia de calidad |
| Resultados | Público | Cierre emocional del ciclo (euforia/frustración) |
| Retrospectos | Público | Evidencia histórica del FV — "mira, el ganador estaba aquí" |
| Ranking handicappers | Público | Prueba social de credibilidad |
| FV marcas/picks (básico) | Público parcial | Ver la promesa sin poder actuar — crea tensión |
| Diagnóstico FV completo | Pase Nacional | El análisis accionable — el core del producto |
| 5y6 cuadros de costo | Pase Nacional | Dato concreto de inversión — requiere compromiso |

## Posición Psicológica de Cada Ad Slot

```
RETROSPECTOS — Usuario en modo análisis post-jornada
  Estado mental: "Qué pasó, tenía razón o no?"
  Ad: "¿Cuántos ganadores tenías en el FV de esta jornada?"
  Dolor explotado: remordimiento + curiosidad hacia el siguiente

REVISTA/GACETA — Usuario en modo preparación pre-carrera
  Estado mental: "Voy a jugar hoy, necesito información"
  Ad: "Ya tienes los inscritos. Falta saber quién va a ganar"
  Momento perfecto: máxima intención de compra

RESULTADOS — Post-carrera, euforia o frustración
  Estado mental: "Gané/perdí" o "estuvo cerca"
  Ad: "El ganador estaba en el Top 3 del FV. ¿Lo tenías?"
  Dolor: el batacazo que se avisó y no aprovechó

TRAQUEOS — Usuario analista avanzado, alta calidad
  Estado mental: "Estudio en profundidad antes de decidir"
  Ad: "Ya estudiaste los trabajos. El FV ya calculó quién corre mejor"
  Lógica: el siguiente paso natural en su proceso

HEADER (global) — Cualquier momento en cualquier página
  Copy corto: "79.9% acierta el Top 3 del FV" — dato duro, no promesa
  
STICKY MOBILE — Navegación móvil, momento de salida
  Copy: "¿Vas a jugar a ciegas hoy?" — urgencia sin agresividad
```

## Mobile-First: Qué Ve el Usuario Móvil

La mayoría del tráfico venezolano es móvil. Las decisiones de diseño:

- `sm:hidden` → sticky mobile solo en móvil (GlobalSponsorBanner)
- Subtítulo del header: `hidden sm:inline` → solo visible en desktop
- Banners in-text full-width en móvil, limitados a max-w en desktop
- Widget VIP 5y6: `fixed right-3 bottom-32` → flotante, no interfiere con contenido
- TopUpModal/PaseClient: diseño vertical mobile-first con pasos claros

## House Ads Ocultos a Pagadores (Retención)

```typescript
// AnimatedSponsorBanner.tsx y GlobalSponsorBanner.tsx
if (ad.isHouseAd && hasActivePass) return null;
```

**Por qué es correcto:** Un usuario que ya pagó y sigue viendo "Activa tu Pase" se siente engañado o ignorado. Ocultar los house ads al pagador:
- Mejora la experiencia del cliente de pago
- Hace visible la diferencia entre gratis y premium
- Reduce sensación de spam en el producto premium

## Espacios Listos para CPA de Terceros

El sistema de `SponsorCampaign` es un **gestor CPA first-party** listo para afiliados externos:

```
/api/go/sponsor?campaign={slug}&slot={slot}&from={page}
→ trackClick() en AdDailyStat
→ redirect con UTM a URL del afiliado

UTM generado automáticamente para URLs externas:
?utm_source=desafiohipico&utm_medium=banner&utm_campaign={slug}&utm_content={slot}
```

Lo que falta para un CPA completo del checklist TYM:
- Rotación de links por país/Geo-IP (falta middleware)
- Tabla de comisiones por click/conversión
- Dashboard de revenue por slot/campaña
