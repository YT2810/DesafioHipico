/**
 * POST /api/forecasts/unlock
 * Body: { userId, meetingId, raceId }
 * Consumes free quota or deducts 1 Gold to unlock a race's forecasts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requestRaceAccess } from '@/services/forecastAccessService';

export async function POST(req: NextRequest) {
  try {
    const { userId, meetingId, raceId } = await req.json();

    if (!userId || !meetingId || !raceId) {
      return NextResponse.json({ error: 'userId, meetingId y raceId son requeridos.' }, { status: 400 });
    }

    const result = await requestRaceAccess(userId, meetingId, raceId);

    if (!result.granted) {
      if (result.reason === 'already_unlocked') {
        return NextResponse.json({ alreadyUnlocked: true }, { status: 200 });
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
