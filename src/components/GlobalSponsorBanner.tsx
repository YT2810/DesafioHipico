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

function OneXBetWordmark({ className = 'h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 132 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="1xBet">
      <text x="0" y="25" fill="#00A8E8" fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontStyle="italic" fontSize="26" letterSpacing="-1">1X</text>
      <text x="38" y="25" fill="#FFFFFF" fontFamily="Arial Black, Impact, sans-serif" fontWeight="900" fontStyle="italic" fontSize="26" letterSpacing="-0.5">BET</text>
    </svg>
  );
}

/** Pill de marca — logoUrl > wordmark 1xBET > iniciales del brand (misma regla que AnimatedSponsorBanner) */
function BrandMark({ ad, logoH = 'h-4' }: { ad: GlobalAd; logoH?: string }) {
  if (ad.logoUrl) {
    return (
      <div className="shrink-0 bg-black/50 border border-white/20 rounded-lg px-2 py-1 flex items-center justify-center" style={{ minWidth: 44 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ad.logoUrl} alt={ad.brand} className={`${logoH} w-auto object-contain max-w-[72px]`} />
      </div>
    );
  }
  if (/^1xbet/i.test(ad.slug) || /^1xbet$/i.test(ad.brand)) {
    return (
      <div className="shrink-0 bg-[#041221] border border-[#00A8E8]/40 rounded-lg px-2 py-1">
        <OneXBetWordmark className={`${logoH} w-auto`} />
      </div>
    );
  }
  return (
    <div
      className="shrink-0 rounded-lg px-2 py-1 flex items-center justify-center text-[11px] font-black"
      style={{ backgroundColor: `${ad.accentColor}33`, border: `1px solid ${ad.accentColor}55`, color: ad.accentColor, minWidth: 36 }}
    >
      {(ad.brand || 'DH').slice(0, 4).toUpperCase()}
    </div>
  );
}

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
            background: `linear-gradient(90deg, #050d18 0%, ${header.accentColor}38 50%, #050d18 100%)`,
            borderColor: `${header.accentColor}66`,
            boxShadow: `0 2px 16px -4px ${header.accentColor}40`,
          }}
        >
          <a
            href={goHref(header, 'header_leaderboard')}
            target={header.targetUrl?.startsWith('/') ? undefined : '_blank'}
            rel="sponsored nofollow noopener noreferrer"
            className="mx-auto max-w-4xl px-3 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 group"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <BrandMark ad={header} logoH="h-4 sm:h-5" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="shrink-0 text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border"
                    style={{ color: header.accentColor, borderColor: `${header.accentColor}55`, background: `${header.accentColor}22` }}
                  >
                    {header.badgeText}
                  </span>
                  {header.subtitle && (
                    <span className="hidden sm:inline text-xs text-gray-300/80 font-medium truncate">
                      · {header.subtitle}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
                  {header.title}
                </p>
              </div>
            </div>
            <span
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide text-black group-hover:brightness-110 transition-all shadow-sm"
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
            className="mx-auto max-w-lg pointer-events-auto rounded-2xl backdrop-blur-md border px-3 py-2.5 flex items-center justify-between gap-2"
            style={{
              background: `linear-gradient(90deg, rgba(5,13,24,0.96), ${sticky.accentColor}30, rgba(5,13,24,0.96))`,
              borderColor: `${sticky.accentColor}77`,
              boxShadow: `0 -6px 24px ${sticky.accentColor}40`,
            }}
          >
            <a
              href={goHref(sticky, 'sticky_mobile')}
              target={sticky.targetUrl?.startsWith('/') ? undefined : '_blank'}
              rel="sponsored nofollow noopener noreferrer"
              className="flex items-center gap-2.5 min-w-0 flex-1"
            >
              <BrandMark ad={sticky} logoH="h-4" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-white leading-tight truncate">{sticky.title}</p>
                <p className="text-[11px] truncate" style={{ color: `${sticky.accentColor}` }}>
                  {sticky.subtitle || sticky.badgeText}
                </p>
              </div>
              <span
                className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase text-black"
                style={{ background: `linear-gradient(90deg, ${sticky.accentColor}, ${sticky.accentColor}cc)` }}
              >
                {sticky.ctaText}
              </span>
            </a>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Cerrar anuncio"
              className="shrink-0 w-6 h-6 rounded-full bg-white/10 text-gray-400 hover:text-white text-xs flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
