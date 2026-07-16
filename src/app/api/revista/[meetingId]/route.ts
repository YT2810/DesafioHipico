import { NextRequest, NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import MeetingSnapshot from '@/models/MeetingSnapshot';
import { generateMeetingSnapshot } from '@/lib/generateMeetingSnapshot';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const { meetingId } = await params;
  try {
    await connectMongo();

    // Try to serve from pre-computed snapshot first
    const snap = await MeetingSnapshot.findOne({ meetingId }).lean() as any;
    if (snap) {
      const meetingDateStr = new Date(snap.data?.meeting?.date ?? 0).toISOString().slice(0, 10);
      const todayStr = new Date().toISOString().slice(0, 10);
      const isPast = meetingDateStr < todayStr;
      const ageMinutes = (Date.now() - new Date(snap.generatedAt).getTime()) / 60000;
      // Past meetings: always serve snapshot (data never changes)
      // Upcoming/today: serve if snapshot is less than 30 min old
      if (isPast || ageMinutes < 30) {
        return NextResponse.json(snap.data, { headers: { 'Cache-Control': 'no-store' } });
      }
    }

    // No snapshot or stale — generate, save to DB, and return
    const result = await generateMeetingSnapshot(meetingId);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
