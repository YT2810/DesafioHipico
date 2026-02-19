/**
 * POST /api/admin/topup/[id]/review
 * Approve or reject a top-up request.
 * Body: { action: 'approve' | 'reject', rejectionReason?: string }
 * Requires role: admin | staff
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import TopUpRequest from '@/models/TopUpRequest';
import User from '@/models/User';
import GoldTransaction from '@/models/GoldTransaction';
import { Types } from 'mongoose';

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

    if (action === 'approve') {
      if (!request.goldAmount || request.goldAmount <= 0) {
        return NextResponse.json({ error: `La solicitud tiene goldAmount inválido (${request.goldAmount}). No se puede aprobar.` }, { status: 400 });
      }

      // Fetch current balance to compute balanceAfter
      const user = await User.findById(request.userId).select('balance').lean() as any;
      const currentGolds = user?.balance?.golds ?? 0;
      const balanceAfter = currentGolds + request.goldAmount;

      // Credit golds to user
      await User.findByIdAndUpdate(request.userId, {
        $inc: { 'balance.golds': request.goldAmount },
      });

      // Log transaction
      await GoldTransaction.create({
        userId: request.userId,
        type: 'purchase',
        amount: request.goldAmount,
        balanceAfter,
        description: `Recarga aprobada — Ref: ${request.referenceNumber}`,
        externalRef: request.referenceNumber,
      });

      request.status = 'approved';
    } else {
      request.status = 'rejected';
      request.rejectionReason = rejectionReason?.trim() || 'Pago no verificado';
    }

    request.reviewedBy = new Types.ObjectId(session.user.id);
    request.reviewedAt = new Date();
    await request.save();

    return NextResponse.json({
      success: true,
      status: request.status,
      goldAmount: action === 'approve' ? request.goldAmount : 0,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
