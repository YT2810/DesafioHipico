# Deuda Técnica y Pendientes — Desafío Hípico

> Registro honesto de lo que no está resuelto, lo que se descartó y lo que hay que refactorizar antes del primer fork Multi-Tenant.

## Warnings Conocidos en el Build (No Bloquean Producción)

### 1. URL Relativa en Prerender
```
TypeError: Failed to parse URL from /api/meetings/recent?limit=30
```
**Causa:** Una página (probablemente el homepage o pronosticos) hace `fetch('/api/...')` con URL relativa durante el static generation de Next.js. Las rutas estáticas no tienen `NEXT_PUBLIC_BASE_URL` disponible en build.
**Fix:** Cambiar a `fetch(\`${process.env.NEXT_PUBLIC_BASE_URL}/api/meetings/recent?limit=30\`)` con fallback `http://localhost:3000`.
**Impacto actual:** No bloquea producción. La página carga correctamente en runtime.

### 2. Mongoose Duplicate Indexes
```
Warning: mongoose: Duplicate schema index on {"userId":1} for HandicapperProfile
Warning: mongoose: Duplicate schema index on {"pseudonym":1} for HandicapperProfile
Warning: mongoose: Duplicate schema index on {"meetingId":1} for MeetingSnapshot
Warning: mongoose: Duplicate schema index on {"token":1} for MagicToken
```
**Causa:** Los índices se declaran con `index: true` en el campo Y luego en `schema.index()` — duplicados.
**Fix:** Eliminar uno de los dos en cada modelo afectado.
**Impacto:** Solo warnings, los índices funcionan.

### 3. Edge Runtime Deshabilita Static Generation
```
⚠ Using edge runtime on a page currently disables static generation for that page
```
**Causa:** Middleware o layout usa `export const runtime = 'edge'` en páginas que podrían ser estáticas.

## Features Comentadas / Pausadas

### ElMelliChat (Fase 3)
```typescript
// src/app/layout.tsx
// import ElMelliChat from "@/components/ElMelliChat"; // TEMP: oculto hasta fase 3
```
El componente existe pero está desactivado. "Melli" es la IA conversacional de la plataforma — responde preguntas sobre el FV, carreras, y recomendaciones. Pausado por costo de tokens en producción masiva.

### Slot Huérfano `pronosticos_inline`
Existe en el enum `AdSlot` de `adService.ts` pero ninguna página lo renderiza. Decisión pendiente: activarlo dentro de `/pronosticos` como zona de monetización de sponsors externos, o eliminarlo del enum para limpiar.

## Formato del Media Kit vs. Implementación Real

| Prometido en `/publicidad` | Estado |
|---|---|
| Takeover Web | ❌ Solo en el media kit — no hay componente ni slot |
| Cabecera Principal (header_leaderboard) | ✅ Funcional |
| Sticky Mobile | ✅ Funcional |
| Retrospectos inline | ✅ Funcional |
| Revista inline | ✅ Funcional |
| Resultados inline | ✅ Funcional |
| Traqueos inline | ✅ Funcional |
| Logo en Gaceta PDF | ❌ GacetaPrintTemplate solo tiene logo DH — no campo sponsor |

**Takeover Web** requiere: slot `takeover` nuevo + CSS skin de fondo global en layout.tsx condicionado a que haya campaña `takeover` activa.

## Herramientas/Librerías Evaluadas y Descartadas

| Herramienta | Por qué se descartó |
|---|---|
| Stripe/PayPal | El mercado venezolano no tiene acceso fluido. Se adoptó Pago Móvil manual con revisión admin |
| Redis para caché | Costo adicional innecesario — la combinación ISR de Vercel + global.mongoose es suficiente para el volumen actual |
| Socket.io (tiempo real) | Las actualizaciones de retirados/resultados no requieren tiempo real — polling o ISR de corto intervalo es suficiente |
| Prisma ORM | Mongoose tiene mejor soporte para el tipado flexible que requiere el FV (campos dinámicos por carrera) |
| PlanetScale/Supabase | MongoDB cubre el caso de uso perfectamente con el schema de Meeting/Entry siendo semi-estructurado |

## Seguridad Implementada

- **Variables de entorno:** MONGODB_URI, NEXTAUTH_SECRET, OPENAI_API_KEY, RESEND_API_KEY — todas en Vercel env vars, nunca en el repositorio
- **Admin/Staff protegido:** `src/app/admin/layout.tsx` y `src/app/staff/panel/page.tsx` verifican rol antes de renderizar
- **Noindex en rutas privadas:** `/admin`, `/staff`, `/perfil`, `/auth` excluidos del sitemap y con `robots: noindex`
- **Magic Link auth:** Alternativa a password — token de un solo uso con expiración
- **Rate limiting:** No implementado a nivel de código — depende de Vercel's built-in. Para producción de alto volumen, agregar rate limiting en las rutas de auth y pago
- **Zod validation:** No implementado — validación manual en API routes. Refactorizar antes del fork Multi-Tenant

## Lo Que Refactorizar Antes del Primer Fork

Prioridad alta para hacer el código cloneable sin arrastrar deuda:

1. **Extraer constantes de dominio a config central:** `NEXT_PUBLIC_BASE_URL`, precios, hipódromos, nombre del producto — un solo archivo `config/tenant.ts`
2. **Resolver los 4 duplicate indexes de Mongoose** — limpieza de 20 minutos, elimina warnings en todos los deploys futuros
3. **Fix URL relativa en prerender** — el build queda completamente limpio
4. **Activar o eliminar `pronosticos_inline`** — el enum y el media kit deben estar sincronizados
5. **Zod en las API routes críticas** (topup, sponsors, auth) — antes de exponer el backend a múltiples tenants
6. **Documentar el Patrón Adapter** — `src/services/parsers/` necesita un README de cómo crear un nuevo parser para una fuente de datos distinta

## Metodología para Nuevas Sesiones o Cambio de Modelo

Si la sesión se interrumpe o se cambia de modelo de IA:

1. Leer `AGENTS.md` en la raíz — estado actual del sistema y reglas
2. Leer `docs/auditoria/` — ADN completo del proyecto
3. Leer `git log --oneline -20` — últimos cambios deployados
4. **Nunca** borrar `docs/fv-intelligence/INFORME_FV_*.md`
5. Verificar siempre con `npx tsc --noEmit` + `npm run build` antes de hacer push
6. Push siempre con `git push origin main` — credenciales en `~/.git-credentials`

## Golds — Sistema en Desuso

El sistema de Golds existe en el código (`GoldTransaction`, `/admin/gold-packages`, topup packages con tipo `gold`) pero **no se ofrece ni se promociona**. El único producto activo de pago es el **Pase Nacional**. No crear house ads, CTAs ni copy que mencione Golds.
