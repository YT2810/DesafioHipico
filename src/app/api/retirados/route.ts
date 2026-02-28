/**
 * GET /api/retirados?meetingId=
 * Public endpoint. Returns all scratched entries grouped by race for a meeting.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Entry from '@/models/Entry';
import '@/models/Horse';
import '@/models/Track';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');

    await dbConnect();

    // If no meetingId, return list of recent meetings (for selector)
    if (!meetingId) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      today.setTime(today.getTime() - 4 * 60 * 60 * 1000);

      let meetings = await Meeting.find({ date: { $gte: today } })
        .sort({ date: 1 })
        .limit(10)
        .populate('trackId', 'name location')
        .lean();

      if (meetings.length === 0) {
        meetings = await Meeting.find()
          .sort({ date: -1 })
          .limit(10)
          .populate('trackId', 'name location')
          .lean();
      }

      return NextResponse.json({
        meetings: meetings.map(m => ({
          id: m._id.toString(),
          meetingNumber: m.meetingNumber,
          date: m.date,
          trackName: (m.trackId as any)?.name ?? 'Hipódromo',
          trackLocation: (m.trackId as any)?.location ?? '',
        })),
      });
    }

    // Load meeting info
    const meeting = await Meeting.findById(meetingId)
      .populate('trackId', 'name location')
      .lean() as any;
    if (!meeting) {
      return NextResponse.json({ error: 'Reunión no encontrada.' }, { status: 404 });
    }

    // Load races for this meeting
    const races = await Race.find({ meetingId }).sort({ raceNumber: 1 }).lean();

    // Load ALL scratched entries for this meeting's races
    const raceIds = races.map(r => r._id);
    const scratchedEntries = await Entry.find({
      raceId: { $in: raceIds },
      status: 'scratched',
    })
      .populate('horseId', 'name')
      .sort({ dorsalNumber: 1 })
      .lean() as any[];

    // Group by raceId
    const byRace: Record<string, any[]> = {};
    for (const e of scratchedEntries) {
      const key = e.raceId.toString();
      if (!byRace[key]) byRace[key] = [];
      byRace[key].push({
        dorsal: e.dorsalNumber,
        horseName: e.horseId?.name ?? '—',
        scratchReason: e.result?.scratchReason ?? null,
        scratchedBy: e.metadata?.scratchedBy ?? null,
        scratchedAt: e.metadata?.scratchedAt ?? null,
      });
    }

    const raceList = races
      .map(r => ({
        raceId: r._id.toString(),
        raceNumber: r.raceNumber,
        distance: r.distance,
        scratched: byRace[r._id.toString()] ?? [],
      }))
      .filter(r => r.scratched.length > 0);

    const track = meeting.trackId as any;

    return NextResponse.json({
      meetingId,
      meetingNumber: meeting.meetingNumber,
      date: meeting.date,
      trackName: track?.name ?? 'Hipódromo',
      trackLocation: track?.location ?? '',
      totalScratched: scratchedEntries.length,
      races: raceList,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error interno' }, { status: 500 });
  }
}
