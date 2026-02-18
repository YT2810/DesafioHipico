/**
 * GET /api/meetings/[id]/races
 * Returns all races for a meeting, ordered by raceNumber.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Race from '@/models/Race';
import { Types } from 'mongoose';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await dbConnect();

    const races = await Race.find({ meetingId: new Types.ObjectId(id) })
      .sort({ raceNumber: 1 })
      .select('raceNumber distance scheduledTime conditions prizePool')
      .lean();

    return NextResponse.json({
      races: races.map(r => ({
        id: r._id.toString(),
        raceNumber: r.raceNumber,
        distance: r.distance,
        scheduledTime: r.scheduledTime ?? '',
        conditions: r.conditions ?? '',
        prizePool: r.prizePool ?? 0,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
