/**
 * GET /api/forecasts?meetingId=&userId=
 * Returns all published forecasts for a meeting grouped by race,
 * with access map for the requesting user.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import Entry from '@/models/Entry';
import '@/models/HandicapperProfile';
import { getMeetingAccessMap } from '@/services/forecastAccessService';
import { Types } from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');
    const userId = searchParams.get('userId');

    if (!meetingId) {
      return NextResponse.json({ error: 'meetingId requerido.' }, { status: 400 });
    }

    const forecasts = await Forecast.find({ meetingId, isPublished: true })
      .populate('handicapperId', 'pseudonym contactNumber stats isPublic isGhost expertSourceId')
      .lean();

    // Group by raceId
    const byRace: Record<string, typeof forecasts> = {};
    for (const f of forecasts) {
      const key = f.raceId.toString();
      if (!byRace[key]) byRace[key] = [];
      byRace[key].push(f);
    }

    const raceIds = Object.keys(byRace);

    // Load scratched dorsals per race
    const scratchedEntries = await Entry.find({
      raceId: { $in: raceIds.map(id => new Types.ObjectId(id)) },
      status: 'scratched',
    }).select('raceId dorsalNumber').lean();
    const scratchedByRace: Record<string, number[]> = {};
    for (const e of scratchedEntries as any[]) {
      const key = e.raceId.toString();
      if (!scratchedByRace[key]) scratchedByRace[key] = [];
      scratchedByRace[key].push(e.dorsalNumber);
    }

    // Access map — if no userId, treat as unauthenticated (no free slots)
    let accessMap: Record<string, { unlocked: boolean; free: boolean }> = {};
    let freeRemaining = 0;
    let goldBalance = 0;
    let isPrivileged = false;

    if (userId) {
      const result = await getMeetingAccessMap(userId, meetingId, raceIds);
      accessMap = result.map;
      freeRemaining = result.freeRemaining === Infinity ? 99 : result.freeRemaining;
      goldBalance = result.goldBalance;
      isPrivileged = result.isPrivileged;
    }

    // Strip VIP forecast marks for locked races (show only label count as teaser)
    const sanitized = Object.fromEntries(
      raceIds.map(raceId => {
        const access = accessMap[raceId] ?? { unlocked: false, free: false };
        const raceFcs = byRace[raceId].map(f => {
          if (access.unlocked || !(f as any).isVip) return f;
          // Locked VIP: return teaser only
          return { ...f, marks: [], _locked: true };
        });
        return [raceId, { access, forecasts: raceFcs, scratchedDorsals: scratchedByRace[raceId] ?? [] }];
      })
    );

    return NextResponse.json({
      meetingId,
      races: sanitized,
      freeRemaining,
      goldBalance,
      isPrivileged,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
