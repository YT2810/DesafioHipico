/**
 * GET /api/handicapper/[id]/audios/[audioId]
 * Returns audio detail. fileUrl only included if user has access (free or purchased).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import HandicapperAudio from '@/models/HandicapperAudio';
import GoldTransaction from '@/models/GoldTransaction';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; audioId: string }> }
) {
  try {
    const { id, audioId } = await params;
    await dbConnect();

    const audio = await HandicapperAudio.findOne({
      _id: audioId,
      handicapperId: id,
      isPublished: true,
    })
      .populate('handicapperId', 'pseudonym')
      .populate('meetingId', 'meetingNumber date')
      .lean() as any;

    if (!audio) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });

    const session = await auth();
    const userId = session?.user?.id;

    // Check if user already purchased
    let purchased = false;
    if (userId && audio.priceGolds > 0) {
      const tx = await GoldTransaction.findOne({
        userId,
        type: 'audio_purchase',
        metadata: { audioId: audioId },
      }).lean();
      purchased = !!tx;
    }

    const hasAccess = audio.priceGolds === 0 || purchased;

    return NextResponse.json({
      audio: {
        ...audio,
        fileUrl: hasAccess ? audio.fileUrl : undefined,
      },
      purchased,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
