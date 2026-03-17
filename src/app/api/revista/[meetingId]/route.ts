import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Entry from '@/models/Entry';
import Horse from '@/models/Horse';
import Person from '@/models/Person';
import Stud from '@/models/Stud';
import Track from '@/models/Track';
import WorkoutEntry from '@/models/WorkoutEntry';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;
  try {
    await connectMongo();

    const meeting = await Meeting.findById(meetingId).lean() as any;
    if (!meeting) return NextResponse.json({ error: 'Reunión no encontrada' }, { status: 404 });

    const track = await Track.findById(meeting.trackId).lean() as any;
    const races = await Race.find({ meetingId }).sort({ raceNumber: 1 }).lean() as any[];

    // Fetch workouts for this track in a window of 10 days before the meeting
    const meetingDate = new Date(meeting.date);
    const windowStart = new Date(meetingDate);
    windowStart.setDate(windowStart.getDate() - 10);

    const workoutsRaw = await WorkoutEntry.find({
      trackId: meeting.trackId,
      workoutDate: { $gte: windowStart, $lte: meetingDate },
    }).sort({ workoutDate: -1 }).lean() as any[];

    // Index workouts by normalised horse name → take most recent per horse
    const workoutMap = new Map<string, any>();
    for (const w of workoutsRaw) {
      const key = w.horseName.toUpperCase().trim();
      if (!workoutMap.has(key)) workoutMap.set(key, w);
    }

    const racesOut = await Promise.all(races.map(async (race: any) => {
      const entries = await Entry.find({ raceId: race._id })
        .sort({ dorsalNumber: 1 })
        .populate({ path: 'horseId', model: Horse })
        .populate({ path: 'jockeyId', model: Person })
        .populate({ path: 'trainerId', model: Person })
        .populate({ path: 'studId', model: Stud })
        .lean() as any[];

      const entriesOut = entries.map((e: any) => {
        const horseName: string = e.horseId?.name ?? '';
        const workout = workoutMap.get(horseName.toUpperCase().trim()) ?? null;

        return {
          dorsalNumber: e.dorsalNumber,
          postPosition: e.postPosition,
          horseName,
          jockeyName: e.jockeyId?.name ?? '',
          trainerName: e.trainerId?.name ?? '',
          studName: e.studId?.name ?? '',
          weightDeclared: e.weightRaw ?? (e.weight ? String(e.weight) : ''),
          medication: e.medication ?? null,
          implements: e.implements ?? null,
          status: e.status,
          finishPosition: e.result?.finishPosition ?? null,
          isScratched: e.result?.isScratched ?? false,
          workout: workout ? {
            workoutDate: workout.workoutDate,
            distance: workout.distance,
            workoutType: workout.workoutType,
            splits: workout.splits,
            comment: workout.comment,
            jockeyName: workout.jockeyName,
            trainerName: workout.trainerName,
            daysRest: workout.daysRest ?? null,
          } : null,
        };
      });

      return {
        raceId: String(race._id),
        raceNumber: race.raceNumber,
        annualRaceNumber: race.annualRaceNumber ?? null,
        distance: race.distance,
        scheduledTime: race.scheduledTime ?? '',
        conditions: race.conditions ?? '',
        prizePool: race.prizePool ?? { bs: 0, usd: 0 },
        games: race.games ?? [],
        status: race.status,
        entries: entriesOut,
      };
    }));

    return NextResponse.json({
      meeting: {
        id: String(meeting._id),
        meetingNumber: meeting.meetingNumber,
        date: meeting.date,
        status: meeting.status,
        trackName: track?.name ?? '',
        trackLocation: track?.location ?? '',
        isValencia: (track?.name ?? '').toLowerCase().includes('valencia'),
      },
      races: racesOut,
      hasWorkouts: workoutsRaw.length > 0,
      workoutCount: workoutMap.size,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
