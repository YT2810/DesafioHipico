/**
 * POST /api/ads/impression
 * Lightweight beacon — the client fires it when a sponsored banner is
 * actually rendered in the viewport. Increments the daily counter.
 * Accepts sendBeacon (text/plain) and normal fetch JSON.
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackImpression } from '@/services/adService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const campaign = typeof body?.campaign === 'string' ? body.campaign.slice(0, 80) : '';
    const slot = typeof body?.slot === 'string' ? body.slot.slice(0, 60) : 'unknown';
    if (campaign) {
      void trackImpression(campaign, slot);
    }
  } catch { /* never fail */ }
  return new NextResponse(null, { status: 204 });
}
