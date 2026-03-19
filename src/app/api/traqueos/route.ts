import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import WorkoutEntry from '@/models/WorkoutEntry';
import Track from '@/models/Track';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await connectMongo();
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');

  const track = await Track.findOne({ name: /rinconada/i }).lean() as any;
  const trackId = track?._id;

  // Get available dates (last 60 days, most recent first)
  const dates = await WorkoutEntry.aggregate([
    ...(trackId ? [{ $match: { trackId } }] : []),
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$workoutDate' } }, count: { $sum: 1 }, sourceFile: { $first: '$sourceFile' } } },
    { $sort: { _id: -1 } },
    { $limit: 60 },
  ]);

  // If date requested, return entries for that date
  if (dateStr && trackId) {
    const start = new Date(`${dateStr}T00:00:00Z`);
    const end = new Date(`${dateStr}T23:59:59Z`);
    const entries = await WorkoutEntry.find({
      trackId,
      workoutDate: { $gte: start, $lte: end },
    }).sort({ workoutType: 1, horseName: 1 }).lean();

    return NextResponse.json({ entries, dates });
  }

  return NextResponse.json({ entries: [], dates });
}
