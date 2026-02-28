import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import HandicapperProfile from '@/models/HandicapperProfile';
import Forecast from '@/models/Forecast';
import Race from '@/models/Race';
import Meeting from '@/models/Meeting';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();

  const profile = await HandicapperProfile.findById(id).lean();
  if (!profile || !profile.isActive || !profile.isPublic) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Find latest active meeting
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 7); // look up to 7 days ahead

  const meeting = await Meeting.findOne({
    date: { $gte: today, $lt: tomorrow },
    status: { $ne: 'cancelled' },
  }).sort({ date: 1 }).lean();

  type RaceRow = { raceId: string; raceNumber: number; distance: number; scheduledTime: string; conditions: string; isVip: boolean; uploadedByRole?: string; marks: object[] };
  const racesWithForecasts: RaceRow[] = [];

  if (meeting) {
    const races = await Race.find({ meetingId: meeting._id }).sort({ raceNumber: 1 }).lean();
    const forecasts = await Forecast.find({
      handicapperId: profile._id,
      meetingId: meeting._id,
      isPublished: true,
    }).lean();

    const forecastByRace = new Map(forecasts.map(f => [f.raceId.toString(), f]));

    for (const race of races) {
      const fc = forecastByRace.get((race._id as object).toString());
      if (!fc) continue;

      const marks = fc.isVip
        ? []
        : [...fc.marks].sort((a, b) => a.preferenceOrder - b.preferenceOrder);

      racesWithForecasts.push({
        raceId: (race._id as object).toString(),
        raceNumber: race.raceNumber,
        distance: race.distance ?? 0,
        scheduledTime: race.scheduledTime ?? '',
        conditions: race.conditions ?? '',
        isVip: fc.isVip,
        uploadedByRole: fc.uploadedByRole,
        marks,
      });
    }
  }

  return NextResponse.json({
    profile: {
      id: profile._id.toString(),
      pseudonym: profile.pseudonym,
      bio: profile.bio ?? null,
      isGhost: profile.isGhost,
      stats: profile.stats,
      createdAt: profile.createdAt,
    },
    meeting: meeting
      ? {
          id: meeting._id.toString(),
          meetingNumber: meeting.meetingNumber,
          date: meeting.date,
          trackName: (meeting as any).trackName ?? 'Hipódromo',
        }
      : null,
    races: racesWithForecasts,
  });
}
