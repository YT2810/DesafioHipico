/**
 * GET  /api/user/billing  — get current user's billing profile
 * POST /api/user/billing  — save/update fullName, identityDocument, phoneNumber
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { Types } from 'mongoose';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    await dbConnect();
    const user = await User.findById(new Types.ObjectId(session.user.id))
      .select('fullName identityDocument phoneNumber')
      .lean() as any;

    return NextResponse.json({
      fullName:         user?.fullName ?? '',
      identityDocument: user?.identityDocument ?? '',
      phoneNumber:      user?.phoneNumber ?? '',
      complete:         !!(user?.fullName && user?.identityDocument && user?.phoneNumber),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const { fullName, identityDocument, phoneNumber } = await req.json();
    if (!fullName?.trim())         return NextResponse.json({ error: 'El nombre completo es requerido.' }, { status: 400 });
    if (!identityDocument?.trim()) return NextResponse.json({ error: 'El documento de identidad es requerido.' }, { status: 400 });
    if (!phoneNumber?.trim())      return NextResponse.json({ error: 'El número de teléfono es requerido.' }, { status: 400 });

    await dbConnect();
    await User.findByIdAndUpdate(new Types.ObjectId(session.user.id), {
      $set: {
        fullName:         fullName.trim(),
        identityDocument: identityDocument.trim(),
        phoneNumber:      phoneNumber.trim(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
