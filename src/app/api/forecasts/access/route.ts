/**
 * GET /api/forecasts/access?meetingId=&totalRaces=
 *
 * Lightweight per-user access check. Returns the access map for a meeting
 * (which races are unlocked) plus gold balance and pass status.
 *
 * force-dynamic — reads user session and DB state.
 * Does NOT fetch forecasts (those come from /api/forecasts/public).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getMeetingAccessMap } from '@/services/forecastAccessService';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });

    if (!token?.sub) {
      return NextResponse.json(
        { map: {}, freeRemaining: 0, goldBalance: 0, isPrivileged: false, passUnlocked: false },
        { status: 200 }
      );
    }

    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');
    const totalRaces = parseInt(searchParams.get('totalRaces') ?? '10', 10);

    if (!meetingId) {
      return NextResponse.json({ error: 'meetingId requerido.' }, { status: 400 });
    }

    const userId = token.sub;

    // We need raceIds to build the map — pass empty array here,
    // getMeetingAccessMap will use totalRaces for the allowance calculation.
    // The frontend will request with the raceIds from the public endpoint.
    const raceIdsParam = searchParams.get('raceIds');
    const raceIds: string[] = raceIdsParam ? raceIdsParam.split(',').filter(Boolean) : [];

    await dbConnect();
    const meeting = await Meeting.findById(meetingId).lean<{ date: Date; status: string }>();

    const result = await getMeetingAccessMap(userId, meetingId, raceIds, totalRaces);

    // Expire pass if meeting is finished or its date is before today (day boundary, UTC-4 grace)
    let passUnlocked = result.passUnlocked;
    if (passUnlocked && meeting) {
      const finished = meeting.status === 'finished' || meeting.status === 'cancelled';
      // Grace: pass valid through the end of meeting day (UTC midnight = next calendar day)
      const meetingDay = new Date(meeting.date);
      meetingDay.setUTCHours(23, 59, 59, 999);
      const pastDay = new Date() > meetingDay;
      if (finished || pastDay) passUnlocked = false;
    }

    return NextResponse.json({
      map: result.map,
      freeRemaining: result.freeRemaining === Infinity ? 99 : result.freeRemaining,
      goldBalance: result.goldBalance,
      isPrivileged: result.isPrivileged,
      passUnlocked,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
