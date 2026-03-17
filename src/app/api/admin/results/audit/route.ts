/**
 * GET /api/admin/results/audit
 * Finds races where the winner's officialTime looks wrong:
 * - Winner time > 2nd place time (impossible)
 * - Winner has no officialTime at all
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Race from '@/models/Race';
import Entry from '@/models/Entry';
import Meeting from '@/models/Meeting';
import Track from '@/models/Track';

function parseTime(t: string | undefined): number | null {
  if (!t) return null;
  const long = t.match(/^(\d+):(\d{2})[.,](\d)$/);
  if (long) return (parseInt(long[1]) * 60 + parseInt(long[2])) * 5 + parseInt(long[3]);
  const short = t.match(/^(\d+)[.,](\d)$/);
  if (short) return parseInt(short[1]) * 5 + parseInt(short[2]);
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
    const roles: string[] = (token?.roles as string[]) ?? [];
    if (!token || !roles.some(r => ['admin'].includes(r))) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    await dbConnect();

    const finishedRaces = await Race.find({ hasResults: true }).select('_id raceNumber annualRaceNumber officialTime meetingId').lean() as any[];

    const issues: any[] = [];
    const noTime: any[] = [];

    for (const race of finishedRaces) {
      const entries = await Entry.find({ raceId: race._id })
        .select('result dorsalNumber')
        .populate({ path: 'raceId', select: 'raceNumber' })
        .lean() as any[];

      const winner = entries.find((e: any) => e.result?.finishPosition === 1);
      const second = entries.find((e: any) => e.result?.finishPosition === 2);

      const meeting = await Meeting.findById(race.meetingId).select('date meetingNumber trackId').lean() as any;
      const track = meeting ? await Track.findById(meeting.trackId).select('name code').lean() as any : null;

      const label = `${track?.code ?? '?'}${race.annualRaceNumber ?? race.raceNumber} — ${track?.name ?? ''} R${meeting?.meetingNumber ?? '?'} C${race.raceNumber}`;
      const meetingDate = meeting?.date ? new Date(meeting.date).toLocaleDateString('es-VE', { timeZone: 'UTC' }) : '?';

      // No official time at all
      if (!race.officialTime) {
        noTime.push({ raceId: race._id.toString(), label, date: meetingDate });
        continue;
      }

      if (!winner) continue;

      const winnerTime = parseTime(winner.result?.officialTime);
      const officialTime = parseTime(race.officialTime);
      const secondTime = second ? parseTime(second.result?.officialTime) : null;

      // Winner time > 2nd place time = impossible, data is bad
      if (winnerTime && secondTime && winnerTime > secondTime) {
        issues.push({
          raceId: race._id.toString(),
          label,
          date: meetingDate,
          officialTime: race.officialTime,
          winnerEntryTime: winner.result?.officialTime,
          secondEntryTime: second?.result?.officialTime,
          problem: 'Tiempo del ganador mayor que el 2°',
        });
      }

      // Winner entry time differs significantly from race officialTime
      if (winnerTime && officialTime && Math.abs(winnerTime - officialTime) > 2) {
        issues.push({
          raceId: race._id.toString(),
          label,
          date: meetingDate,
          officialTime: race.officialTime,
          winnerEntryTime: winner.result?.officialTime,
          problem: `Tiempo del ganador (${winner.result?.officialTime}) difiere del tiempo oficial de carrera (${race.officialTime})`,
        });
      }
    }

    return NextResponse.json({
      totalFinished: finishedRaces.length,
      issuesFound: issues.length,
      noOfficialTime: noTime.length,
      issues,
      noTime,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
