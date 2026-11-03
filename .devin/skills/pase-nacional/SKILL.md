---
name: pase-nacional
description: Flujo completo del Pase Nacional — precios, auth, hasActivePass, landing /pase, TopUpModal
triggers:
  - user
  - model
allowed-tools:
  - read
---

## Productos activos
| Producto | Precio | Duración |
|---|---|---|
| Pase Nacional Semanal | Bs. 6.000 | 7 días |
| Pase Nacional Mensual | Bs. 20.000 | 30 días |

**Golds**: en desuso — sistema técnico existe pero NO se ofrecen ni promocionan.

## Flujo de pago
```
Usuario ve house ad / CTA → /pase (landing dedicada)
→ elige paquete → ingresa datos Pago Móvil
→ sube comprobante → admin revisa en /admin/topup
→ admin aprueba → TopupRequest status: 'approved'
→ hasActiveNationalPass(userId) retorna true
→ hasActivePass en JWT → contenido FV desbloqueado
```

## Archivos clave
| Archivo | Rol |
|---|---|
| `src/app/pase/page.tsx` | Landing de venta — checkout inline |
| `src/components/TopUpModal.tsx` | Modal de pago (también en /pronosticos) |
| `src/app/api/topup/` | POST pago, GET packages, GET payment-info |
| `src/app/admin/topup/` | Panel de revisión admin |
| `src/services/forecastAccessService.ts` | `hasActiveNationalPass(userId)` |
| `src/auth.ts` | Expone `hasActivePass` en JWT token |

## hasActivePass — campo correcto en sesión
```typescript
// auth.ts → callbacks.jwt → token.hasActivePass
// CORRECTO: session.user.hasActivePass (cubre semanal Y mensual)
// INCORRECTO: session.user.passUnlocked (es por-reunión, no existe en token)
```

## Qué desbloquea el Pase
- Diagnóstico FV completo por carrera (riskChips, favorChips, fvScope, recommendation)
- Cuadros de costo 5y6 con factor actual
- Widget VIP 5y6 flotante
- House ads ocultas (el pagador no ve publicidad interna)

## Destino de house ads
**Siempre `/pase`** — nunca `/pronosticos`. El usuario llega directo al checkout.

## Idempotencia de pagos
Los topups no tienen idempotencyKey crítico (son aprobados manualmente por admin). El anti-doble-cobro es el flujo manual de revisión.
