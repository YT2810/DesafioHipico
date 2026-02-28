/**
 * GET /api/admin/races/[id]/entries
 * Returns ALL entries for a race including scratched ones (for admin scratch panel).
 * Staff/admin only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Entry from '@/models/Entry';
import '@/models/Horse';
import '@/models/Person';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
    const roles: string[] = (token?.roles as string[]) ?? [];
    if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { id: raceId } = await params;
    await dbConnect();

    const entries = await Entry.find({ raceId })
      .populate('horseId', 'name')
      .sort({ dorsalNumber: 1 })
      .lean();

    const result = (entries as any[]).map(e => ({
      entryId: e._id.toString(),
      dorsal: e.dorsalNumber,
      horseName: (e.horseId as any)?.name ?? '—',
      isScratched: e.status === 'scratched' || e.result?.isScratched === true,
      scratchedBy: e.metadata?.scratchedBy ?? null,
      scratchedAt: e.metadata?.scratchedAt ?? null,
    }));

    return NextResponse.json({ entries: result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error al cargar ejemplares.' }, { status: 500 });
  }
}
