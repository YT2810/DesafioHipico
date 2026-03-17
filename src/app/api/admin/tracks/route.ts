import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectMongo from '@/lib/mongodb';
import Track from '@/models/Track';

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  const roles = token?.roles as string[] | undefined;
  if (!roles?.some(r => ['admin', 'staff'].includes(r))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  await connectMongo();
  const tracks = await Track.find({}).select('_id name location').sort({ name: 1 }).lean();
  return NextResponse.json({ tracks });
}
