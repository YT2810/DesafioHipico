import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { generateMeetingSnapshot } from '@/lib/generateMeetingSnapshot';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  const token = await getToken({ req });
  const roles: string[] = (token?.roles as string[]) ?? [];
  if (!roles.some(r => ['admin', 'staff'].includes(r))) {
    return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });
  }

  const { meetingId } = await params;
  try {
    const result = await generateMeetingSnapshot(meetingId);
    const raceCount = result?.races?.length ?? 0;
    return NextResponse.json({ ok: true, races: raceCount });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
