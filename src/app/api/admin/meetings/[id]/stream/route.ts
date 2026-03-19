/**
 * PATCH /api/admin/meetings/[id]/stream
 * Set or clear the live stream URL for a meeting.
 * Supports YouTube, Telegram, VK, or any embeddable URL.
 * Auth: admin or staff only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import Meeting from '@/models/Meeting';

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
    const { streamUrl } = await req.json();

    const meeting = await Meeting.findById(id);
    if (!meeting) return NextResponse.json({ error: 'Reunión no encontrada.' }, { status: 404 });

    meeting.streamUrl = streamUrl ? streamUrl.trim() : undefined;
    await meeting.save();

    return NextResponse.json({ success: true, streamUrl: meeting.streamUrl ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
