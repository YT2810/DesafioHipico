/**
 * POST /api/notifications/read-all — mark all user's notifications as read
 */

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { Types } from 'mongoose';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    await dbConnect();
    await Notification.updateMany(
      { userId: new Types.ObjectId(session.user.id), read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error interno' }, { status: 500 });
  }
}
