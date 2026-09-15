/**
 * POST /api/track/gaceta-download
 * Records that the authenticated user downloaded the Gaceta PDF for a given meeting.
 * Called client-side just before window.print() so we log every intentional download.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import GacetaDownload from '@/models/GacetaDownload';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const { meetingId, tipsterName } = await req.json();
    if (!meetingId) {
      return NextResponse.json({ error: 'meetingId requerido' }, { status: 400 });
    }

    await connectMongo();
    await GacetaDownload.create({
      userId:      session.user.id,
      meetingId,
      tipsterName: tipsterName ?? null,
      userAgent:   req.headers.get('user-agent')?.slice(0, 200) ?? '',
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
