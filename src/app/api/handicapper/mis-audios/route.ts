/**
 * GET  /api/handicapper/mis-audios   — own handicapper: list their audios
 * POST /api/handicapper/mis-audios   — own handicapper: create a new VIP audio record
 *
 * Rules enforced here:
 *  - Only verified (non-ghost) handicappers with userId can POST
 *  - priceGolds must be >= 1 (audios are always paid)
 *  - revenueSharePct is inherited from HandicapperProfile; cannot be overridden here
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import HandicapperProfile from '@/models/HandicapperProfile';
import HandicapperAudio from '@/models/HandicapperAudio';

async function getOwnProfile(userId: string) {
  return HandicapperProfile.findOne({ userId }).lean() as Promise<any>;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const roles: string[] = (session.user as any).roles ?? [];
  if (!roles.includes('handicapper')) {
    return NextResponse.json({ error: 'Solo handicappers verificados.' }, { status: 403 });
  }

  await dbConnect();
  const profile = await getOwnProfile(session.user.id);
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });

  const audios = await HandicapperAudio.find({ handicapperId: profile._id })
    .populate('meetingId', 'meetingNumber date trackName')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    audios,
    revenueSharePct: profile.revenueSharePct ?? 70,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const roles: string[] = (session.user as any).roles ?? [];
  if (!roles.includes('handicapper')) {
    return NextResponse.json({ error: 'Solo handicappers verificados pueden publicar audios.' }, { status: 403 });
  }

  await dbConnect();
  const profile = await getOwnProfile(session.user.id);
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });
  if (profile.isGhost) {
    return NextResponse.json({ error: 'Los perfiles fantasma no pueden subir audios.' }, { status: 403 });
  }

  const { meetingId, title, description, durationSecs, fileUrl, priceGolds, isPublished } = await req.json();

  if (!title?.trim()) return NextResponse.json({ error: 'El título es requerido.' }, { status: 400 });
  if (!fileUrl?.trim()) return NextResponse.json({ error: 'La URL del archivo es requerida.' }, { status: 400 });

  const price = Number(priceGolds);
  if (!price || price < 1) {
    return NextResponse.json({ error: 'El precio mínimo es 1 Gold. Los audios son contenido VIP de pago.' }, { status: 400 });
  }

  const audio = await HandicapperAudio.create({
    handicapperId: profile._id,
    meetingId: meetingId || undefined,
    title: title.trim(),
    description: description?.trim() || undefined,
    durationSecs: durationSecs ? Number(durationSecs) : undefined,
    fileUrl: fileUrl.trim(),
    priceGolds: price,
    revenueSharePct: profile.revenueSharePct ?? 70,  // always inherit from profile
    isPublished: isPublished ?? false,
    publishedAt: isPublished ? new Date() : undefined,
  });

  return NextResponse.json({ success: true, audio });
}
