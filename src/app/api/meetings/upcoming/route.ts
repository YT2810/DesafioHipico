/**
 * GET /api/meetings/upcoming
 * Returns the next N meetings with race count, sorted by date ascending.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import '@/models/Track';
import Race from '@/models/Race';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '5'), 20);

    // Venezuela is UTC-4; use start of local day to avoid excluding today's meetings
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    today.setTime(today.getTime() - 4 * 60 * 60 * 1000); // shift back 4h to cover VE timezone

    const meetings = await Meeting.find({ date: { $gte: today } })
      .sort({ date: 1 })
      .limit(limit)
      .populate('trackId', 'name location')
      .lean();

    // If no upcoming, return the most recent past ones
    const source = meetings.length > 0
      ? meetings
      : await Meeting.find()
          .sort({ date: -1 })
          .limit(limit)
          .populate('trackId', 'name location')
          .lean();

    const enriched = await Promise.all(
      source.map(async (m) => {
        const raceCount = await Race.countDocuments({ meetingId: m._id });
        const track = m.trackId as any;
        return {
          id: m._id.toString(),
          meetingNumber: m.meetingNumber,
          date: m.date,
          status: m.status,
          trackName: track?.name ?? 'Hipódromo',
          trackLocation: track?.location ?? '',
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
