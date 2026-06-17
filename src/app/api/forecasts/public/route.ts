/**
 * GET /api/forecasts/public?meetingId=
 *
 * Cacheable public endpoint: returns all published forecasts for a meeting
 * grouped by race, WITHOUT any per-user access check.
 *
 * Cached for 120 seconds via ISR (revalidate). Safe for heavy SEO traffic.
 * The frontend fetches this in parallel with /api/forecasts/access (per-user).
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Forecast from '@/models/Forecast';
import Entry from '@/models/Entry';
import '@/models/HandicapperProfile';
import { Types } from 'mongoose';

export const revalidate = 120;

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');

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

    // Return all forecasts without access filtering — frontend will overlay access map
    const races = Object.fromEntries(
      raceIds.map(raceId => [
        raceId,
        {
          forecasts: byRace[raceId],
          scratchedDorsals: scratchedByRace[raceId] ?? [],
        },
      ])
    );

    return NextResponse.json(
      { meetingId, races, raceIds },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
