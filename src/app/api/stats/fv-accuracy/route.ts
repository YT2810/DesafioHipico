import { NextRequest, NextResponse } from 'next/server';
import { getFvAccuracy } from '@/services/fvAccuracyService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const track = searchParams.get('track') ?? 'rinconada';
    const data = await getFvAccuracy(track);

    if (!data) {
      return NextResponse.json({ error: 'Hipódromo no encontrado.' }, { status: 404 });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
