import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Race from '@/models/Race';
import Entry from '@/models/Entry';
import Forecast from '@/models/Forecast';
import { recalcHandicapperStats } from '@/services/handicapperStatsService';

export interface ResultFinishEntry {
  dorsalNumber: number;
  finishPosition: number;
  distanceMargin?: string;
  isDistanced?: boolean;
  isScratched?: boolean;
  scratchReason?: string;
  officialTime?: string;
}

export interface ResultPayoutRow {
  combination: string;
  amount: number;
}

export interface SaveResultsPayload {
  meetingId: string;
  raceNumber: number;
  annualRaceNumber?: number;
  officialTime?: string;
  timeSplits?: { distance: number; time: string }[];
  finishOrder: ResultFinishEntry[];
  payouts?: {
    winner?: ResultPayoutRow[];
    place?: ResultPayoutRow[];
    exacta?: ResultPayoutRow[];
    trifecta?: ResultPayoutRow[];
    superfecta?: ResultPayoutRow[];
    tripleApuesta?: ResultPayoutRow[];
    poolDe4?: ResultPayoutRow[];
    cincoYSeis?: ResultPayoutRow[];
    lotoHipico?: ResultPayoutRow[];
  };
}

export async function POST(req: NextRequest) {
  try {
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
    const roles: string[] = (token?.roles as string[]) ?? [];
    if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body: SaveResultsPayload = await req.json();
    const { meetingId, raceNumber, annualRaceNumber, officialTime, timeSplits, finishOrder, payouts } = body;

    if (!meetingId || !raceNumber || !finishOrder?.length) {
      return NextResponse.json({ error: 'Faltan campos requeridos: meetingId, raceNumber, finishOrder.' }, { status: 400 });
    }

    await dbConnect();

    const race = await Race.findOne({ meetingId, raceNumber });
    if (!race) {
      return NextResponse.json({ error: `Carrera ${raceNumber} no encontrada para esta reunión.` }, { status: 404 });
    }

    // Update race: status, time, splits, payouts
    race.status = 'finished';
    race.hasResults = true;
    if (annualRaceNumber) race.annualRaceNumber = annualRaceNumber;
    if (officialTime) race.officialTime = officialTime;
    if (timeSplits?.length) race.timeSplits = timeSplits;
    if (payouts) {
      race.payouts = {
        winner: payouts.winner ?? [],
        place: payouts.place ?? [],
        exacta: payouts.exacta ?? [],
        trifecta: payouts.trifecta ?? [],
        superfecta: payouts.superfecta ?? [],
        tripleApuesta: payouts.tripleApuesta ?? [],
        poolDe4: payouts.poolDe4 ?? [],
        cincoYSeis: payouts.cincoYSeis ?? [],
        lotoHipico: payouts.lotoHipico ?? [],
      };
    }
    await race.save();

    // Update each entry
    let updatedEntries = 0;
    for (const result of finishOrder) {
      const entry = await Entry.findOne({ raceId: race._id, dorsalNumber: result.dorsalNumber });
      if (!entry) continue;

      entry.result = {
        finishPosition: result.isScratched ? undefined : result.finishPosition,
        officialTime: result.officialTime,
        distanceMargin: result.distanceMargin,
        isScratched: result.isScratched ?? false,
        scratchReason: result.scratchReason,
      };
      entry.status = result.isScratched ? 'scratched' : 'finished';
      await entry.save();
      updatedEntries++;
    }

    // Evaluate forecasts for this race
    // Build dorsal → finishPosition map (only non-scratched)
    const posMap: Record<number, number> = {};
    for (const r of finishOrder) {
      if (!r.isScratched && r.finishPosition) posMap[r.dorsalNumber] = r.finishPosition;
    }
    const winner1st = Object.entries(posMap).find(([, p]) => p === 1)?.[0]; // dorsal string
    const winner2nd = Object.entries(posMap).find(([, p]) => p === 2)?.[0];
    const winner3rd = Object.entries(posMap).find(([, p]) => p === 3)?.[0];

    const forecasts = await Forecast.find({ raceId: race._id });
    let evaluatedForecasts = 0;
    const affectedHandicapperIds: string[] = [];

    for (const fc of forecasts) {
      // Sorted marks by preferenceOrder
      const sorted = [...fc.marks].sort((a: { preferenceOrder: number }, b: { preferenceOrder: number }) => a.preferenceOrder - b.preferenceOrder);
      const dorsals = sorted.map((m: { dorsalNumber?: number }) => m.dorsalNumber?.toString());

      const hit1st = !!winner1st && dorsals[0] === winner1st;
      const hit2nd = !!winner1st && dorsals.slice(0, 2).includes(winner1st);
      const hit3rd = !!winner1st && dorsals.slice(0, 3).includes(winner1st);
      const hitAny = !!winner1st && dorsals.includes(winner1st);
      const hasOrder = sorted.some((m: { dorsalNumber?: number }) => m.dorsalNumber != null);

      // Strip empty-string labels that fail enum validation (legacy data)
      for (const mark of fc.marks) {
        if ((mark as any).label === '') (mark as any).label = undefined;
      }

      fc.result = {
        evaluated: true,
        evaluatedAt: new Date(),
        hit1st: hasOrder ? hit1st : false,
        hit2nd: hasOrder ? hit2nd : false,
        hit3rd: hasOrder ? hit3rd : false,
        hitAny,
      };
      await fc.save();
      evaluatedForecasts++;
      affectedHandicapperIds.push(fc.handicapperId.toString());
    }

    // Recalculate and persist stats for all affected handicappers (fire-and-forget is fine —
    // we await so the response reflects the updated state, but errors here don't fail the save)
    if (affectedHandicapperIds.length > 0) {
      await recalcHandicapperStats(affectedHandicapperIds).catch(err =>
        console.error('[results/save] recalcHandicapperStats error:', err)
      );
    }

    // Auto-update meeting status: if all races are finished → meeting is finished
    const [totalRaces, finishedRaces] = await Promise.all([
      Race.countDocuments({ meetingId }),
      Race.countDocuments({ meetingId, status: 'finished' }),
    ]);
    if (totalRaces > 0 && finishedRaces >= totalRaces) {
      await Race.db.model('Meeting').findByIdAndUpdate(meetingId, { status: 'finished' });
    } else if (finishedRaces > 0) {
      await Race.db.model('Meeting').findByIdAndUpdate(meetingId, { status: 'active' });
    }

    return NextResponse.json({
      success: true,
      raceId: race._id,
      updatedEntries,
      evaluatedForecasts,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
