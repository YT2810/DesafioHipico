/**
 * GET /api/admin/users/[id]/transactions
 * Returns the Gold transaction history for a specific user.
 * Requires: admin role
 * Query: ?limit=50&skip=0
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import GoldTransaction from '@/models/GoldTransaction';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const sessionRoles: string[] = (session.user as any).roles ?? [];
    if (!sessionRoles.includes('admin')) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
    const skip  = parseInt(url.searchParams.get('skip') ?? '0');

    await dbConnect();
    const [transactions, total] = await Promise.all([
      GoldTransaction.find({ userId: new Types.ObjectId(id) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      GoldTransaction.countDocuments({ userId: new Types.ObjectId(id) }),
    ]);

    return NextResponse.json({ transactions, total });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
