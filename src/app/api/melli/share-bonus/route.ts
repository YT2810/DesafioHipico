/**
 * POST /api/melli/share-bonus
 * Otorga 5 Golds al usuario por compartir. Límite: 1 vez por día.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import User from '@/models/User';
import GoldTransaction from '@/models/GoldTransaction';

const SHARE_BONUS = 5;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'no_user' }, { status: 400 });

  await connectMongo();

  // Check if already claimed today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const alreadyClaimed = await GoldTransaction.findOne({
    userId,
    type: 'bonus',
    description: /compartir/i,
    createdAt: { $gte: todayStart },
  }).lean();

  if (alreadyClaimed) {
    return NextResponse.json({
      error: 'already_claimed',
      message: 'Ya reclamaste tu bonus de hoy, socio. Vuelve mañana.',
    }, { status: 409 });
  }

  // Grant bonus
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { 'balance.golds': SHARE_BONUS } },
    { new: true, select: 'balance' },
  ).lean() as any;

  const newBalance = user?.balance?.golds ?? SHARE_BONUS;

  await GoldTransaction.create({
    userId,
    type: 'bonus',
    amount: SHARE_BONUS,
    balanceAfter: newBalance,
    description: 'Bonus por compartir El Melli',
  });

  return NextResponse.json({
    granted: SHARE_BONUS,
    newBalance,
  });
}
