/**
 * POST /api/handicapper-request  — submit a request to become handicapper
 * GET  /api/handicapper-request  — get current user's own request status
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import HandicapperRequest from '@/models/HandicapperRequest';
import { Types } from 'mongoose';
import { notifyHandicapperRequestPending } from '@/services/notificationService';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const { pseudonym, bio } = await req.json();
    if (!pseudonym?.trim()) return NextResponse.json({ error: 'El seudónimo es requerido.' }, { status: 400 });

    await dbConnect();
    const userId = new Types.ObjectId(session.user.id);

    const existing = await HandicapperRequest.findOne({ userId });
    if (existing) {
      if (existing.status === 'pending') {
        return NextResponse.json({ error: 'Ya tienes una solicitud pendiente.' }, { status: 409 });
      }
      if (existing.status === 'approved') {
        return NextResponse.json({ error: 'Ya eres handicapper.' }, { status: 409 });
      }
      // rejected — allow re-apply
      existing.pseudonym = pseudonym.trim();
      existing.bio = bio?.trim() ?? '';
      existing.status = 'pending';
      existing.rejectionReason = undefined;
      existing.reviewedBy = undefined;
      existing.reviewedAt = undefined;
      await existing.save();
      notifyHandicapperRequestPending(session.user.id, pseudonym.trim()).catch(() => {});
      return NextResponse.json({ success: true, status: 'pending' });
    }

    await HandicapperRequest.create({ userId, pseudonym: pseudonym.trim(), bio: bio?.trim() ?? '' });
    notifyHandicapperRequestPending(session.user.id, pseudonym.trim()).catch(() => {});
    return NextResponse.json({ success: true, status: 'pending' });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    await dbConnect();
    const request = await HandicapperRequest.findOne({
      userId: new Types.ObjectId(session.user.id),
    }).lean();

    return NextResponse.json({ request: request ?? null });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
