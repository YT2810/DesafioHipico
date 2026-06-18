/**
 * GET  /api/admin/site-config?key=welcomeBonus
 * POST /api/admin/site-config  { key: string, value: unknown }
 * Admin-only: read or write a SiteConfig entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import SiteConfig, { getSiteConfig, setSiteConfig } from '@/models/SiteConfig';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await auth();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  if (!session?.user?.id || !roles.includes('admin')) return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  await dbConnect();
  // Ensure model is registered
  void SiteConfig;
  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json({ error: 'key requerido.' }, { status: 400 });
  }
  const value = await getSiteConfig(key, null);
  return NextResponse.json({ key, value });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  await dbConnect();
  void SiteConfig;
  const { key, value } = await req.json();
  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key y value requeridos.' }, { status: 400 });
  }
  await setSiteConfig(key, value);
  return NextResponse.json({ ok: true, key, value });
}
