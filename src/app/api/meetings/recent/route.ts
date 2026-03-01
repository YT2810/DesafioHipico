/**
 * GET /api/meetings/recent
 * Returns the N most recent meetings (past + upcoming) sorted newest first.
 * Used by /staff/fuentes to show which sources have been ingested per meeting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import '@/models/Track';
import Race from '@/models/Race';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
    const roles: string[] = (token?.roles as string[]) ?? [];
    if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50);

    const meetings = await Meeting.find()
      .sort({ date: -1 })
      .limit(limit)
      .populate('trackId', 'name location')
      .lean();

    const enriched = await Promise.all(
      meetings.map(async (m) => {
        const raceCount = await Race.countDocuments({ meetingId: m._id });
        const track = m.trackId as any;
        return {
          _id: m._id.toString(),
          meetingNumber: m.meetingNumber,
          date: m.date,
          status: m.status,
          trackName: track?.name ?? 'Hipódromo',
          raceCount,
        };
      })
    );

    return NextResponse.json({ meetings: enriched });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
