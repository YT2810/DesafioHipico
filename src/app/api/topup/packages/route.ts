/**
 * GET /api/topup/packages
 * Devuelve los paquetes Gold con precios actualizados desde SiteConfig (o fallback a constants).
 * Público — sin auth requerida.
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getSiteConfig } from '@/models/SiteConfig';
import { TOPUP_PACKAGES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export interface PackagePrice { id: string; priceBs: number; }

export async function GET() {
  try {
    await dbConnect();
    const overrides = await getSiteConfig<PackagePrice[]>('goldPackagePrices', []);
    const overrideMap = Object.fromEntries((overrides ?? []).map(o => [o.id, o.priceBs]));

    const packages = TOPUP_PACKAGES.map(pkg => {
      const priceBs = overrideMap[pkg.id] ?? pkg.priceBs;
      const bsPerGold = Math.round(priceBs / pkg.golds);
      const cheapest = overrideMap[TOPUP_PACKAGES[0].id] ?? TOPUP_PACKAGES[0].priceBs;
      const baseBsPerGold = Math.round(cheapest / TOPUP_PACKAGES[0].golds);
      const savedBs = pkg.golds * baseBsPerGold - priceBs;
      return {
        id: pkg.id,
        label: pkg.label,
        description: pkg.description,
        priceBs,
        golds: pkg.golds,
        bsPerGold,
        badge: pkg.badge,
        saving: savedBs > 0 ? `Ahorras ${savedBs.toLocaleString('es-VE')} Bs` : null,
      };
    });

    return NextResponse.json({ packages }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    const packages = TOPUP_PACKAGES.map(pkg => ({ ...pkg }));
    return NextResponse.json({ packages });
  }
}
