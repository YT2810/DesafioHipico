/**
 * PATCH /api/admin/handicapper/[id]/revenue-share
 * Admin-only: update revenueSharePct for a specific HandicapperProfile.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import HandicapperProfile from '@/models/HandicapperProfile';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  const roles: string[] = (session.user as any).roles ?? [];
  if (!roles.some(r => ['admin'].includes(r))) {
    return NextResponse.json({ error: 'Solo admins pueden modificar el revenue share.' }, { status: 403 });
  }

  const { id } = await params;
  const { revenueSharePct } = await req.json();

  const pct = Number(revenueSharePct);
  if (isNaN(pct) || pct < 0 || pct > 100) {
    return NextResponse.json({ error: 'El porcentaje debe estar entre 0 y 100.' }, { status: 400 });
  }

  await dbConnect();
  const profile = await HandicapperProfile.findByIdAndUpdate(
    id,
    { $set: { revenueSharePct: pct } },
    { new: true }
  ).lean();

  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });

  return NextResponse.json({
    success: true,
    revenueSharePct: (profile as any).revenueSharePct,
    pseudonym: (profile as any).pseudonym,
  });
}
