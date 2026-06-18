/**
 * POST /api/forecasts/pass
 * Purchase a Meeting Pass for a meeting, unlocking ALL races.
 * Body: { meetingId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { purchaseMeetingPass } from '@/services/forecastAccessService';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { meetingId, lockedRaces } = await req.json();
    if (!meetingId) {
      return NextResponse.json({ error: 'meetingId es requerido.' }, { status: 400 });
    }

    await dbConnect();
    const meeting = await Meeting.findById(meetingId).lean<{ date: Date; status: string }>();
    if (meeting) {
      const isOver = meeting.status === 'finished' || meeting.status === 'cancelled';
      const meetingDay = new Date(meeting.date);
      meetingDay.setUTCHours(23, 59, 59, 999);
      const pastDay = new Date() > meetingDay;
      if (isOver || pastDay) {
        return NextResponse.json(
          { error: 'Esta reunión ya finalizó. El Factor de Victoria no está disponible.' },
          { status: 410 }
        );
      }
    }

    const result = await purchaseMeetingPass(session.user.id, meetingId, lockedRaces ?? 1);

    if (!result.success) {
      if (result.reason === 'already_unlocked') {
        return NextResponse.json({ error: 'La jornada completa ya está desbloqueada.' }, { status: 409 });
      }
      return NextResponse.json(
        { error: 'Saldo insuficiente para desbloquear la jornada.', currentBalance: result.currentBalance, goldRequired: result.goldRequired },
        { status: 402 }
      );
    }

    return NextResponse.json({ success: true, balanceAfter: result.balanceAfter, goldSpent: result.goldSpent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
