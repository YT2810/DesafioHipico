'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * AnimatedSponsorBanner — motion-enhanced first-party ad banner.
 *
 * CSS-only animations (GPU-accelerated):
 *  - Background gradient sweep (slow, non-distracting)
 *  - Badge shimmer highlight
 *  - CTA glow pulse
 *  - Entry slide-up on mount
 *  - Countdown timer (days remaining)
 *
 * Variant detection via slug suffix or badgeText:
 *  - '-a' / default  → azul 1xBET  · hípico + bono
 *  - '-b' / 'LVBP'  → rojo béisbol · LVBP hook
 *  - '-c'           → naranja dorado · exclusividad + código
 */

// ─── Keyframes (injected once per page) ─────────────────────────────────────
const KEYFRAMES = `
@keyframes dhBgSweep {
  0%,100% { background-position: 0% 60%; }
  50%     { background-position: 100% 40%; }
}
@keyframes dhShimmer {
  0%   { left: -100%; }
  60%,100% { left: 160%; }
}
@keyframes dhCtaGlow {
  0%,100% { filter: brightness(1)     drop-shadow(0 0  4px var(--dh-glow)); }
  50%     { filter: brightness(1.18)  drop-shadow(0 0 16px var(--dh-glow)); }
}
@keyframes dhBadgePulse {
  0%,100% { opacity: 1; }
  50%     { opacity: 0.7; }
}
@keyframes dhSlideUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0);    }
}
`;

// ─── SVG assets ─────────────────────────────────────────────────────────────

function OneXBetWordmark({ className = 'h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="1xBET"
    >
      <text x="0" y="27" fill="#00A8E8"
        fontFamily="Arial Black, Impact, sans-serif"
        fontWeight="900" fontStyle="italic" fontSize="28" letterSpacing="-1">
        1X
      </text>
      <text x="42" y="27" fill="#FFFFFF"
        fontFamily="Arial Black, Impact, sans-serif"
        fontWeight="900" fontStyle="italic" fontSize="28" letterSpacing="-0.5">
        BET
      </text>
    </svg>
  );
}

/** Venezuelan flag-stripe badge for LVBP variant */
function LvbpBadge() {
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded overflow-hidden"
      style={{
        background: 'linear-gradient(90deg, #CF142B 0%, #CF142B 33%, #003893 33%, #003893 67%, #CF142B 67%)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      <span className="text-[10px] font-black text-white tracking-wider drop-shadow">LVBP</span>
      <span className="text-xs">⚾</span>
      <span className="text-[10px] font-bold text-yellow-300 drop-shadow">26</span>
    </div>
  );
}

/** Baseball-silhouette SVG for LVBP slot icon */
function BaseballIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="16" cy="16" r="15" fill="white" stroke="#e5e7eb" strokeWidth="0.5" />
      {/* Laces */}
      <path d="M10 8 Q13 16 10 24" stroke="#CF142B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M22 8 Q19 16 22 24" stroke="#CF142B" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M10 11 Q11.5 13 13 11" stroke="#CF142B" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M10 16 Q11.5 18 13 16" stroke="#CF142B" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M10 21 Q11.5 23 13 21" stroke="#CF142B" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M22 11 Q20.5 13 19 11" stroke="#CF142B" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M22 16 Q20.5 18 19 16" stroke="#CF142B" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M22 21 Q20.5 23 19 21" stroke="#CF142B" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface AnimatedAdProps {
  slug: string;
  brand: string;
  slot: string;
  badgeText: string;
  title: string;
  subtitle: string;
  ctaText: string;
  logoUrl?: string;
  accentColor: string;
  endsAt?: string;    // ISO string — drives countdown
  isHouseAd?: boolean; // Si es publicidad propia, se oculta a usuarios con pase activo
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AnimatedSponsorBanner({ ad }: { ad: AnimatedAdProps }) {
  const pathname = usePathname() ?? '/';
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const fired = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // Countdown from endsAt
  useEffect(() => {
    if (!ad.endsAt) return;
    const ms = new Date(ad.endsAt).getTime() - Date.now();
    setDaysLeft(Math.max(0, Math.ceil(ms / 86400000)));
  }, [ad.endsAt]);

  // Impression beacon — fires once on mount
  useEffect(() => {
    if (!mounted || fired.current) return;
    fired.current = true;
    try {
      const payload = JSON.stringify({ campaign: ad.slug, slot: ad.slot, page: pathname });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/ads/impression', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch('/api/ads/impression', { method: 'POST', body: payload, keepalive: true }).catch(() => {});
      }
    } catch { /* tracking must never break page */ }
  }, [mounted, ad.slug, ad.slot, pathname]);

  // ── Variant detection ────────────────────────────────────────────────────
  // LVBP/Exclusiva son temas del creativo 1xBET — solo aplican a campañas
  // 1xbet (o badge explícito "LVBP"). Un slug house-*-b NO debe activar beisbol.
  const is1xBet = /^1xbet/i.test(ad.slug) || /^1xbet$/i.test(ad.brand);
  const isLVBP = /\blvbp\b/i.test(ad.badgeText) || (is1xBet && /-b$/i.test(ad.slug));
  const isExclusiva = is1xBet && /-c$/i.test(ad.slug);

  const accent = ad.accentColor || (isLVBP ? '#C41E3A' : isExclusiva ? '#F5A623' : '#00A8E8');

  // Background: dark navy + subtle accent glow
  const bgGradient = isLVBP
    ? 'linear-gradient(135deg, #1a0508 0%, #2d0810 35%, #0d0f2e 65%, #1a0508 100%)'
    : isExclusiva
    ? 'linear-gradient(135deg, #1a0e00 0%, #2d1a00 35%, #0f0f0f 65%, #1a0e00 100%)'
    : 'linear-gradient(135deg, #060e1f 0%, #0d1f3c 35%, #04111f 65%, #060e1f 100%)';

  // CTA button
  const ctaBg = isLVBP
    ? 'linear-gradient(135deg, #C41E3A 0%, #e63946 100%)'
    : isExclusiva
    ? 'linear-gradient(135deg, #F5A623 0%, #ffbc4a 100%)'
    : 'linear-gradient(135deg, #5cc800 0%, #7fff00 100%)';
  const ctaColor = isLVBP ? '#fff' : '#000';

  // Slot icon
  const slotIcon = isLVBP ? <BaseballIcon size={26} /> : <span className="text-2xl">{isExclusiva ? '🎯' : '🎰'}</span>;

  const href = `/api/go/sponsor?campaign=${encodeURIComponent(ad.slug)}&slot=${encodeURIComponent(ad.slot)}&from=${encodeURIComponent(pathname)}`;

  // House ads no se muestran a usuarios con Pase Nacional activo ni a staff/admin
  // (va después de los hooks — un return temprano antes de useEffect rompe React)
  const user = (session?.user as any) ?? null;
  const hasActivePass = !!(user?.hasActivePass || user?.roles?.some((r: string) => ['admin', 'staff'].includes(r)));
  if (ad.isHouseAd && hasActivePass) return null;

  return (
    <>
      {/* Inject keyframes once */}
      <style>{KEYFRAMES}</style>

      <a
        href={href}
        target={ad.isHouseAd ? undefined : '_blank'}
        rel="sponsored nofollow noopener noreferrer"
        aria-label={`Publicidad: ${ad.brand}`}
        className="block rounded-2xl overflow-hidden group"
        style={{
          background: bgGradient,
          backgroundSize: '300% 300%',
          animation: 'dhBgSweep 8s ease-in-out infinite, dhSlideUp 0.45s ease both',
          border: `1px solid ${accent}44`,
          boxShadow: `0 0 24px -8px ${accent}33, inset 0 0 0 1px ${accent}11`,
        }}
      >
        <div className="px-4 py-3.5 flex flex-col gap-2.5">

          {/* ── Row 1: badge · logo · countdown ───────────────────── */}
          <div className="flex items-center justify-between gap-2">

            {/* Shimmer badge */}
            {isLVBP ? (
              <LvbpBadge />
            ) : (
              <div
                className="relative overflow-hidden rounded px-2 py-0.5 flex items-center gap-1.5 shrink-0"
                style={{
                  background: `${accent}22`,
                  border: `1px solid ${accent}44`,
                }}
              >
                <span
                  className="text-[9px] uppercase tracking-widest font-extrabold"
                  style={{ color: accent }}
                >
                  {ad.badgeText || 'Publicidad'}
                </span>
                {/* Shimmer sweep */}
                <span
                  aria-hidden
                  className="absolute inset-y-0 w-6 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                    animation: 'dhShimmer 2.8s ease-in-out infinite 0.5s',
                    left: '-100%',
                  }}
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Days countdown */}
              {daysLeft !== null && daysLeft > 0 && (
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/10">
                  <span className="text-[9px]">⏳</span>
                  <span className="text-[10px] font-bold text-gray-300">{daysLeft}d restantes</span>
                </div>
              )}
              {/* Logo del anunciante — dinámico */}
              {ad.logoUrl ? (
                <div className="shrink-0 bg-black/40 border border-white/20 rounded-lg px-2 py-1 flex items-center justify-center" style={{ minWidth: 48 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ad.logoUrl} alt={ad.brand} className="h-4 w-auto object-contain max-w-[80px]" />
                </div>
              ) : is1xBet ? (
                <div className="shrink-0 bg-[#041221] border border-[#00A8E8]/30 rounded-lg px-2 py-1">
                  <OneXBetWordmark className="h-4 w-auto" />
                </div>
              ) : ad.isHouseAd ? (
                <div
                  className="shrink-0 rounded-lg border border-white/20 w-9 h-9"
                  role="img"
                  aria-label="Desafío Hípico"
                  style={{
                    backgroundColor: '#C41E1E',
                    backgroundImage: 'url(/logo-dh.png)',
                    backgroundSize: '420%',
                    backgroundPosition: '50% 28%',
                  }}
                />
              ) : ad.brand ? (
                <div
                  className="shrink-0 rounded-lg px-2 py-1 flex items-center justify-center text-xs font-black"
                  style={{ backgroundColor: `${accent}33`, border: `1px solid ${accent}44`, color: accent, minWidth: 36 }}
                >
                  {ad.brand.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              ) : null}
            </div>
          </div>

          {/* ── Row 2: icon · text · CTA ──────────────────────────── */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">

            {/* Decorative icon — hidden on very small screens */}
            <div className="shrink-0 hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-black/30 border border-white/10">
              {slotIcon}
            </div>

            {/* Text block */}
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-[15px] font-extrabold text-white leading-tight">
                {ad.title}
              </p>
              {ad.subtitle && (
                <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 leading-snug">
                  {ad.subtitle}
                </p>
              )}
            </div>

            {/* CTA — full width on mobile, auto on desktop */}
            <div
              className="w-full sm:w-auto shrink-0 px-4 py-2.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wide text-center sm:whitespace-nowrap group-hover:scale-105 transition-transform"
              style={{
                background: ctaBg,
                color: ctaColor,
                '--dh-glow': accent,
                animation: 'dhCtaGlow 2.2s ease-in-out infinite',
              } as React.CSSProperties}
            >
              {ad.ctaText} →
            </div>
          </div>

        </div>
      </a>
    </>
  );
}
