/**
 * POST /api/forecasts/unlock
 * Body: { meetingId, raceId }
 * Consumes free quota or deducts 1 Gold to unlock a race's forecasts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { requestRaceAccess } from '@/services/forecastAccessService';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { meetingId, raceId } = await req.json();
    if (!meetingId || !raceId) {
      return NextResponse.json({ error: 'meetingId y raceId son requeridos.' }, { status: 400 });
    }

    const result = await requestRaceAccess(session.user.id, meetingId, raceId);

    if (!result.granted) {
      if (result.reason === 'already_unlocked') {
        return NextResponse.json({ alreadyUnlocked: true }, { status: 409 });
      }
      if (result.reason === 'insufficient_gold') {
        return NextResponse.json(
          { error: 'Saldo insuficiente de Golds.', goldRequired: result.goldRequired, currentBalance: result.currentBalance },
          { status: 402 }
        );
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
