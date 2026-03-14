/**
 * POST /api/handicapper/[id]/audios/[audioId]/purchase
 * Deducts Golds from user, records revenue split, returns fileUrl.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import HandicapperAudio from '@/models/HandicapperAudio';
import GoldTransaction from '@/models/GoldTransaction';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; audioId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  const { id: handicapperId, audioId } = await params;

  await dbConnect();
  const dbSession = await mongoose.startSession();

  try {
    let fileUrl = '';

    await dbSession.withTransaction(async () => {
      const audio = await HandicapperAudio.findOne({
        _id: audioId,
        handicapperId,
        isPublished: true,
      }).session(dbSession).lean() as any;

      if (!audio) throw new Error('Audio no encontrado.');
      if (audio.priceGolds === 0) {
        fileUrl = audio.fileUrl;
        return; // free — no charge
      }

      // Idempotency check
      const alreadyPurchased = await GoldTransaction.findOne({
        userId: session.user.id,
        type: 'audio_purchase',
        'metadata.audioId': audioId,
      }).session(dbSession).lean();
      if (alreadyPurchased) {
        fileUrl = audio.fileUrl;
        return;
      }

      const user = await User.findById(session.user.id).session(dbSession);
      if (!user) throw new Error('Usuario no encontrado.');

      const balance = user.balance?.golds ?? 0;
      if (balance < audio.priceGolds) {
        throw new Error(`Saldo insuficiente. Necesitas ${audio.priceGolds} Golds (tienes ${balance}).`);
      }

      const newBalance = balance - audio.priceGolds;
      user.balance = { ...(user.balance ?? {}), golds: newBalance };
      await user.save({ session: dbSession });

      const revenueSharePct = audio.revenueSharePct ?? 70;
      const handicapperAmount = Math.round(audio.priceGolds * revenueSharePct) / 100;
      const platformAmount = audio.priceGolds - handicapperAmount;

      await GoldTransaction.create(
        [{
          userId: session.user.id,
          type: 'audio_purchase',
          amount: -audio.priceGolds,
          balanceAfter: newBalance,
          description: `Audio: ${audio.title}`,
          metadata: { audioId },
          revenueShare: {
            handicapperPct: revenueSharePct,
            platformPct: 100 - revenueSharePct,
            handicapperId,
            handicapperAmount,
            platformAmount,
          },
        }],
        { session: dbSession }
      );

      fileUrl = audio.fileUrl;
    });

    return NextResponse.json({ success: true, fileUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 400 }
    );
  } finally {
    await dbSession.endSession();
  }
}
