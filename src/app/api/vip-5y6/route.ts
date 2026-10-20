import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import { getPublicVipFiveAndSix } from '@/services/fvAccuracyService';
import { hasActiveNationalPass, getCurrentWeekMondayStartUTC } from '@/services/forecastAccessService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const track = searchParams.get('track') ?? 'rinconada';

    const session = await auth();
    const userId = session?.user?.id;
    const roles: string[] = (session?.user as any)?.roles ?? [];

    let isUnlocked = false;
    const weekStart = getCurrentWeekMondayStartUTC();

    if (userId) {
      if (roles.includes('admin') || roles.includes('staff')) {
        isUnlocked = true;
      } else {
        isUnlocked = await hasActiveNationalPass(userId);
      }
    }

    const data = await getPublicVipFiveAndSix(track, isUnlocked);
    if (!data) {
      return NextResponse.json({ error: 'No hay programa 5y6 activo aún.' }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      weekStartIso: weekStart.toISOString(),
      isLoggedIn: Boolean(userId),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
