import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SPONSOR_TARGETS: Record<string, string> = {
  '1xbet': process.env.SPONSOR_1XBET_URL ?? 'https://1xbet.com',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const brand = (searchParams.get('brand') ?? '1xbet').toLowerCase();
  const slot = searchParams.get('slot') ?? 'unknown';
  const from = searchParams.get('from') ?? '/';

  const targetUrl = SPONSOR_TARGETS[brand] ?? SPONSOR_TARGETS['1xbet'];

  console.log(
    JSON.stringify({
      event: 'sponsor_outbound_click',
      brand,
      slot,
      from,
      ua: req.headers.get('user-agent')?.slice(0, 120) ?? '',
      ts: new Date().toISOString(),
    })
  );

  const res = NextResponse.redirect(targetUrl, { status: 302 });
  res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
