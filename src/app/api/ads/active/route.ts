/**
 * GET /api/ads/active?slots=header_leaderboard,sticky_mobile
 *
 * Lightweight endpoint for global ad slots. Returns the selected active
 * campaign per slot (paid sponsors win; house ads only backfill empty slots).
 * Fetched client-side so selection happens per user visit — not frozen by
 * page-level ISR cache.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getActiveCampaign } from '@/services/adService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('slots') ?? '';
  const slots = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
  if (!slots.length) {
    return NextResponse.json({ error: 'slots requerido' }, { status: 400 });
  }

  const results = await Promise.all(slots.map(s => getActiveCampaign(s)));
  const ads: Record<string, unknown> = {};
  slots.forEach((slot, i) => {
    const c = results[i];
    if (c) {
      ads[slot] = {
        slug: c.slug,
        brand: c.brand,
        targetUrl: c.targetUrl,
        badgeText: c.creative.badgeText ?? 'Publicidad',
        title: c.creative.title,
        subtitle: c.creative.subtitle ?? '',
        ctaText: c.creative.ctaText,
        logoUrl: c.creative.logoUrl ?? '',
        accentColor: c.creative.accentColor ?? '#00A8E8',
        endsAt: c.endsAt ? new Date(c.endsAt).toISOString() : undefined,
        isHouseAd: !!(c as unknown as { isHouseAd?: boolean }).isHouseAd,
      };
    } else {
      ads[slot] = null;
    }
  });

  return NextResponse.json(
    { ads },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } }
  );
}
