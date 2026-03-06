/**
 * GET /api/horses/[id]/history
 * Returns the full race history for a horse, sorted newest first.
 * Each record includes: meeting, race details, finish result, jockey, trainer, payouts.
 * Used for the Gaceta Hípica-style horse profile card.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Entry from '@/models/Entry';
import Race from '@/models/Race';
import Meeting from '@/models/Meeting';
import '@/models/Track';
import '@/models/Person';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const entries = await Entry.find({ horseId: params.id })
      .populate('jockeyId', 'name licenseId')
      .populate('trainerId', 'name licenseId')
      .lean();

    if (!entries.length) {
      return NextResponse.json({ history: [] });
    }

    const raceIds = [...new Set(entries.map(e => e.raceId.toString()))];
    const races = await Race.find({ _id: { $in: raceIds } }).lean();
    const raceMap = Object.fromEntries(races.map(r => [r._id.toString(), r]));

    const meetingIds = [...new Set(races.map(r => r.meetingId.toString()))];
    const meetings = await Meeting.find({ _id: { $in: meetingIds } })
      .populate('trackId', 'name location')
      .lean();
    const meetingMap = Object.fromEntries(meetings.map(m => [m._id.toString(), m]));

    const history = entries
      .map(entry => {
        const race = raceMap[entry.raceId.toString()];
        if (!race) return null;
        const meeting = meetingMap[race.meetingId.toString()];
        if (!meeting) return null;
        const track = meeting.trackId as any;
        const jockey = entry.jockeyId as any;
        const trainer = entry.trainerId as any;

        return {
          entryId: entry._id.toString(),
          date: meeting.date,
          trackName: track?.name ?? '',
          trackLocation: track?.location ?? '',
          meetingNumber: meeting.meetingNumber,
          raceNumber: race.raceNumber,
          distance: race.distance,
          surface: race.surface,
          conditions: race.conditions,
          prizePool: race.prizePool,
          games: race.games,
          dorsalNumber: entry.dorsalNumber,
          postPosition: entry.postPosition,
          weight: entry.weight,
          medication: entry.medication,
          implements: entry.implements,
          jockey: jockey ? { name: jockey.name, licenseId: jockey.licenseId } : null,
          trainer: trainer ? { name: trainer.name, licenseId: trainer.licenseId } : null,
          result: entry.result ?? null,
          status: entry.status,
          payouts: race.payouts,
          officialTime: race.officialTime,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.date).getTime() - new Date(a!.date).getTime());

    return NextResponse.json({ history, total: history.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
