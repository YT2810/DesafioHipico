/**
 * GET  /api/handicapper/profile — get own handicapper profile
 * PATCH /api/handicapper/profile — update pseudonym / bio / contactNumber
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import HandicapperProfile from '@/models/HandicapperProfile';
import { Types } from 'mongoose';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    await dbConnect();
    const profile = await HandicapperProfile.findOne({
      userId: new Types.ObjectId(session.user.id),
    }).lean() as any;

    if (!profile) return NextResponse.json({ profile: null });

    return NextResponse.json({
      profile: {
        pseudonym: profile.pseudonym,
        bio: profile.bio ?? '',
        contactNumber: profile.contactNumber ?? '',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const roles: string[] = (session.user as any).roles ?? [];
    if (!roles.some(r => ['handicapper', 'admin', 'staff'].includes(r))) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { pseudonym, bio, contactNumber } = await req.json();
    if (!pseudonym?.trim()) return NextResponse.json({ error: 'El seudónimo no puede estar vacío.' }, { status: 400 });
    if (pseudonym.trim().length > 40) return NextResponse.json({ error: 'Máximo 40 caracteres.' }, { status: 400 });

    await dbConnect();

    // Check uniqueness (exclude own profile)
    const existing = await HandicapperProfile.findOne({
      pseudonym: { $regex: `^${pseudonym.trim()}$`, $options: 'i' },
      userId: { $ne: new Types.ObjectId(session.user.id) },
    });
    if (existing) return NextResponse.json({ error: 'Ese seudónimo ya está en uso.' }, { status: 409 });

    const updated = await HandicapperProfile.findOneAndUpdate(
      { userId: new Types.ObjectId(session.user.id) },
      {
        $set: {
          pseudonym: pseudonym.trim(),
          ...(bio !== undefined && { bio: bio.trim() }),
          ...(contactNumber !== undefined && { contactNumber: contactNumber.trim() }),
        },
      },
      { new: true }
    );

    if (!updated) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });

    return NextResponse.json({ success: true, pseudonym: updated.pseudonym });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
