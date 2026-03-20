import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectMongo from '@/lib/mongodb';
import WorkoutEntry from '@/models/WorkoutEntry';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const secure = req.nextUrl.protocol === 'https:';
  const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  const roles: string[] = (token?.roles as string[]) ?? [];
  if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const from    = searchParams.get('from');
  const to      = searchParams.get('to');
  const trackId = searchParams.get('trackId');

  if (!from || !to || !trackId) {
    return NextResponse.json({ error: 'Params from, to (YYYY-MM-DD) y trackId requeridos' }, { status: 400 });
  }

  await connectMongo();

  const result = await WorkoutEntry.deleteMany({
    trackId,
    workoutDate: {
      $gte: new Date(`${from}T00:00:00Z`),
      $lte: new Date(`${to}T23:59:59Z`),
    },
  });

  return NextResponse.json({ deleted: result.deletedCount });
}
