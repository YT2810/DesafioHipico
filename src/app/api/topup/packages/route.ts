/**
 * GET /api/topup/packages
 * Devuelve los Pases Nacionales con precios actualizados desde SiteConfig (o fallback a constants).
 * Público — sin auth requerida.
 */
import { NextResponse } from 'next/server';
import { TOPUP_PACKAGES } from '@/lib/constants';
import { getLiveTopUpPackages } from '@/services/topupService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const packages = await getLiveTopUpPackages();
    return NextResponse.json({ packages }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    const packages = TOPUP_PACKAGES.map(pkg => ({ ...pkg }));
    return NextResponse.json({ packages });
  }
}
