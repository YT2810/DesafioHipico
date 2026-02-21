/**
 * GET /api/races/[id]/entries
 * Returns all entries for a race with horse name, dorsal, jockey, trainer.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Entry from '@/models/Entry';
import Horse from '@/models/Horse';
import Person from '@/models/Person';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    const entries = await Entry.find({ raceId: id, status: { $ne: 'scratched' } })
      .populate<{ horseId: { name: string } }>('horseId', 'name')
      .populate<{ jockeyId: { name: string } }>('jockeyId', 'name')
      .sort({ dorsalNumber: 1 })
      .lean();

    const result = entries.map((e: any) => ({
      entryId: e._id.toString(),
      dorsal: e.dorsalNumber,
      horseName: e.horseId?.name ?? '—',
      jockeyName: e.jockeyId?.name ?? '—',
    }));

    return NextResponse.json({ entries: result });
  } catch (err) {
    return NextResponse.json({ error: 'Error al cargar ejemplares.' }, { status: 500 });
  }
}
