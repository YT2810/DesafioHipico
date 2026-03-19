import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import WorkoutEntry from '@/models/WorkoutEntry';
import Track from '@/models/Track';
import Meeting from '@/models/Meeting';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  await connectMongo();

  const track = await Track.findOne({ name: /rinconada/i }).lean() as any;
  const trackId = track?._id;
  if (!trackId) return NextResponse.json({ entries: [], nextMeeting: null });

  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(`${date}T23:59:59Z`);

  const entries = await WorkoutEntry.find({
    trackId,
    workoutDate: { $gte: start, $lte: end },
  }).sort({ workoutType: 1, horseName: 1 }).lean();

  // sourceFile to derive session title
  const sourceFile = entries[0]?.sourceFile ?? '';

  // Next upcoming meeting for CTA
  const now = new Date();
  const nm = await Meeting.findOne({ trackId, date: { $gte: now } }).sort({ date: 1 }).lean() as any
    ?? await Meeting.findOne({ trackId }).sort({ date: -1 }).lean() as any;
  const nextMeeting = nm ? { id: nm._id.toString(), date: nm.date, meetingNumber: nm.meetingNumber } : null;

  return NextResponse.json({ entries, sourceFile, nextMeeting });
}
