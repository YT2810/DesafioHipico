/**
 * PATCH /api/admin/meetings/[id]/video
 * Set or clear the YouTube summary video URL for a meeting.
 * Auth: admin or staff only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

export const dynamic = 'force-dynamic';

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch {}
  return null;
}

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

    const { videoUrl } = await req.json();

    const meeting = await Meeting.findById(id);
    if (!meeting) return NextResponse.json({ error: 'Reunión no encontrada.' }, { status: 404 });

    if (videoUrl) {
      const ytId = extractYouTubeId(videoUrl);
      if (!ytId) {
        return NextResponse.json({ error: 'URL de YouTube inválida. Usa el enlace completo o el enlace corto youtu.be.' }, { status: 400 });
      }
      meeting.summaryVideoUrl = `https://www.youtube.com/embed/${ytId}`;
    } else {
      meeting.summaryVideoUrl = undefined;
    }

    await meeting.save();
    return NextResponse.json({ success: true, summaryVideoUrl: meeting.summaryVideoUrl ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
