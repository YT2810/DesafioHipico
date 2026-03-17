/**
 * GET /api/admin/horses/duplicates
 * Returns horses that appear to be duplicates (same name with minor differences).
 * Also returns total horse count and horses with multiple Entry records (participated more than once).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Horse from '@/models/Horse';
import Entry from '@/models/Entry';

export async function GET(req: NextRequest) {
  try {
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
    const roles: string[] = (token?.roles as string[]) ?? [];
    if (!token || !roles.some(r => ['admin'].includes(r))) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    await dbConnect();

    // Total horses
    const totalHorses = await Horse.countDocuments();

    // Find exact-name duplicates (case-insensitive) via aggregation
    const exactDupes = await Horse.aggregate([
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$name' } } },
          count: { $sum: 1 },
          ids: { $push: '$_id' },
          names: { $push: '$name' },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Horses with most participations (Entry count per horse)
    const topParticipants = await Entry.aggregate([
      { $group: { _id: '$horseId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'horses',
          localField: '_id',
          foreignField: '_id',
          as: 'horse',
        },
      },
      { $unwind: { path: '$horse', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          count: 1,
          name: { $ifNull: ['$horse.name', '(caballo eliminado)'] },
        },
      },
    ]);

    // Horses with 0 entries (orphaned — never raced or linked)
    const horsesWithEntries = await Entry.distinct('horseId') as any[];
    const orphanedCount = await Horse.countDocuments({
      _id: { $nin: horsesWithEntries },
    });

    return NextResponse.json({
      totalHorses,
      orphanedHorses: orphanedCount,
      exactDuplicates: exactDupes.map(d => ({
        normalizedName: d._id,
        count: d.count,
        variants: d.names,
        ids: d.ids.map((id: any) => id.toString()),
      })),
      topParticipants: topParticipants.map(h => ({
        id: h._id.toString(),
        name: h.name,
        entries: h.count,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
