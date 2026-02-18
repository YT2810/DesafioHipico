/**
 * GET  /api/admin/handicapper-request?status=pending
 * POST /api/admin/handicapper-request/[id]/review  (in separate file)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import HandicapperRequest from '@/models/HandicapperRequest';

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
    const query = status === 'all' ? {} : { status };

    const requests = await HandicapperRequest.find(query)
      .populate('userId', 'email alias phone legalId createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ requests });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
