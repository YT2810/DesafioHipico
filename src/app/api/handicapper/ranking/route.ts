import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import HandicapperProfile from '@/models/HandicapperProfile';

export const dynamic = 'force-dynamic';

export interface RankingEntry {
  id: string;
  pseudonym: string;
  isGhost: boolean;
  totalRaces: number;
  orderedRaces: number;
  e1: number | null;
  e1_2: number | null;
  e1_3: number | null;
  eGeneral: number;
  roi1st: number | null;
}

const MIN_RACES = 5;

export async function GET() {
  try {
    await dbConnect();

    // Aggregate stats per handicapper from evaluated forecasts
    const agg = await Forecast.aggregate([
      { $match: { 'result.evaluated': true } },
      {
        $group: {
          _id: '$handicapperId',
          totalRaces: { $sum: 1 },
          hitAnyCount: { $sum: { $cond: ['$result.hitAny', 1, 0] } },
          // For ordered metrics — marks must have at least one dorsalNumber
          // We use hit1st/hit2nd/hit3rd which are false when unordered
          hit1stCount: { $sum: { $cond: ['$result.hit1st', 1, 0] } },
          hit2ndCount: { $sum: { $cond: ['$result.hit2nd', 1, 0] } },
          hit3rdCount: { $sum: { $cond: ['$result.hit3rd', 1, 0] } },
          orderedCount: {
            $sum: {
              $cond: [
                { $or: ['$result.hit1st', '$result.hit2nd', '$result.hit3rd',
                  { $gt: [{ $size: { $filter: { input: '$marks', as: 'm', cond: { $ne: ['$$m.dorsalNumber', null] } } } }, 0] }
                ] },
                1, 0,
              ],
            },
          },
        },
      },
    ]);

    // Build a map of handicapper id → stats
    const statsById: Record<string, {
      totalRaces: number; orderedCount: number;
      hit1stCount: number; hit2ndCount: number; hit3rdCount: number; hitAnyCount: number;
    }> = {};
    for (const row of agg) {
      statsById[row._id.toString()] = row;
    }

    // Also compute orderedRaces properly: count forecasts where marks have dorsalNumber
    // (The aggregate above approximates — let's get accurate ordered count)
    const orderedAgg = await Forecast.aggregate([
      { $match: { 'result.evaluated': true } },
      {
        $project: {
          handicapperId: 1,
          hasOrder: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$marks',
                    as: 'm',
                    cond: { $ne: ['$$m.dorsalNumber', null] },
                  },
                },
              },
              0,
            ],
          },
        },
      },
      { $match: { hasOrder: true } },
      { $group: { _id: '$handicapperId', orderedRaces: { $sum: 1 } } },
    ]);
    const orderedById: Record<string, number> = {};
    for (const row of orderedAgg) orderedById[row._id.toString()] = row.orderedRaces;

    // Fetch all relevant handicapper profiles
    const ids = Object.keys(statsById);
    const profiles = await HandicapperProfile.find({ _id: { $in: ids } })
      .select('pseudonym isGhost')
      .lean();
    const profileMap: Record<string, { pseudonym: string; isGhost: boolean }> = {};
    for (const p of profiles) profileMap[p._id.toString()] = { pseudonym: p.pseudonym, isGhost: p.isGhost ?? false };

    const entries: RankingEntry[] = [];
    for (const [id, s] of Object.entries(statsById)) {
      if (!profileMap[id]) continue;
      if (s.totalRaces < MIN_RACES) continue;

      const orderedRaces = orderedById[id] ?? 0;
      const e1 = orderedRaces > 0 ? Math.round((s.hit1stCount / orderedRaces) * 1000) / 10 : null;
      const e1_2 = orderedRaces > 0 ? Math.round((s.hit2ndCount / orderedRaces) * 1000) / 10 : null;
      const e1_3 = orderedRaces > 0 ? Math.round((s.hit3rdCount / orderedRaces) * 1000) / 10 : null;
      const eGeneral = Math.round((s.hitAnyCount / s.totalRaces) * 1000) / 10;

      entries.push({
        id,
        pseudonym: profileMap[id].pseudonym,
        isGhost: profileMap[id].isGhost,
        totalRaces: s.totalRaces,
        orderedRaces,
        e1,
        e1_2,
        e1_3,
        eGeneral,
        roi1st: null, // ROI needs per-race payout — skip in ranking for perf
      });
    }

    // Sort: E1 desc (nulls last), then eGeneral desc
    entries.sort((a, b) => {
      const aE1 = a.e1 ?? -1;
      const bE1 = b.e1 ?? -1;
      if (bE1 !== aE1) return bE1 - aE1;
      return b.eGeneral - a.eGeneral;
    });

    return NextResponse.json({ ranking: entries, minRaces: MIN_RACES });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
