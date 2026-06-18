/**
 * POST /api/admin/users/gold/bulk-welcome
 * Assigns 15 Gold to every user that currently has 0 golds (one-time welcome grant).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import SiteConfig, { getSiteConfig } from '@/models/SiteConfig';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const roles: string[] = (session?.user as any)?.roles ?? [];
    if (!session?.user?.id || !roles.includes('admin')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    await dbConnect();
    void SiteConfig; // ensure model registered
    const bonusAmount = await getSiteConfig<number>('welcomeBonus', 15);

    const result = await User.updateMany(
      { 'balance.golds': { $lte: 0 } },
      { $set: { 'balance.golds': bonusAmount } }
    );

    return NextResponse.json({
      ok: true,
      updated: result.modifiedCount,
      bonusAmount,
      message: `${result.modifiedCount} usuarios recibieron ${bonusAmount} Gold de bienvenida.`,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
