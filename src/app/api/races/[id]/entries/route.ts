/**
 * GET /api/races/[id]/entries
 * Returns all entries for a race with horse name, dorsal, jockey, trainer.
 */

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Entry from '@/models/Entry';
import '@/models/Horse';
import '@/models/Person';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();

    const entries = await Entry.find({ raceId: id, status: { $ne: 'scratched' } })
      .populate('horseId', 'name')
      .populate('jockeyId', 'name')
      .sort({ dorsalNumber: 1 })
      .lean();

    const result = (entries as any[]).map((e) => ({
      entryId: e._id.toString(),
      dorsal: e.dorsalNumber,
      horseName: (e.horseId as any)?.name ?? '—',
      jockeyName: (e.jockeyId as any)?.name ?? '—',
    }));

    return NextResponse.json({ entries: result });
  } catch (err) {
    console.error('[entries]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error al cargar ejemplares.' }, { status: 500 });
  }
}
