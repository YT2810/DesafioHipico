/**
 * Recalculates and persists stats for one or more handicappers.
 * Called after results are saved — updates HandicapperProfile.stats in-place.
 * This avoids N+1 queries on every page load.
 */

import dbConnect from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import HandicapperProfile from '@/models/HandicapperProfile';
import Race from '@/models/Race';
import Meeting from '@/models/Meeting';
import Track from '@/models/Track';
import { Types } from 'mongoose';

interface Bucket {
  totalRaces: number; orderedRaces: number;
  hitAny: number; hit1st: number; hit2nd: number; hit3rd: number;
  roi1stWinnings: number; roi1stStakes: number;
}

function emptyBucket(): Bucket {
  return { totalRaces: 0, orderedRaces: 0, hitAny: 0, hit1st: 0, hit2nd: 0, hit3rd: 0, roi1stWinnings: 0, roi1stStakes: 0 };
}

function calcMetrics(b: Bucket) {
  const e1 = b.orderedRaces > 0 ? Math.round((b.hit1st / b.orderedRaces) * 1000) / 10 : null;
  const e1_2 = b.orderedRaces > 0 ? Math.round((b.hit2nd / b.orderedRaces) * 1000) / 10 : null;
  const e1_3 = b.orderedRaces > 0 ? Math.round((b.hit3rd / b.orderedRaces) * 1000) / 10 : null;
  const eGeneral = b.totalRaces > 0 ? Math.round((b.hitAny / b.totalRaces) * 1000) / 10 : 0;
  const roi1st = b.roi1stStakes > 0
    ? Math.round(((b.roi1stWinnings - b.roi1stStakes) / b.roi1stStakes) * 1000) / 10
    : null;
  return { e1, e1_2, e1_3, eGeneral, roi1st };
}

/**
 * Recalculates and saves stats for a list of handicapper IDs.
 * Safe to call with duplicates — deduplicates internally.
 */
export async function recalcHandicapperStats(handicapperIds: (string | Types.ObjectId)[]): Promise<void> {
  if (!handicapperIds.length) return;

  await dbConnect();
  void Race; void Meeting; void Track; // ensure models registered for populate

  const uniqueIds = [...new Set(handicapperIds.map(id => id.toString()))];

  await Promise.all(uniqueIds.map(async (hId) => {
    try {
      const profile = await HandicapperProfile.findById(hId).lean() as any;
      if (!profile) return;

      const claimedAt: Date | null = profile.claimedAt ?? null;
      const forecastQuery: Record<string, unknown> = {
        handicapperId: hId,
        'result.evaluated': true,
      };
      if (claimedAt) forecastQuery.createdAt = { $gte: claimedAt };

      const forecasts = await Forecast.find(forecastQuery)
        .populate({
          path: 'raceId',
          select: 'payouts meetingId',
          populate: {
            path: 'meetingId',
            select: 'trackId',
            populate: { path: 'trackId', select: 'name' },
          },
        })
        .lean();

      const global = emptyBucket();
      const trackBuckets = new Map<string, { name: string; bucket: Bucket }>();

      for (const fc of forecasts) {
        const result = (fc as any).result;
        if (!result?.evaluated) continue;

        const race = (fc as any).raceId as any;
        const trackId: string = race?.meetingId?.trackId?._id?.toString() ?? 'unknown';
        const trackName: string = race?.meetingId?.trackId?.name ?? 'Hipódromo';
        const winnerPayouts: { combination: string; amount: number }[] = race?.payouts?.winner ?? [];
        const hasOrder = (fc as any).marks.some((m: any) => m.dorsalNumber != null);

        global.totalRaces++;
        if (result.hitAny) global.hitAny++;
        if (hasOrder) {
          global.orderedRaces++;
          if (result.hit1st) global.hit1st++;
          if (result.hit2nd) global.hit2nd++;
          if (result.hit3rd) global.hit3rd++;
          global.roi1stStakes++;
          if (result.hit1st) {
            const payout = winnerPayouts.find((p: any) => p.combination !== 'NO_HUBO');
            if (payout?.amount) global.roi1stWinnings += payout.amount / 100;
          }
        }

        if (!trackBuckets.has(trackId)) trackBuckets.set(trackId, { name: trackName, bucket: emptyBucket() });
        const tb = trackBuckets.get(trackId)!.bucket;
        tb.totalRaces++;
        if (result.hitAny) tb.hitAny++;
        if (hasOrder) {
          tb.orderedRaces++;
          if (result.hit1st) tb.hit1st++;
          if (result.hit2nd) tb.hit2nd++;
          if (result.hit3rd) tb.hit3rd++;
        }
      }

      const globalMetrics = calcMetrics(global);

      const byTrack = [...trackBuckets.entries()]
        .map(([trackId, { name, bucket }]) => {
          const m = calcMetrics(bucket);
          return {
            trackId,
            trackName: name,
            totalRaces: bucket.totalRaces,
            orderedRaces: bucket.orderedRaces,
            e1: m.e1,
            e1_2: m.e1_2,
            e1_3: m.e1_3,
            eGeneral: m.eGeneral,
          };
        })
        .sort((a, b) => b.totalRaces - a.totalRaces);

      await HandicapperProfile.findByIdAndUpdate(hId, {
        $set: {
          'stats.totalRaces': global.totalRaces,
          'stats.orderedRaces': global.orderedRaces,
          'stats.e1': globalMetrics.e1,
          'stats.e1_2': globalMetrics.e1_2,
          'stats.e1_3': globalMetrics.e1_3,
          'stats.eGeneral': globalMetrics.eGeneral,
          'stats.roi1st': globalMetrics.roi1st,
          'stats.byTrack': byTrack,
          'stats.statsUpdatedAt': new Date(),
        },
      });
    } catch (err) {
      console.error(`[recalcHandicapperStats] Error for ${hId}:`, err);
    }
  }));
}
