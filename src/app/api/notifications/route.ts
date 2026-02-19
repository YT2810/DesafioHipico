/**
 * GET  /api/notifications          — list current user's notifications (last 30)
 * POST /api/notifications/read-all — mark all as read (handled in read-all/route.ts)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { Types } from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === '1';

    const filter: Record<string, unknown> = { userId: new Types.ObjectId(session.user.id) };
    if (unreadOnly) filter.read = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Notification.countDocuments({ userId: new Types.ObjectId(session.user.id), read: false }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
