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
import { auth } from '@/auth';
import { getMeetingAccessMap } from '@/services/forecastAccessService';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
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

    const userId = session.user.id;

    // We need raceIds to build the map — pass empty array here,
    // getMeetingAccessMap will use totalRaces for the allowance calculation.
    // The frontend will request with the raceIds from the public endpoint.
    const raceIdsParam = searchParams.get('raceIds');
    const raceIds: string[] = raceIdsParam ? raceIdsParam.split(',').filter(Boolean) : [];

    await dbConnect();
    const meeting = await Meeting.findById(meetingId).lean<{ date: Date; status: string }>();

    // A meeting is "past" if its date (UTC-4 boundary = UTC+4h offset) is strictly before today's start
    // We use UTC midnight of the meeting date day — if that day < today → past
    const isPastMeeting = meeting
      ? (() => {
          const now = new Date();
          // Start of today in UTC-4 = UTC midnight + 4h
          const todayStartUTC4 = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            4, 0, 0, 0, // UTC 04:00 = UTC-4 00:00
          ));
          const meetingDate = new Date(meeting.date);
          // Compare dates only (strip time)
          const meetingDay = Date.UTC(meetingDate.getUTCFullYear(), meetingDate.getUTCMonth(), meetingDate.getUTCDate());
          const todayDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
          return meetingDay < todayDay;
        })()
      : false;

    const result = await getMeetingAccessMap(userId, meetingId, raceIds, totalRaces, isPastMeeting);

    // Expire pass if meeting is finished or its date is before today (day boundary, UTC-4 grace)
    let passUnlocked = result.passUnlocked;
    if (passUnlocked && meeting && !isPastMeeting) {
      const finished = meeting.status === 'finished' || meeting.status === 'cancelled';
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
      passUnlocked: isPastMeeting ? false : passUnlocked,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
