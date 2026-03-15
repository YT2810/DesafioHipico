/**
 * GET /api/resultados?limit=10&trackId=xxx&page=1
 *
 * Public endpoint — no auth required.
 * Returns finished meetings with their races, finish order, payouts, and summary video.
 * Used by /resultados page.
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

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 30);
    const page = Math.max(parseInt(searchParams.get('page') ?? '1'), 1);
    const skip = (page - 1) * limit;
    const trackIdFilter = searchParams.get('trackId');

    const meetingFilter: any = {
      status: { $in: ['finished', 'active'] },
    };
    if (trackIdFilter) meetingFilter.trackId = trackIdFilter;

    const [meetings, total] = await Promise.all([
      Meeting.find(meetingFilter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('trackId', 'name location')
        .lean(),
      Meeting.countDocuments(meetingFilter),
    ]);

    const enriched = await Promise.all(
      meetings.map(async (m: any) => {
        const track = m.trackId as any;

        // Fetch finished races for this meeting
        const races = await Race.find({ meetingId: m._id, status: 'finished' })
          .sort({ raceNumber: 1 })
          .lean() as any[];

        const racesWithResults = await Promise.all(
          races.map(async (race: any) => {
            // Fetch entries sorted by finishPosition
            const entries = await Entry.find({ raceId: race._id })
              .populate('horseId', 'name')
              .populate('jockeyId', 'name')
              .lean() as any[];

            const finishOrder = entries
              .filter((e: any) => !e.result?.isScratched && e.result?.finishPosition != null)
              .sort((a: any, b: any) => a.result.finishPosition - b.result.finishPosition)
              .map((e: any) => ({
                position: e.result.finishPosition,
                dorsal: e.dorsalNumber,
                horseName: e.horseId?.name ?? '—',
                jockeyName: e.jockeyId?.name ?? '—',
                officialTime: e.result?.officialTime,
                distanceMargin: e.result?.distanceMargin,
              }));

            const scratched = entries
              .filter((e: any) => e.result?.isScratched)
              .map((e: any) => ({
                dorsal: e.dorsalNumber,
                horseName: e.horseId?.name ?? '—',
                reason: e.result?.scratchReason,
              }));

            return {
              raceId: race._id.toString(),
              raceNumber: race.raceNumber,
              annualRaceNumber: race.annualRaceNumber,
              distance: race.distance,
              conditions: race.conditions,
              officialTime: race.officialTime,
              surface: race.surface,
              prizePool: race.prizePool,
              games: race.games ?? [],
              payouts: race.payouts ?? {},
              finishOrder,
              scratched,
            };
          })
        );

        return {
          meetingId: m._id.toString(),
          meetingNumber: m.meetingNumber,
          date: m.date,
          status: m.status,
          trackName: track?.name ?? 'Hipódromo',
          trackLocation: track?.location ?? '',
          summaryVideoUrl: m.summaryVideoUrl ?? null,
          races: racesWithResults,
          totalRaces: racesWithResults.length,
        };
      })
    );

    return NextResponse.json({
      meetings: enriched,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
