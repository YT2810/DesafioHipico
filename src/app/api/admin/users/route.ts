/**
 * GET  /api/admin/users?q=search&page=1&pass=activo|tuvo|nunca
 * POST /api/admin/users/[id]/roles  — handled in [id]/roles/route.ts
 *
 * pass=activo → pase vigente ahora | tuvo → tuvo pase alguna vez (incluye activos) | nunca → jamás tuvo
 * Cada usuario incluye `pass: PassInfo` (status: monthly|weekly|expired|never + expiresAt).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getActivePassUserIds, getEverPassUserIds, getPassInfoForUsers } from '@/services/passService';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const roles: string[] = (session.user as any).roles ?? [];
    if (!roles.includes('admin')) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() ?? '';
    const pass = searchParams.get('pass');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = 20;

    const filter: Record<string, unknown> = q
      ? {
          $or: [
            { email:      { $regex: q, $options: 'i' } },
            { alias:      { $regex: q, $options: 'i' } },
            { telegramId: { $regex: q, $options: 'i' } },
            { fullName:   { $regex: q, $options: 'i' } },
          ],
        }
      : {};

    if (pass === 'activo') {
      filter._id = { $in: await getActivePassUserIds() };
    } else if (pass === 'tuvo') {
      filter._id = { $in: await getEverPassUserIds() };
    } else if (pass === 'nunca') {
      filter._id = { $nin: await getEverPassUserIds() };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('email alias roles balance fullName telegramId createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const passMap = await getPassInfoForUsers(users.map(u => u._id as any));
    const enriched = users.map(u => ({ ...u, pass: passMap.get((u._id as any).toString()) ?? null }));

    return NextResponse.json({ users: enriched, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
