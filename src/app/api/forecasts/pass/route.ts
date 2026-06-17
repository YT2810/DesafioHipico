/**
 * POST /api/forecasts/pass
 * Purchase a Meeting Pass for a meeting, unlocking ALL races.
 * Body: { meetingId: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { purchaseMeetingPass } from '@/services/forecastAccessService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { meetingId } = await req.json();
    if (!meetingId) {
      return NextResponse.json({ error: 'meetingId es requerido.' }, { status: 400 });
    }

    const result = await purchaseMeetingPass(session.user.id, meetingId);

    if (!result.success) {
      if (result.reason === 'already_unlocked') {
        return NextResponse.json({ error: 'El Meeting Pass ya está activo para esta reunión.' }, { status: 409 });
      }
      return NextResponse.json(
        { error: 'Golds insuficientes para comprar el Meeting Pass.', currentBalance: result.currentBalance },
        { status: 402 }
      );
    }

    return NextResponse.json({ success: true, balanceAfter: result.balanceAfter });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
