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
import Forecast from '@/models/Forecast';
import User from '@/models/User';
import { Types } from 'mongoose';
import { notifyHandicapperRequestApproved, notifyHandicapperRequestRejected } from '@/services/notificationService';

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

      // Check if there's an existing profile for this userId already
      const existingByUser = await HandicapperProfile.findOne({ userId: request.userId });
      if (!existingByUser) {
        // Try to find a ghost profile with matching pseudonym to claim
        const ghostProfile = await HandicapperProfile.findOne({
          pseudonym: { $regex: `^${request.pseudonym.trim()}$`, $options: 'i' },
          isGhost: true,
        });

        if (ghostProfile) {
          // Link the real user to this ghost profile and reset pre-claim stats
          const claimDate = new Date();
          ghostProfile.userId = new Types.ObjectId(request.userId.toString());
          ghostProfile.isGhost = false;
          ghostProfile.claimedAt = claimDate;
          ghostProfile.bio = request.bio?.trim() || ghostProfile.bio;
          await ghostProfile.save();

          // Reset all forecasts created before claimDate so they don't pollute real stats
          await Forecast.updateMany(
            { handicapperId: ghostProfile._id, createdAt: { $lt: claimDate } },
            { $set: { 'result.evaluated': false } }
          );
        } else {
          // No ghost to claim — create a fresh profile
          await HandicapperProfile.create({
            userId: request.userId,
            pseudonym: request.pseudonym.trim(),
            bio: request.bio ?? '',
            isActive: true,
            isGhost: false,
            claimedAt: new Date(),
          });
        }
      }

      request.status = 'approved';
    } else {
      request.status = 'rejected';
      request.rejectionReason = rejectionReason?.trim() || 'No cumple los requisitos';
    }

    request.reviewedBy = new Types.ObjectId(session.user.id);
    request.reviewedAt = new Date();
    await request.save();

    // Notify the requester (fire-and-forget)
    if (action === 'approve') {
      notifyHandicapperRequestApproved(request.userId.toString(), request.pseudonym).catch(() => {});
    } else {
      notifyHandicapperRequestRejected(request.userId.toString(), rejectionReason?.trim() || 'No cumple los requisitos').catch(() => {});
    }

    return NextResponse.json({ success: true, status: request.status });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
