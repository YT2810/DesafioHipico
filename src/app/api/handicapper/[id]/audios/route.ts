/**
 * GET /api/handicapper/[id]/audios?meetingId=xxx
 * Returns published audios for a handicapper (optionally filtered by meeting).
 */
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HandicapperAudio from '@/models/HandicapperAudio';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get('meetingId');

    await dbConnect();

    const query: Record<string, unknown> = {
      handicapperId: id,
      isPublished: true,
    };
    if (meetingId) query.meetingId = meetingId;

    const audios = await HandicapperAudio.find(query)
      .select('title description durationSecs priceGolds meetingId createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({ audios });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
