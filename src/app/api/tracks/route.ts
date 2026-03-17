import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Track from '@/models/Track';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectMongo();
  const tracks = await Track.find({}).select('_id name location').sort({ name: 1 }).lean();
  return NextResponse.json({ tracks });
}
