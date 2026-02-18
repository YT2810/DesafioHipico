/**
 * POST /api/handicappers/[id]/follow
 * Body: { userId }
 * Toggles follow/unfollow for a handicapper profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { followHandicapper } from '@/services/followService';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId requerido.' }, { status: 400 });
    }

    const result = await followHandicapper(userId, params.id);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
