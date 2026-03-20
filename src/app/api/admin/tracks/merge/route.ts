/**
 * POST /api/admin/tracks/merge
 * Merges all meetings from a source track into a target track, then deletes the source track.
 * Body: { sourceTrackId, targetTrackId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Track from '@/models/Track';
import Meeting from '@/models/Meeting';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
    const roles: string[] = (token?.roles as string[]) ?? [];
    if (!token || !roles.includes('admin')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
    await dbConnect();
    const tracks = await Track.find({ location: 'VALENCIA' }).lean();
    const result = await Promise.all(tracks.map(async (t: any) => {
      const count = await Meeting.countDocuments({ trackId: t._id });
      return { _id: t._id.toString(), name: t.name, count };
    }));
    return NextResponse.json({ tracks: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
    const roles: string[] = (token?.roles as string[]) ?? [];
    if (!token || !roles.includes('admin')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { sourceTrackId, targetTrackId } = await req.json();
    if (!sourceTrackId || !targetTrackId) {
      return NextResponse.json({ error: 'sourceTrackId y targetTrackId requeridos.' }, { status: 400 });
    }

    await dbConnect();

    const sourceId = new Types.ObjectId(sourceTrackId);
    const targetId = new Types.ObjectId(targetTrackId);

    // Move all meetings from source to target
    const updated = await Meeting.updateMany(
      { trackId: sourceId },
      { $set: { trackId: targetId } }
    );

    // Delete source track
    await Track.deleteOne({ _id: sourceId });

    return NextResponse.json({
      ok: true,
      meetingsMoved: updated.modifiedCount,
      message: `Se movieron ${updated.modifiedCount} reuniones al track destino y se eliminó el track origen.`,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
