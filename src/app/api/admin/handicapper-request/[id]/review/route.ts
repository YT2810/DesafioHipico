/**
 * POST /api/admin/handicapper-request/[id]/review
 * Approve or reject a handicapper role request.
 * On approve: adds 'handicapper' role to user + creates HandicapperProfile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import HandicapperRequest from '@/models/HandicapperRequest';
import HandicapperProfile from '@/models/HandicapperProfile';
import User from '@/models/User';
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

    const request = await HandicapperRequest.findById(id);
    if (!request) return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
    if (request.status !== 'pending') {
      return NextResponse.json({ error: 'La solicitud ya fue procesada.' }, { status: 409 });
    }

    if (action === 'approve') {
      // Add handicapper role to user
      await User.findByIdAndUpdate(request.userId, {
        $addToSet: { roles: 'handicapper' },
      });

      // Create HandicapperProfile if not exists
      const existing = await HandicapperProfile.findOne({ userId: request.userId });
      if (!existing) {
        await HandicapperProfile.create({
          userId: request.userId,
          pseudonym: request.pseudonym,
          bio: request.bio ?? '',
          isActive: true,
        });
      }

      request.status = 'approved';
    } else {
      request.status = 'rejected';
      request.rejectionReason = rejectionReason?.trim() || 'No cumple los requisitos';
    }

    request.reviewedBy = new Types.ObjectId(session.user.id);
    request.reviewedAt = new Date();
    await request.save();

    return NextResponse.json({ success: true, status: request.status });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
