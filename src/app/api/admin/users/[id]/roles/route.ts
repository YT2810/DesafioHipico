/**
 * POST /api/admin/users/[id]/roles
 * Body: { roles: string[] }  — replaces the user's roles array
 * Requires: admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { Types } from 'mongoose';

const VALID_ROLES = ['customer', 'handicapper', 'admin', 'staff'];

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    const sessionRoles: string[] = (session.user as any).roles ?? [];
    if (!sessionRoles.includes('admin')) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

    const { id } = await context.params;
    const { roles } = await req.json();

    if (!Array.isArray(roles) || roles.some(r => !VALID_ROLES.includes(r))) {
      return NextResponse.json({ error: `Roles inválidos. Válidos: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findByIdAndUpdate(
      new Types.ObjectId(id),
      { $set: { roles } },
      { new: true }
    ).select('email alias roles').lean() as any;

    if (!user) return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });

    return NextResponse.json({ success: true, user: { id, email: user.email, alias: user.alias, roles: user.roles } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
