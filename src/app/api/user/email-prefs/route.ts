/**
 * POST /api/user/email-prefs
 * Body: { unsubscribed: boolean }
 * Sets the logged-in user's email marketing preference.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.unsubscribed !== 'boolean') {
    return NextResponse.json({ error: 'unsubscribed (boolean) requerido' }, { status: 400 });
  }

  await dbConnect();
  await User.findByIdAndUpdate(session.user.id, {
    $set: {
      unsubscribed: body.unsubscribed,
      ...(body.unsubscribed === false && { emailOptInAt: new Date() }),
    },
  });

  return NextResponse.json({ ok: true });
}
