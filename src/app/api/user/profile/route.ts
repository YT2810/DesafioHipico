/**
 * PATCH /api/user/profile — update display name (alias) for any user
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { Types } from 'mongoose';

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const { alias } = await req.json();
    if (!alias?.trim()) return NextResponse.json({ error: 'El nombre no puede estar vacío.' }, { status: 400 });
    if (alias.trim().length > 40) return NextResponse.json({ error: 'Máximo 40 caracteres.' }, { status: 400 });

    await dbConnect();
    await User.findByIdAndUpdate(new Types.ObjectId(session.user.id), {
      $set: { alias: alias.trim() },
    });

    return NextResponse.json({ success: true, alias: alias.trim() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
