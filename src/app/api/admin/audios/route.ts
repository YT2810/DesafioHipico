/**
 * GET  /api/admin/audios?handicapperId=xxx   — list all audios (admin/staff)
 * POST /api/admin/audios                     — create audio record (URL already uploaded externally)
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

export async function GET(req: NextRequest) {
  const session = await requirePrivileged();
  if (!session) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const handicapperId = searchParams.get('handicapperId');
  const query = handicapperId ? { handicapperId } : {};

  const audios = await HandicapperAudio.find(query)
    .populate('handicapperId', 'pseudonym')
    .populate('meetingId', 'meetingNumber date')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({ audios });
}

export async function POST(req: NextRequest) {
  const session = await requirePrivileged();
  if (!session) return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });

  const roles: string[] = (session.user as any).roles ?? [];
  const isAdmin = roles.some(r => ['admin', 'staff'].includes(r));

  const { handicapperId, meetingId, title, description, durationSecs, fileUrl, priceGolds, revenueSharePct, isPublished } = await req.json();

  if (!title?.trim()) return NextResponse.json({ error: 'El título es requerido.' }, { status: 400 });
  if (!fileUrl?.trim()) return NextResponse.json({ error: 'La URL del archivo es requerida.' }, { status: 400 });
  if (priceGolds == null || priceGolds < 0) return NextResponse.json({ error: 'Precio inválido.' }, { status: 400 });

  await dbConnect();

  // Handicappers can only upload for their own profile
  let resolvedHandicapperId = handicapperId;
  if (!isAdmin) {
    const profile = await HandicapperProfile.findOne({ userId: session.user.id }).lean();
    if (!profile) return NextResponse.json({ error: 'Perfil de handicapper no encontrado.' }, { status: 404 });
    resolvedHandicapperId = (profile._id as any).toString();
  }

  const audio = await HandicapperAudio.create({
    handicapperId: resolvedHandicapperId,
    meetingId: meetingId || undefined,
    title: title.trim(),
    description: description?.trim() || undefined,
    durationSecs: durationSecs ? Number(durationSecs) : undefined,
    fileUrl: fileUrl.trim(),
    priceGolds: Number(priceGolds),
    revenueSharePct: revenueSharePct != null ? Number(revenueSharePct) : 70,
    isPublished: isPublished ?? false,
    publishedAt: isPublished ? new Date() : undefined,
  });

  return NextResponse.json({ success: true, audio });
}
