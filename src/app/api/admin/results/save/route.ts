import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Race from '@/models/Race';
import Entry from '@/models/Entry';
import Forecast from '@/models/Forecast';
import Meeting from '@/models/Meeting';
import Track from '@/models/Track';
import ActivityEvent from '@/models/ActivityEvent';
import { recalcHandicapperStats } from '@/services/handicapperStatsService';

export type FinishVerdict = 'normal' | 'DST' | 'DQ' | 'INV' | 'SUB';

export interface ResultFinishEntry {
  dorsalNumber: number;
  finishPosition: number;
  distanceMargin?: string;
  verdict?: FinishVerdict;
  physicalFinishPosition?: number;
  officialRuling?: string;
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

    // Resolve annualRaceNumber: use provided value, or keep existing, or auto-calculate
    let resolvedAnnual: number | undefined = annualRaceNumber || race.annualRaceNumber || undefined;
    if (!resolvedAnnual) {
      try {
        const meeting = await Meeting.findById(meetingId).lean() as any;
        if (meeting) {
          const track = await Track.findById(meeting.trackId).lean() as any;
          if (track) {
            const meetingDate = new Date(meeting.date);
            const yearStart = new Date(meetingDate.getFullYear(), 0, 1);
            const earlierMeetings = await Meeting.find({
              trackId: track._id,
              date: { $gte: yearStart, $lt: meetingDate },
            }).select('_id').lean() as any[];
            const expectedEarlier = (meeting.meetingNumber ?? 1) - 1;
            if (earlierMeetings.length >= expectedEarlier) {
              const racesBeforeThis = earlierMeetings.length > 0
                ? await Race.countDocuments({ meetingId: { $in: earlierMeetings.map((m: any) => m._id) } })
                : 0;
              resolvedAnnual = racesBeforeThis + raceNumber;
            }
          }
        }
      } catch { /* non-critical */ }
    }

    // Update race: status, time, splits, payouts
    race.status = 'finished';
    race.hasResults = true;
    if (resolvedAnnual) race.annualRaceNumber = resolvedAnnual;
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

      const v = result.verdict ?? 'normal';
      entry.result = {
        finishPosition: result.isScratched ? undefined : result.finishPosition,
        officialTime: result.officialTime,
        distanceMargin: result.distanceMargin,
        isScratched: result.isScratched ?? false,
        scratchReason: result.scratchReason,
        // Verdict-derived flags
        isDistanced: v === 'DST' || v === 'DQ' || undefined,
        isDisqualified: v === 'DQ' || undefined,
        isInvalidated: v === 'INV' || undefined,
        isPromoted: v === 'SUB' || undefined,
        physicalFinishPosition: result.physicalFinishPosition || undefined,
        officialRuling: result.officialRuling || undefined,
      };
      entry.status = result.isScratched ? 'scratched' : 'finished';
      await entry.save();
      updatedEntries++;
    }

    // Evaluate forecasts for this race
    // Build dorsal → finishPosition map (only valid entries — exclude scratched and invalidated)
    // INV horses physically ran but their result is void for prizes and FV stats.
    const posMap: Record<number, number> = {};
    for (const r of finishOrder) {
      const v = r.verdict ?? 'normal';
      const isVoid = r.isScratched || v === 'INV' || v === 'DQ';
      if (!isVoid && r.finishPosition) posMap[r.dorsalNumber] = r.finishPosition;
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

    // Publish race_result ActivityEvent for social proof feed
    // Compute FV consensus rank of the winning horse (1st official position)
    try {
      const winnerDorsal = winner1st ? parseInt(winner1st, 10) : null;
      if (winnerDorsal && forecasts.length >= 3) {
        // Build dorsal → scores map (lower preferenceOrder = better = lower score)
        const scoreMap: Record<number, number[]> = {};
        for (const fc of forecasts) {
          const sorted = [...fc.marks]
            .sort((a: { preferenceOrder: number }, b: { preferenceOrder: number }) => a.preferenceOrder - b.preferenceOrder);
          sorted.forEach((m: { dorsalNumber?: number }, idx: number) => {
            if (m.dorsalNumber == null) return;
            if (!scoreMap[m.dorsalNumber]) scoreMap[m.dorsalNumber] = [];
            scoreMap[m.dorsalNumber].push(idx + 1);
          });
        }
        // Average score per dorsal, sorted ascending → that's the FV rank
        const ranked = Object.entries(scoreMap)
          .map(([d, scores]) => ({ dorsal: parseInt(d, 10), avg: scores.reduce((s, v) => s + v, 0) / scores.length }))
          .sort((a, b) => a.avg - b.avg);
        const fvRank = ranked.findIndex(r => r.dorsal === winnerDorsal) + 1;

        // Resolve winner horse name from Entry
        const winnerEntry = await Entry.findOne({ raceId: race._id, dorsalNumber: winnerDorsal }, { horseName: 1 }).lean() as any;
        const horseName: string = winnerEntry?.horseName ?? `#${winnerDorsal}`;

        // Build a human-readable message
        const meetingDoc = await Meeting.findById(meetingId, { meetingNumber: 1 }).lean() as any;
        const meetingRef = meetingDoc?.meetingNumber ? `R${meetingDoc.meetingNumber}` : 'Reunión';
        let message: string;
        if (fvRank === 0) {
          message = `${meetingRef} · C${raceNumber}: ${horseName} (#${winnerDorsal}) ganó 🏆`;
        } else if (fvRank <= 3) {
          message = `${meetingRef} · C${raceNumber}: ${horseName} ganó — estaba ${fvRank === 1 ? 'primero' : fvRank === 2 ? '2do' : '3ro'} en el Factor de Victoria 🎯`;
        } else if (fvRank <= 5) {
          message = `${meetingRef} · C${raceNumber}: ${horseName} ganó — estaba en el Top 5 del Factor de Victoria`;
        } else {
          message = `${meetingRef} · C${raceNumber}: ${horseName} (#${winnerDorsal}) ganó — sorpresa en el Factor de Victoria 🔴`;
        }

        await ActivityEvent.create({
          type: 'race_result',
          message,
          meta: { raceId: race._id, meetingId, raceNumber, winnerDorsal, horseName, fvRank, forecasterCount: forecasts.length },
        });
      }
    } catch (actErr) {
      console.error('[results/save] ActivityEvent error (non-critical):', actErr);
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
