/**
 * GET /api/user/transactions
 * Returns the current user's gold transaction history (last 30).
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import GoldTransaction from '@/models/GoldTransaction';
import { Types } from 'mongoose';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    await dbConnect();
    const transactions = await GoldTransaction.find({ userId: new Types.ObjectId(session.user.id) })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    return NextResponse.json({ transactions });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
