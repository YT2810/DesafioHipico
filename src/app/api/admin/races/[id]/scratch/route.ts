/**
 * PATCH /api/admin/races/[id]/scratch
 * Body: { entryId: string, action: 'scratch' | 'restore', reason?: string }
 * Staff/admin only. Marks or unmarks an Entry as scratched.
 * Stores auditor in entry.metadata.scratchedBy / scratchedAt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Entry from '@/models/Entry';

export const dynamic = 'force-dynamic';

export async function PATCH(
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
    const body = await req.json().catch(() => null);
    const { entryId, action, reason } = body ?? {};

    if (!entryId || !['scratch', 'restore'].includes(action)) {
      return NextResponse.json({ error: 'entryId y action (scratch|restore) requeridos.' }, { status: 400 });
    }

    await dbConnect();

    const entry = await Entry.findOne({ _id: entryId, raceId });
    if (!entry) {
      return NextResponse.json({ error: 'Ejemplar no encontrado en esta carrera.' }, { status: 404 });
    }

    const auditorName = (token.name ?? token.email ?? token.sub ?? 'staff') as string;

    if (action === 'scratch') {
      entry.status = 'scratched';
      entry.result.isScratched = true;
      entry.result.scratchReason = reason ?? 'Retirado por staff';
      entry.metadata = {
        ...((entry.metadata as any) ?? {}),
        scratchedBy: auditorName,
        scratchedAt: new Date().toISOString(),
      };
    } else {
      entry.status = 'declared';
      entry.result.isScratched = false;
      entry.result.scratchReason = undefined;
      entry.metadata = {
        ...((entry.metadata as any) ?? {}),
        restoredBy: auditorName,
        restoredAt: new Date().toISOString(),
        scratchedBy: undefined,
        scratchedAt: undefined,
      };
    }

    await entry.save();

    return NextResponse.json({
      ok: true,
      entryId,
      dorsalNumber: entry.dorsalNumber,
      status: entry.status,
      action,
      by: auditorName,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error interno' }, { status: 500 });
  }
}
