/**
 * POST /api/admin/topup/[id]/review
 * Approve or reject a top-up request.
 * Body: { action: 'approve' | 'reject', rejectionReason?: string }
 * Requires role: admin | staff
 *
 * Two approval flows:
 *   - Pase Nacional (packageId resoluble) → activa el Pase, NO acredita Golds,
 *     publica ActivityEvent pass_activation para el social proof.
 *   - Legacy Golds (sin paquete resoluble y goldAmount > 0) → acredita balance.golds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import TopUpRequest from '@/models/TopUpRequest';
import User from '@/models/User';
import GoldTransaction from '@/models/GoldTransaction';
import ActivityEvent from '@/models/ActivityEvent';
import { Types } from 'mongoose';
import { notifyTopUpApproved, notifyTopUpRejected } from '@/services/notificationService';
import { getLiveTopUpPackages, resolveTopUpPackageIdSync } from '@/services/topupService';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const roles: string[] = (session.user as any).roles ?? [];
    if (!roles.some(r => ['admin', 'staff'].includes(r))) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { id } = await context.params;
    const { action, rejectionReason } = await req.json();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
    }

    await dbConnect();

    const request = await TopUpRequest.findById(id);
    if (!request) return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
    if (request.status !== 'pending') {
      return NextResponse.json({ error: `La solicitud ya fue ${request.status === 'approved' ? 'aprobada' : 'rechazada'}.` }, { status: 409 });
    }

    let activatedLabel: string | null = null;

    if (action === 'approve') {
      // Resolve whether this request is a National Pass (new or inferable legacy)
      const livePackages = await getLiveTopUpPackages();
      const packageId = resolveTopUpPackageIdSync(
        { packageId: (request as any).packageId, amountBs: request.amountBs },
        livePackages,
      );
      const pkg = packageId ? livePackages.find(p => p.id === packageId) ?? null : null;

      if (pkg) {
        // ═══ FLUJO PASE NACIONAL ═══
        // El Pase se activa vía hasActiveNationalPass (TopUpRequest aprobada esta semana
        // para semanal; packageId 'padrillo' / amountBs >= precio mensual en 30 días para mensual).
        // NO se acreditan Golds.
        if (!request.packageId) request.packageId = pkg.id;
        request.status = 'approved';
        activatedLabel = pkg.label;

        // Social proof: pass_activation event (fire-and-forget)
        ActivityEvent.create({
          type: 'pass_activation',
          userId: request.userId,
          message: pkg.passType === 'national_monthly'
            ? 'activó su Pase Mensual Nacional 👑'
            : 'activó su Pase Semanal Nacional 🎟️',
          meta: { packageId: pkg.id, amountBs: request.amountBs },
        }).catch(() => {});
      } else {
        // ═══ FLUJO LEGACY: solicitud de Golds ═══
        if (!request.goldAmount || request.goldAmount <= 0) {
          return NextResponse.json({ error: `La solicitud tiene goldAmount inválido (${request.goldAmount}). No se puede aprobar.` }, { status: 400 });
        }

        const user = await User.findById(request.userId);
        if (!user) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

        if (!user.balance || typeof user.balance !== 'object') {
          user.balance = { golds: request.goldAmount, diamonds: 0 } as any;
        } else {
          user.balance.golds = (user.balance.golds ?? 0) + request.goldAmount;
          user.balance.diamonds = user.balance.diamonds ?? 0;
        }
        const balanceAfter = user.balance.golds;
        await user.save();

        await GoldTransaction.create({
          userId: request.userId,
          type: 'purchase',
          amount: request.goldAmount,
          balanceAfter,
          description: `Recarga aprobada — Ref: ${request.referenceNumber}`,
          externalRef: request.referenceNumber,
        });

        request.status = 'approved';
      }
    } else {
      request.status = 'rejected';
      request.rejectionReason = rejectionReason?.trim() || 'Pago no verificado';
    }

    request.reviewedBy = new Types.ObjectId(session.user.id);
    request.reviewedAt = new Date();
    await request.save();

    // Notify the user of the result (fire-and-forget)
    if (action === 'approve') {
      const label = activatedLabel ?? `${request.goldAmount} Golds`;
      notifyTopUpApproved(request.userId.toString(), label).catch(() => {});
    } else {
      notifyTopUpRejected(request.userId.toString(), rejectionReason?.trim() || 'Pago no verificado').catch(() => {});
    }

    return NextResponse.json({
      success: true,
      status: request.status,
      packageLabel: activatedLabel,
      goldAmount: action === 'approve' && !activatedLabel ? request.goldAmount : 0,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
