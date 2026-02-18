/**
 * GET /api/admin/topup?status=pending&page=1
 * List all top-up requests (staff/admin only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import TopUpRequest from '@/models/TopUpRequest';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const roles: string[] = (session.user as any).roles ?? [];
    if (!roles.some(r => ['admin', 'staff'].includes(r))) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? 'pending';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = 20;

    const query = status === 'all' ? {} : { status };
    const [requests, total] = await Promise.all([
      TopUpRequest.find(query)
        .populate('userId', 'email phone legalId alias')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TopUpRequest.countDocuments(query),
    ]);

    return NextResponse.json({ requests, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
