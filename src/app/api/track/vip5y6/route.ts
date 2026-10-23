/**
 * POST /api/track/vip5y6
 * Records a VIP 5y6 widget open — fire-and-forget from the floating 👑 button.
 * userId is attached when logged in; anonymous opens count for totals only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import MarketingEvent from '@/models/MarketingEvent';
import { getCurrentWeekMondayStartUTC } from '@/services/forecastAccessService';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const track = String(body?.track ?? '').slice(0, 30) || 'rinconada';

    const session = await auth();
    const userId = session?.user?.id;

    await dbConnect();
    await MarketingEvent.create({
      userId: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
      event: 'vip5y6_open',
      meta: { track },
      weekStart: getCurrentWeekMondayStartUTC(),
    });

    return NextResponse.json({ ok: true });
  } catch {
    // Never fail the UX for a tracking call
    return NextResponse.json({ ok: true });
  }
}
