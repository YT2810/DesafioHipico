/**
 * GET /api/en-vivo
 * Returns the active or next upcoming meeting with its stream URL and races.
 * Public endpoint — no auth required.
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Entry from '@/models/Entry';
import '@/models/Track';
import '@/models/Horse';
import '@/models/Person';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();

    const now = new Date();

    // Prefer: active → today scheduled → next upcoming → last finished
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setUTCHours(23, 59, 59, 999);

    let meeting = await Meeting.findOne({ status: 'active' })
      .sort({ date: -1 })
      .populate('trackId', 'name location')
      .lean() as any;

    if (!meeting) {
      meeting = await Meeting.findOne({ date: { $gte: todayStart, $lte: todayEnd } })
        .sort({ date: 1 })
        .populate('trackId', 'name location')
        .lean() as any;
    }

    if (!meeting) {
      meeting = await Meeting.findOne({ date: { $gte: now } })
        .sort({ date: 1 })
        .populate('trackId', 'name location')
        .lean() as any;
    }

    if (!meeting) {
      meeting = await Meeting.findOne()
        .sort({ date: -1 })
        .populate('trackId', 'name location')
        .lean() as any;
    }

    if (!meeting) {
      return NextResponse.json({ meeting: null, races: [], streamUrl: null });
    }

    // Fetch races for this meeting
    const races = await Race.find({ meetingId: meeting._id })
      .sort({ raceNumber: 1 })
      .lean() as any[];

    // For each race fetch entries with horse name + morningLineOdds
    const racesWithEntries = await Promise.all(
      races.map(async (race) => {
        const entries = await Entry.find({ raceId: race._id, 'result.isScratched': { $ne: true } })
          .populate('horseId', 'name')
          .populate('jockeyId', 'name')
          .lean() as any[];

        const horses = entries
          .sort((a, b) => a.dorsalNumber - b.dorsalNumber)
          .map(e => ({
            dorsal: e.dorsalNumber,
            name: (e.horseId as any)?.name ?? '—',
            jockey: (e.jockeyId as any)?.name ?? '—',
            odds: e.morningLineOdds ?? null,
            finishPos: e.result?.finishPosition ?? null,
            officialTime: e.result?.officialTime ?? null,
            isScratched: e.result?.isScratched ?? false,
          }));

        return {
          raceNumber: race.raceNumber,
          distance: race.distance,
          scheduledTime: race.scheduledTime,
          status: race.status,
          games: race.games ?? [],
          hasResults: race.hasResults ?? false,
          horses,
        };
      })
    );

    const track = meeting.trackId as any;

    return NextResponse.json({
      meeting: {
        id: meeting._id.toString(),
        meetingNumber: meeting.meetingNumber,
        date: meeting.date,
        status: meeting.status,
        trackName: track?.name ?? 'La Rinconada',
        streamUrl: meeting.streamUrl ?? null,
        summaryVideoUrl: meeting.summaryVideoUrl ?? null,
      },
      races: racesWithEntries,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
