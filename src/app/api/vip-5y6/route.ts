import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import TopUpRequest from '@/models/TopUpRequest';
import GoldTransaction from '@/models/GoldTransaction';
import { getPublicVipFiveAndSix } from '@/services/fvAccuracyService';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * Returns Monday 00:00:00 in Venezuela time (America/Caracas, UTC-4) for the current week.
 * Any deposit made before this Monday 00:00 (e.g. previous Saturday/Sunday) does NOT grant
 * access to the new week's VIP 5y6 ticket.
 */
function getCurrentWeekMondayStartUTC(): Date {
  const nowUtcMs = Date.now();
  const veOffsetMs = 4 * 3600 * 1000; // UTC-4
  const veNow = new Date(nowUtcMs - veOffsetMs);
  const veDay = veNow.getUTCDay(); // 0=Dom, 1=Lun ... 6=Sáb
  const daysSinceMonday = veDay === 0 ? 6 : veDay - 1;
  return new Date(
    Date.UTC(
      veNow.getUTCFullYear(),
      veNow.getUTCMonth(),
      veNow.getUTCDate() - daysSinceMonday,
      4, // 00:00 Venezuela = 04:00 UTC
      0,
      0,
      0
    )
  );
}

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
      } else if (Types.ObjectId.isValid(userId)) {
        const uObjId = new Types.ObjectId(userId);
        const [approvedTopUp, purchaseTx] = await Promise.all([
          TopUpRequest.exists({
            userId: uObjId,
            status: 'approved',
            $or: [{ reviewedAt: { $gte: weekStart } }, { createdAt: { $gte: weekStart } }],
          }),
          GoldTransaction.exists({
            userId: uObjId,
            type: 'purchase',
            createdAt: { $gte: weekStart },
          }),
        ]);
        isUnlocked = Boolean(approvedTopUp || purchaseTx);
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
