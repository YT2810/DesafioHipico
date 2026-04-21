/**
 * PATCH /api/admin/races/[id]/status
 * Set race status: scheduled | active | finished | cancelled
 * Auth: admin or staff only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Race from '@/models/Race';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const secure = req.nextUrl.protocol === 'https:';
    const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
    const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
    const roles: string[] = (token?.roles as string[]) ?? [];
    if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    await dbConnect();
    const { status } = await req.json();
    const allowed = ['scheduled', 'active', 'finished', 'cancelled'];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const race = await Race.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean() as any;
    if (!race) return NextResponse.json({ error: 'Carrera no encontrada.' }, { status: 404 });

    return NextResponse.json({ success: true, raceId: id, status: race.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
