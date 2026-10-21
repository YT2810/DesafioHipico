'use client';

import { useEffect, useRef } from 'react';

/**
 * In-text sponsored banner — rendered inside content sections.
 * The page (server component) decides which campaign to render and passes it
 * as props; this component fires the impression beacon once on mount and the
 * click goes through /api/go/sponsor (302 → advertiser's referral URL).
 */

export interface SponsoredCreative {
  slug: string;
  brand: string;
  slot: string;
  badgeText: string;
  title: string;
  subtitle: string;
  ctaText: string;
  logoUrl?: string;
  accentColor: string;
}

export default function SponsoredInlineBanner({ ad }: { ad: SponsoredCreative }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    try {
      const payload = JSON.stringify({ campaign: ad.slug, slot: ad.slot, page: window.location.pathname });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/ads/impression', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/ads/impression', { method: 'POST', body: payload, keepalive: true });
      }
    } catch { /* never break page for tracking */ }
  }, [ad.slug, ad.slot]);

  const href = `/api/go/sponsor?campaign=${encodeURIComponent(ad.slug)}&slot=${encodeURIComponent(ad.slot)}&from=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.pathname : '/retrospectos'
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored nofollow noopener noreferrer"
      className="block rounded-2xl border p-4 transition-all hover:brightness-110 group"
      style={{
        borderColor: `${ad.accentColor}55`,
        background: `linear-gradient(135deg, ${ad.accentColor}14 0%, rgba(17,24,39,0.9) 60%)`,
      }}
      aria-label={`Publicidad: ${ad.brand}`}
    >
      <div className="flex items-center gap-4">
        {ad.logoUrl ? (
          <div className="shrink-0 w-11 h-11 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ad.logoUrl} alt={ad.brand} className="max-w-full max-h-full object-contain" />
          </div>
        ) : (
          <div
            className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black text-black"
            style={{ backgroundColor: ad.accentColor }}
          >
            {ad.brand.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border"
              style={{ color: ad.accentColor, borderColor: `${ad.accentColor}66`, backgroundColor: `${ad.accentColor}18` }}
            >
              {ad.badgeText || 'Publicidad'}
            </span>
            <span className="text-[10px] text-gray-500 truncate">{ad.brand}</span>
          </div>
          <p className="text-sm font-extrabold text-white truncate mt-1">{ad.title}</p>
          {ad.subtitle && <p className="text-xs text-gray-400 truncate">{ad.subtitle}</p>}
        </div>
        <span
          className="shrink-0 px-3.5 py-2 rounded-xl text-xs font-black text-black whitespace-nowrap shadow group-hover:scale-105 transition-transform"
          style={{ backgroundColor: ad.accentColor }}
        >
          {ad.ctaText} →
        </span>
      </div>
    </a>
  );
}
