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
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

// ── Module-level helpers ──
function resolveTrackCode(t: any): string {
  if (!t) return '';
  if (t.code) return String(t.code).toUpperCase();
  const n = (t.name ?? '').toLowerCase();
  if (n.includes('rinconada') || n.includes('caracas')) return 'C';
  if (n.includes('valencia')) return 'V';
  return (t.name ?? '').slice(0, 1).toUpperCase();
}

function parseRaceTime(t: string | null | undefined): number | null {
  if (!t) return null;
  const s = t.trim();
  const colonIdx = s.indexOf(':');
  if (colonIdx !== -1) {
    const mins = parseFloat(s.slice(0, colonIdx));
    const secs = parseFloat(s.slice(colonIdx + 1));
    return isNaN(mins) || isNaN(secs) ? null : mins * 60 + secs;
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function calcDiffVsFirst(ownTime: string | null, wTime: string | null, pos: number | null): string | null {
  if (pos === 1) return null;
  const own = parseRaceTime(ownTime);
  const win = parseRaceTime(wTime);
  if (own === null || win === null || own <= win) return null;
  const cuerpos = Math.round(((own - win) / 0.2) * 10) / 10;
  return `${cuerpos} c`;
}

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
    const meetingDate = new Date(meeting.date);

    // ── Collect all horseIds across all races in this meeting ──
    const allEntries = await Entry.find({
      raceId: { $in: races.map((r: any) => r._id) },
    })
      .sort({ dorsalNumber: 1 })
      .populate({ path: 'horseId', model: Horse })
      .populate({ path: 'jockeyId', model: Person })
      .populate({ path: 'trainerId', model: Person })
      .populate({ path: 'studId', model: Stud })
      .lean() as any[];

    const horseIds: Types.ObjectId[] = allEntries
      .map((e: any) => e.horseId?._id)
      .filter(Boolean);

    // ── Fetch last race history for all horses in one query ──
    // Get all past entries for these horses (races before this meeting date)
    const pastEntries = await Entry.find({
      horseId: { $in: horseIds },
      'result.finishPosition': { $exists: true },
    })
      .populate({ path: 'raceId', model: Race })
      .lean() as any[];

    // Fetch winner (pos=1) entries for all past races to get winner times
    const pastRaceIds = [...new Set(pastEntries.map((pe: any) => pe.raceId?._id?.toString()).filter(Boolean))];
    const winnerEntries = await Entry.find({
      raceId: { $in: pastRaceIds },
      'result.finishPosition': 1,
    }).select('raceId result').lean() as any[];
    const winnerTimeByRace = new Map<string, string>();
    for (const w of winnerEntries) {
      if (w.result?.officialTime) {
        winnerTimeByRace.set(w.raceId?.toString(), w.result.officialTime);
      }
    }

    // Only keep entries whose race date < this meeting date
    // Build horseId → sorted history (newest first, max 4)
    const historyByHorse = new Map<string, any[]>();
    for (const pe of pastEntries) {
      const race = pe.raceId as any;
      if (!race?.meetingId) continue;
      // We need the meeting date for this race — fetch lazily below
      const hid = pe.horseId?.toString() ?? pe.horseId;
      if (!hid) continue;
      if (!historyByHorse.has(hid)) historyByHorse.set(hid, []);
      historyByHorse.get(hid)!.push(pe);
    }

    // Fetch meeting dates for all referenced meetingIds
    const pastRaceList = pastEntries.map((pe: any) => pe.raceId).filter(Boolean) as any[];
    const pastMeetingIds = [...new Set(pastRaceList.map((r: any) => r.meetingId?.toString()).filter(Boolean))];
    const pastMeetings = await Meeting.find({ _id: { $in: pastMeetingIds } })
      .populate({ path: 'trackId', model: Track })
      .lean() as any[];
    const pastMeetingMap = new Map(pastMeetings.map((m: any) => [m._id.toString(), m]));

    // Build final history map: horseId → last 4 finished races before this meeting
    const finalHistoryMap = new Map<string, any[]>();
    for (const [hid, entries] of historyByHorse) {
      const withDate = entries
        .map((pe: any) => {
          const race = pe.raceId as any;
          const pm = pastMeetingMap.get(race?.meetingId?.toString());
          if (!pm) return null;
          const raceDate = new Date(pm.date);
          if (raceDate >= meetingDate) return null; // exclude current meeting
          return {
            date: pm.date,
            trackName: (pm.trackId as any)?.name ?? '',
            meetingNumber: pm.meetingNumber,
            raceNumber: race.raceNumber,
            distance: race.distance,
            conditions: race.conditions ?? '',
            dorsalNumber: pe.dorsalNumber,
            weight: pe.weightRaw ?? (pe.weight ? String(pe.weight) : ''),
            medication: pe.medication ?? null,
            jockeyName: (pe.jockeyId as any)?.name ?? '',
            finishPosition: pe.result?.finishPosition ?? null,
            officialTime: pe.result?.officialTime ?? null,
            winnerTime: winnerTimeByRace.get(race._id?.toString()) ?? null,
            diffVsFirst: calcDiffVsFirst(
              pe.result?.officialTime ?? null,
              winnerTimeByRace.get(race._id?.toString()) ?? null,
              pe.result?.finishPosition ?? null
            ),
            distanceMargin: pe.result?.distanceMargin ?? null,
            annualRaceNumber: race.annualRaceNumber ?? null,
            trackCode: resolveTrackCode((pm as any).trackId),
            isScratched: pe.result?.isScratched ?? false,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 4);
      finalHistoryMap.set(hid, withDate as any[]);
    }

    // ── Fetch workouts for all horses — from 60 days ago up to meeting date ──
    const workoutWindowStart = new Date(meetingDate);
    workoutWindowStart.setDate(workoutWindowStart.getDate() - 60);

    const allWorkouts = await WorkoutEntry.find({
      trackId: meeting.trackId,
      workoutDate: { $gte: workoutWindowStart, $lte: meetingDate },
    }).sort({ workoutDate: -1 }).lean() as any[];

    // Index workouts by normalised horse name → all workouts per horse sorted desc
    const workoutsByName = new Map<string, any[]>();
    for (const w of allWorkouts) {
      const key = w.horseName.toUpperCase().trim();
      if (!workoutsByName.has(key)) workoutsByName.set(key, []);
      workoutsByName.get(key)!.push(w);
    }

    // ── Build per-race response ──
    const raceMap = new Map(races.map((r: any) => [r._id.toString(), r]));

    const racesOut = races.map((race: any) => {
      const raceEntries = allEntries.filter(
        (e: any) => e.raceId?.toString() === race._id.toString()
      );

      const entriesOut = raceEntries.map((e: any) => {
        const horse = e.horseId as any;
        const horseName: string = horse?.name ?? '';
        const horseIdStr: string = horse?._id?.toString() ?? '';

        // Last 4 race results
        const raceHistory = finalHistoryMap.get(horseIdStr) ?? [];

        // Last race date for this horse (to filter workouts)
        const lastRaceDate = raceHistory.length > 0
          ? new Date(raceHistory[0].date)
          : null;

        // Workouts since last race (or last 60 days if no race), max 4
        const horseWorkouts = (workoutsByName.get(horseName.toUpperCase().trim()) ?? [])
          .filter((w: any) => !lastRaceDate || new Date(w.workoutDate) > lastRaceDate)
          .slice(0, 4)
          .map((w: any) => ({
            workoutDate: w.workoutDate,
            distance: w.distance,
            workoutType: w.workoutType,
            splits: w.splits,
            comment: w.comment,
            jockeyName: w.jockeyName,
            trainerName: w.trainerName,
            daysRest: w.daysRest ?? null,
          }));

        return {
          dorsalNumber: e.dorsalNumber,
          postPosition: e.postPosition,
          horseName,
          horseId: horseIdStr,
          jockeyName: (e.jockeyId as any)?.name ?? '',
          trainerName: (e.trainerId as any)?.name ?? '',
          studName: (e.studId as any)?.name ?? '',
          weightDeclared: e.weightRaw ?? (e.weight ? String(e.weight) : ''),
          medication: e.medication ?? null,
          implements: e.implements ?? null,
          status: e.status,
          finishPosition: e.result?.finishPosition ?? null,
          isScratched: e.result?.isScratched ?? false,
          raceHistory,
          workouts: horseWorkouts,
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
    });

    const hasWorkouts = allWorkouts.length > 0;

    return NextResponse.json({
      meeting: {
        id: String(meeting._id),
        meetingNumber: meeting.meetingNumber,
        date: meeting.date,
        status: meeting.status,
        trackName: track?.name ?? '',
        trackLocation: track?.location ?? '',
        trackCode: resolveTrackCode(track),
        isValencia: (track?.name ?? '').toLowerCase().includes('valencia'),
      },
      races: racesOut,
      hasWorkouts,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
