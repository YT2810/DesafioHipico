import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getFvAccuracy } from '@/services/fvAccuracyService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.roles?.some((r: string) => ['admin', 'staff'].includes(r))) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const track = searchParams.get('track') ?? 'rinconada';
    const data = await getFvAccuracy(track);

    if (!data) {
      return NextResponse.json({ error: 'Hipódromo no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
