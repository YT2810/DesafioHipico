import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import WorkoutEntry from '@/models/WorkoutEntry';
import Track from '@/models/Track';
import Meeting from '@/models/Meeting';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await connectMongo();
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');
  const trackParam = searchParams.get('track') ?? 'rinconada';
  const searchQ = searchParams.get('q') ?? '';

  const trackFilter = trackParam === 'valencia'
    ? { name: /nacional de valencia/i }
    : { name: /rinconada/i };
  const track = await Track.findOne(trackFilter).lean() as any;
  const trackId = track?._id;

  // Get available dates (last 60 days, most recent first)
  const dates = await WorkoutEntry.aggregate([
    ...(trackId ? [{ $match: { trackId } }] : []),
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$workoutDate' } }, count: { $sum: 1 }, sourceFile: { $first: '$sourceFile' } } },
    { $sort: { _id: -1 } },
    { $limit: 60 },
  ]);

  // Search across all dates by horse name
  if (searchQ && trackId) {
    const entries = await WorkoutEntry.find({
      trackId,
      horseName: { $regex: searchQ, $options: 'i' },
    }).sort({ workoutDate: -1, workoutType: 1 }).limit(200).lean();
    return NextResponse.json({ entries, dates: [], nextMeeting: null, searchMode: true });
  }

  // If date requested, return entries for that date
  if (dateStr && trackId) {
    const start = new Date(`${dateStr}T00:00:00Z`);
    const end = new Date(`${dateStr}T23:59:59Z`);
    const entries = await WorkoutEntry.find({
      trackId,
      workoutDate: { $gte: start, $lte: end },
    }).sort({ workoutType: 1, horseName: 1 }).lean();

    const now2 = new Date();
    const nm = await Meeting.findOne({ trackId, date: { $gte: now2 } }).sort({ date: 1 }).lean() as any
      ?? await Meeting.findOne({ trackId }).sort({ date: -1 }).lean() as any;
    const nextMeetingInfo2 = nm ? { id: nm._id.toString(), date: nm.date, meetingNumber: nm.meetingNumber } : null;
    return NextResponse.json({ entries, dates, nextMeeting: nextMeetingInfo2 });
  }

  // Find next upcoming or most recent meeting
  const now = new Date();
  const nextMeeting = await Meeting.findOne({ trackId, date: { $gte: now } }).sort({ date: 1 }).lean() as any
    ?? await Meeting.findOne({ trackId }).sort({ date: -1 }).lean() as any;
  const nextMeetingInfo = nextMeeting ? {
    id: nextMeeting._id.toString(), date: nextMeeting.date, meetingNumber: nextMeeting.meetingNumber,
  } : null;

  return NextResponse.json({ entries: [], dates, nextMeeting: nextMeetingInfo });
}
