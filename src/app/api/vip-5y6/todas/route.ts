/**
 * GET /api/vip-5y6/todas
 * Returns all active VIP 5y6 meetings across all tracks (sorted by date asc).
 * Used by the VipFiveAndSixWidget to show multi-meeting chip selector.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import { getAllActiveVipMeetings } from '@/services/fvAccuracyService';
import { hasActiveNationalPass, getCurrentWeekMondayStartUTC } from '@/services/forecastAccessService';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    await dbConnect();

    const session = await auth();
    const userId = session?.user?.id;
    const roles: string[] = (session?.user as any)?.roles ?? [];

    let isUnlocked = false;
    if (userId) {
      isUnlocked = roles.includes('admin') || roles.includes('staff')
        ? true
        : await hasActiveNationalPass(userId);
    }

    const meetings = await getAllActiveVipMeetings(isUnlocked);
    const weekStart = getCurrentWeekMondayStartUTC();

    return NextResponse.json({
      meetings,
      weekStartIso: weekStart.toISOString(),
      isLoggedIn: Boolean(userId),
      isUnlocked,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
