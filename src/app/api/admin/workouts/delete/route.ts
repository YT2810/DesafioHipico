import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import WorkoutEntry from '@/models/WorkoutEntry';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'Params from y to requeridos (YYYY-MM-DD)' }, { status: 400 });
  }

  await connectMongo();

  const result = await WorkoutEntry.deleteMany({
    workoutDate: {
      $gte: new Date(`${from}T00:00:00Z`),
      $lte: new Date(`${to}T23:59:59Z`),
    },
  });

  return NextResponse.json({ deleted: result.deletedCount });
}
