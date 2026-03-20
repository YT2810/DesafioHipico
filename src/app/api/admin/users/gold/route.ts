/**
 * POST /api/admin/users/gold
 * Assign Gold to a specific user by email or alias.
 * Body: { identifier: string, amount: number, note?: string }
 *
 * POST /api/admin/users/gold/bulk-welcome
 * Assign 15 Gold to all users with balance.golds === 0 (one-time welcome grant).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const roles: string[] = (session?.user as any)?.roles ?? [];
    if (!session?.user?.id || !roles.includes('admin')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    await dbConnect();
    const { identifier, amount, note } = await req.json();

    if (!identifier || typeof amount !== 'number' || amount === 0) {
      return NextResponse.json({ error: 'identifier y amount requeridos.' }, { status: 400 });
    }

    const user = await User.findOne({
      $or: [
        { email: { $regex: `^${identifier}$`, $options: 'i' } },
        { alias: { $regex: `^${identifier}$`, $options: 'i' } },
      ],
    });

    if (!user) {
      return NextResponse.json({ error: `Usuario "${identifier}" no encontrado.` }, { status: 404 });
    }

    user.balance.golds = Math.max(0, (user.balance.golds ?? 0) + amount);
    await user.save();

    return NextResponse.json({
      ok: true,
      userId: user._id.toString(),
      alias: user.alias,
      email: user.email,
      newBalance: user.balance.golds,
      note: note ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
