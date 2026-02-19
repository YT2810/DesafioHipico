/**
 * GET  /api/admin/users?q=search&page=1
 * POST /api/admin/users/[id]/roles  — handled in [id]/roles/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const roles: string[] = (session.user as any).roles ?? [];
    if (!roles.includes('admin')) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = 20;

    const filter = q
      ? {
          $or: [
            { email:      { $regex: q, $options: 'i' } },
            { alias:      { $regex: q, $options: 'i' } },
            { telegramId: { $regex: q, $options: 'i' } },
            { fullName:   { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('email alias roles balance fullName telegramId createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
