/**
 * PATCH /api/admin/audios/[id]  — update audio (publish/unpublish, price, title)
 * DELETE /api/admin/audios/[id] — delete audio
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import HandicapperAudio from '@/models/HandicapperAudio';
import HandicapperProfile from '@/models/HandicapperProfile';

async function requirePrivileged() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const roles: string[] = (session.user as any).roles ?? [];
  if (!roles.some(r => ['admin', 'staff', 'handicapper'].includes(r))) return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePrivileged();
  if (!session) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

  const { id } = await params;
  await dbConnect();

  const audio = await HandicapperAudio.findById(id);
  if (!audio) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });

  // Handicappers can only edit their own audios
  const roles: string[] = (session.user as any).roles ?? [];
  const isAdmin = roles.some(r => ['admin', 'staff'].includes(r));
  if (!isAdmin) {
    const profile = await HandicapperProfile.findOne({ userId: session.user.id }).lean();
    if (!profile || audio.handicapperId.toString() !== (profile._id as any).toString()) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }
  }

  const updates = await req.json();
  const allowed = ['title', 'description', 'durationSecs', 'fileUrl', 'priceGolds', 'revenueSharePct', 'isPublished', 'meetingId'];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      (audio as any)[key] = updates[key];
    }
  }
  if (updates.isPublished && !audio.publishedAt) {
    audio.publishedAt = new Date();
  }
  await audio.save();

  return NextResponse.json({ success: true, audio });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requirePrivileged();
  if (!session) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

  const { id } = await params;
  await dbConnect();

  const audio = await HandicapperAudio.findById(id);
  if (!audio) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });

  const roles: string[] = (session.user as any).roles ?? [];
  const isAdmin = roles.some(r => ['admin', 'staff'].includes(r));
  if (!isAdmin) {
    const profile = await HandicapperProfile.findOne({ userId: session.user.id }).lean();
    if (!profile || audio.handicapperId.toString() !== (profile._id as any).toString()) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }
  }

  await audio.deleteOne();
  return NextResponse.json({ success: true });
}
