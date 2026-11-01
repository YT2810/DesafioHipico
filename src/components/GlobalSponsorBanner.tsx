'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * GlobalSponsorBanner — renders the two global media-kit slots on every page:
 *  - header_leaderboard: thin bar above all content
 *  - sticky_mobile:      dismissible bottom bar (mobile only)
 *
 * Fetches /api/ads/active client-side so campaign selection happens per user
 * visit (unaffected by page-level ISR cache). House ads are hidden from
 * users with an active National Pass. Hidden on /admin, /staff, /auth.
 */

interface GlobalAd {
  slug: string;
  brand: string;
  targetUrl: string;
  badgeText: string;
  title: string;
  subtitle: string;
  ctaText: string;
  logoUrl: string;
  accentColor: string;
  endsAt?: string;
  isHouseAd?: boolean;
}

const EXCLUDED_PREFIXES = ['/admin', '/staff', '/auth', '/pase'];

export default function GlobalSponsorBanner() {
  const pathname = usePathname() ?? '/';
  const { data: session } = useSession();
  const [ads, setAds] = useState<{ header?: GlobalAd | null; sticky?: GlobalAd | null }>({});
  const [dismissed, setDismissed] = useState(false);
  const firedRef = useRef(false);

  const user = (session?.user as any) ?? null;
  const hasActivePass = !!(
    user?.hasActivePass || user?.roles?.some((r: string) => ['admin', 'staff'].includes(r))
  );

  const excluded = EXCLUDED_PREFIXES.some(p => pathname.startsWith(p));

  useEffect(() => {
    if (excluded) return;
    fetch('/api/ads/active?slots=header_leaderboard,sticky_mobile')
      .then(r => r.json())
      .then(d => {
        const header = d.ads?.header_leaderboard as GlobalAd | null;
        const sticky = d.ads?.sticky_mobile as GlobalAd | null;
        setAds({ header, sticky });

        // Impression tracking — one beacon per visible slot
        if (!firedRef.current) {
          firedRef.current = true;
          for (const [slot, ad] of [['header_leaderboard', header], ['sticky_mobile', sticky]] as const) {
            if (!ad) continue;
            try {
              const payload = JSON.stringify({ campaign: ad.slug, slot, page: pathname });
              if (navigator.sendBeacon) {
                navigator.sendBeacon('/api/ads/impression', new Blob([payload], { type: 'application/json' }));
              } else {
                fetch('/api/ads/impression', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
              }
            } catch { /* tracking nunca rompe la página */ }
          }
        }
      })
      .catch(() => {});
  }, [pathname, excluded]);

  if (excluded) return null;

  const visible = (ad?: GlobalAd | null) => {
    if (!ad) return false;
    if (ad.isHouseAd && hasActivePass) return false;
    return true;
  };

  const header = visible(ads.header) ? ads.header! : null;
  const sticky = !dismissed && visible(ads.sticky) ? ads.sticky! : null;

  if (!header && !sticky) return null;

  const goHref = (ad: GlobalAd, slot: string) =>
    `/api/go/sponsor?campaign=${encodeURIComponent(ad.slug)}&slot=${encodeURIComponent(slot)}&from=${encodeURIComponent(pathname)}`;

  return (
    <>
      {/* ── CABECERA PRINCIPAL (leaderboard, todas las pantallas) ── */}
      {header && (
        <div
          role="complementary"
          aria-label={`Publicidad: ${header.brand}`}
          className="w-full border-b z-30"
          style={{
            background: `linear-gradient(90deg, #0a0a0a 0%, ${header.accentColor}22 50%, #0a0a0a 100%)`,
            borderColor: `${header.accentColor}55`,
          }}
        >
          <a
            href={goHref(header, 'header_leaderboard')}
            target={header.targetUrl?.startsWith('/') ? undefined : '_blank'}
            rel="sponsored nofollow noopener noreferrer"
            className="mx-auto max-w-4xl px-3 py-2 flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="shrink-0 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border"
                style={{ color: header.accentColor, borderColor: `${header.accentColor}55`, background: `${header.accentColor}18` }}
              >
                {header.badgeText}
              </span>
              <p className="text-xs sm:text-sm font-extrabold text-white truncate">
                {header.title}
                {header.subtitle && (
                  <span className="hidden sm:inline text-gray-400 font-medium text-xs"> · {header.subtitle}</span>
                )}
              </p>
            </div>
            <span
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide text-black group-hover:brightness-110 transition-all"
              style={{ background: `linear-gradient(90deg, ${header.accentColor}, ${header.accentColor}cc)` }}
            >
              {header.ctaText}
            </span>
          </a>
        </div>
      )}

      {/* ── STICKY MOBILE (barra inferior persistente, solo móvil) ── */}
      {sticky && (
        <div
          role="complementary"
          aria-label={`Publicidad: ${sticky.brand}`}
          className="fixed bottom-0 inset-x-0 z-40 px-2 pb-2 pt-1 pointer-events-none sm:hidden"
        >
          <div
            className="mx-auto max-w-lg pointer-events-auto rounded-2xl backdrop-blur-md border shadow-2xl px-3 py-2.5 flex items-center justify-between gap-2"
            style={{
              background: `linear-gradient(90deg, rgba(10,10,10,0.95), ${sticky.accentColor}30, rgba(10,10,10,0.95))`,
              borderColor: `${sticky.accentColor}66`,
            }}
          >
            <a
              href={goHref(sticky, 'sticky_mobile')}
              target={sticky.targetUrl?.startsWith('/') ? undefined : '_blank'}
              rel="sponsored nofollow noopener noreferrer"
              className="flex items-center gap-2.5 min-w-0 flex-1"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-wider font-bold" style={{ color: sticky.accentColor }}>
                  {sticky.badgeText}
                </p>
                <p className="text-xs font-extrabold text-white truncate leading-tight">{sticky.title}</p>
              </div>
              <span
                className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-black text-black"
                style={{ background: `linear-gradient(90deg, ${sticky.accentColor}, ${sticky.accentColor}cc)` }}
              >
                {sticky.ctaText}
              </span>
            </a>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Cerrar anuncio"
              className="shrink-0 w-7 h-7 rounded-lg bg-white/10 text-gray-400 hover:text-white text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
