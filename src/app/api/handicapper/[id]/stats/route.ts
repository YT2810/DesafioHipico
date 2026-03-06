import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import HandicapperProfile from '@/models/HandicapperProfile';
import Race from '@/models/Race';
import Meeting from '@/models/Meeting';
import Track from '@/models/Track';

export interface TrackStats {
  trackId: string;
  trackName: string;
  totalRaces: number;
  orderedRaces: number;
  e1: number | null;
  e1_2: number | null;
  e1_3: number | null;
  eGeneral: number;
}

export interface HandicapperStats {
  totalRaces: number;          // races with evaluated forecasts
  orderedRaces: number;        // races where marks had preferenceOrder (dorsals assigned)
  e1: number | null;           // % hit with 1st mark only (null if no ordered races)
  e1_2: number | null;         // % hit within top-2 marks
  e1_3: number | null;         // % hit within top-3 marks
  eGeneral: number;            // % hit in any mark (all races)
  roi1st: number | null;       // simulated ROI following only 1st mark
  byTrack: TrackStats[];       // per-track breakdown
  claimedAt?: string | null;   // ISO date — stats only from this date if present
}

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    // Ensure Track model is registered for population
    void Track;

    const profile = await HandicapperProfile.findById(id).lean() as any;
    if (!profile) return NextResponse.json({ error: 'Handicapper no encontrado.' }, { status: 404 });

    // Filter from claimedAt if set (ghost profile claimed by real user)
    const claimedAt: Date | null = profile.claimedAt ?? null;
    const forecastQuery: Record<string, unknown> = {
      handicapperId: id,
      'result.evaluated': true,
    };
    if (claimedAt) forecastQuery.createdAt = { $gte: claimedAt };

    // Only evaluated forecasts, populate race → meeting → track
    const forecasts = await Forecast.find(forecastQuery)
      .populate({
        path: 'raceId',
        select: 'payouts meetingId',
        populate: { path: 'meetingId', select: 'trackId', populate: { path: 'trackId', select: 'name' } },
      })
      .lean();

    if (forecasts.length === 0) {
      return NextResponse.json({
        totalRaces: 0, orderedRaces: 0,
        e1: null, e1_2: null, e1_3: null, eGeneral: 0, roi1st: null,
        byTrack: [],
        claimedAt: claimedAt?.toISOString() ?? null,
      } satisfies HandicapperStats);
    }

    const global = emptyBucket();
    const trackBuckets = new Map<string, { name: string; bucket: Bucket }>();

    for (const fc of forecasts) {
      const result = fc.result;
      if (!result?.evaluated) continue;

      const race = fc.raceId as any;
      const trackId: string = race?.meetingId?.trackId?._id?.toString() ?? 'unknown';
      const trackName: string = race?.meetingId?.trackId?.name ?? 'Hipódromo';
      const winnerPayouts: { combination: string; amount: number }[] = race?.payouts?.winner ?? [];

      const hasOrder = fc.marks.some((m: { dorsalNumber?: number }) => m.dorsalNumber != null);

      // Global
      global.totalRaces++;
      if (result.hitAny) global.hitAny++;
      if (hasOrder) {
        global.orderedRaces++;
        if (result.hit1st) global.hit1st++;
        if (result.hit2nd) global.hit2nd++;
        if (result.hit3rd) global.hit3rd++;
        global.roi1stStakes++;
        if (result.hit1st) {
          const payout = winnerPayouts.find(p => p.combination !== 'NO_HUBO');
          if (payout?.amount) global.roi1stWinnings += payout.amount / 100;
        }
      }

      // Per track
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

    const byTrack: TrackStats[] = [...trackBuckets.entries()]
      .map(([trackId, { name, bucket }]) => ({
        trackId,
        trackName: name,
        totalRaces: bucket.totalRaces,
        orderedRaces: bucket.orderedRaces,
        ...calcMetrics(bucket),
        roi1st: undefined as unknown as null,  // not included in per-track
      }))
      .map(t => { const { roi1st: _r, ...rest } = t; return { ...rest, roi1st: null }; })
      .sort((a, b) => b.totalRaces - a.totalRaces);

    return NextResponse.json({
      totalRaces: global.totalRaces,
      orderedRaces: global.orderedRaces,
      ...globalMetrics,
      byTrack,
      claimedAt: claimedAt?.toISOString() ?? null,
    } satisfies HandicapperStats);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
