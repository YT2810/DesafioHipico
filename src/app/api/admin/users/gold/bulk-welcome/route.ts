/**
 * POST /api/admin/users/gold/bulk-welcome
 * Assigns 15 Gold to every user that currently has 0 golds (one-time welcome grant).
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

    const result = await User.updateMany(
      { 'balance.golds': { $lte: 0 } },
      { $set: { 'balance.golds': 15 } }
    );

    return NextResponse.json({
      ok: true,
      updated: result.modifiedCount,
      message: `${result.modifiedCount} usuarios recibieron 15 Gold de bienvenida.`,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
