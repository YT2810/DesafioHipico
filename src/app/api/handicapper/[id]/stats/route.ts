import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import HandicapperProfile from '@/models/HandicapperProfile';

export interface HandicapperStats {
  totalRaces: number;          // races with evaluated forecasts
  orderedRaces: number;        // races where marks had preferenceOrder (dorsals assigned)
  e1: number | null;           // % hit with 1st mark only (null if no ordered races)
  e1_2: number | null;         // % hit within top-2 marks
  e1_3: number | null;         // % hit within top-3 marks
  eGeneral: number;            // % hit in any mark (all races)
  roi1st: number | null;       // simulated ROI following only 1st mark (Bs ganados / Bs apostados - 1)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    const profile = await HandicapperProfile.findById(id).lean();
    if (!profile) return NextResponse.json({ error: 'Handicapper no encontrado.' }, { status: 404 });

    // Only evaluated forecasts
    const forecasts = await Forecast.find({
      handicapperId: id,
      'result.evaluated': true,
    })
      .populate({ path: 'raceId', select: 'payouts status' })
      .lean();

    if (forecasts.length === 0) {
      return NextResponse.json({
        totalRaces: 0, orderedRaces: 0,
        e1: null, e1_2: null, e1_3: null, eGeneral: 0, roi1st: null,
      } satisfies HandicapperStats);
    }

    let totalRaces = 0;
    let orderedRaces = 0;
    let hitAnyCount = 0;
    let hit1stCount = 0;
    let hit2Count = 0;
    let hit3Count = 0;

    // ROI: sum of winnings when 1st mark hit, vs total races with ordered marks
    let roi1stWinnings = 0;
    let roi1stStakes = 0;

    for (const fc of forecasts) {
      const result = fc.result;
      if (!result?.evaluated) continue;
      totalRaces++;

      if (result.hitAny) hitAnyCount++;

      // Check if this forecast had ordered marks with dorsals
      const hasOrder = fc.marks.some((m: { dorsalNumber?: number }) => m.dorsalNumber != null);
      if (hasOrder) {
        orderedRaces++;
        if (result.hit1st) hit1stCount++;
        if (result.hit2nd) hit2Count++;
        if (result.hit3rd) hit3Count++;

        // ROI calculation: 1 unit staked per race on 1st mark
        roi1stStakes += 1;
        if (result.hit1st) {
          // Get winner payout from race
          const race = fc.raceId as { payouts?: { winner?: { combination: string; amount: number }[] } } | null;
          const winnerPayouts = race?.payouts?.winner ?? [];
          // Find the matching payout (first entry that is not NO_HUBO)
          const payout = winnerPayouts.find(p => p.combination !== 'NO_HUBO');
          if (payout?.amount) {
            // INH payouts are per 100 Bs base — normalize to 1 unit
            roi1stWinnings += payout.amount / 100;
          }
        }
      }
    }

    const eGeneral = totalRaces > 0 ? Math.round((hitAnyCount / totalRaces) * 1000) / 10 : 0;
    const e1 = orderedRaces > 0 ? Math.round((hit1stCount / orderedRaces) * 1000) / 10 : null;
    const e1_2 = orderedRaces > 0 ? Math.round((hit2Count / orderedRaces) * 1000) / 10 : null;
    const e1_3 = orderedRaces > 0 ? Math.round((hit3Count / orderedRaces) * 1000) / 10 : null;
    const roi1st = roi1stStakes > 0
      ? Math.round(((roi1stWinnings - roi1stStakes) / roi1stStakes) * 1000) / 10
      : null;

    return NextResponse.json({
      totalRaces, orderedRaces,
      e1, e1_2, e1_3, eGeneral, roi1st,
    } satisfies HandicapperStats);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
