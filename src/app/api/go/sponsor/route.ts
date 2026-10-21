import { NextRequest, NextResponse } from 'next/server';
import { getCampaignBySlug, trackClick } from '@/services/adService';

export const dynamic = 'force-dynamic';

// Legacy demo fallback (pre-campaign system)
const SPONSOR_TARGETS: Record<string, string> = {
  '1xbet': process.env.SPONSOR_1XBET_URL ?? 'https://1xbet.com',
};

/**
 * GET /api/go/sponsor?campaign=<slug>&slot=<placement>&from=<page>
 * Logs the click in our own stats, then 302s to the advertiser's
 * referral URL. Never reveals the target in page HTML source.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const campaignSlug = (searchParams.get('campaign') ?? searchParams.get('brand') ?? '').toLowerCase();
  const slot = searchParams.get('slot') ?? 'unknown';
  const from = searchParams.get('from') ?? '/';

  let targetUrl: string | null = null;

  // Campaign-based ads (real advertisers)
  if (campaignSlug) {
    const campaign = await getCampaignBySlug(campaignSlug);
    if (campaign) {
      targetUrl = campaign.targetUrl;
      void trackClick(campaign.slug, slot);
    }
  }

  // Legacy demo fallback
  if (!targetUrl) {
    targetUrl = SPONSOR_TARGETS[campaignSlug] ?? SPONSOR_TARGETS['1xbet'];
    console.log(JSON.stringify({
      event: 'sponsor_outbound_click',
      brand: campaignSlug || '1xbet',
      slot,
      from,
      ua: req.headers.get('user-agent')?.slice(0, 120) ?? '',
      ts: new Date().toISOString(),
    }));
  } else {
    console.log(JSON.stringify({
      event: 'ad_click',
      campaign: campaignSlug,
      slot,
      from,
      ts: new Date().toISOString(),
    }));
  }

  const res = NextResponse.redirect(targetUrl, { status: 302 });
  res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
