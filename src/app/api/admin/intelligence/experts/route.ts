/**
 * GET /api/admin/intelligence/experts
 * Returns all ExpertSources for the selector in the intelligence panel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/mongodb';
import ExpertSource from '@/models/ExpertSource';

export async function GET(req: NextRequest) {
  const secure = req.nextUrl.protocol === 'https:';
  const cookieName = secure ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName });
  const roles: string[] = (token?.roles as string[]) ?? [];
  if (!token || !roles.some(r => ['admin', 'staff'].includes(r))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  await dbConnect();

  const experts = await ExpertSource.find()
    .sort({ name: 1 })
    .select('_id name platform handle totalForecasts isGhost')
    .lean();

  return NextResponse.json({ experts });
}
