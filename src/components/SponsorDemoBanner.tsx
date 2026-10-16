'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

type DemoMode = 'both' | 'header' | 'sticky';

const STORAGE_KEY = 'dh_sponsor_demo_1xbet';
const STORAGE_MODE_KEY = 'dh_sponsor_demo_mode';

function trackSponsorClick(slot: 'header_leaderboard' | 'sticky_mobile', page: string) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'sponsor_banner_click', {
      sponsor_brand: '1xbet',
      banner_slot: slot,
      page_path: page,
    });
  }
}

function OneXBetWordmark({ className = 'h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 132 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="1xBet"
    >
      <text
        x="0"
        y="25"
        fill="#00A8E8"
        fontFamily="Arial Black, Impact, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="26"
        letterSpacing="-1"
      >
        1X
      </text>
      <text
        x="38"
        y="25"
        fill="#FFFFFF"
        fontFamily="Arial Black, Impact, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="26"
        letterSpacing="-0.5"
      >
        BET
      </text>
    </svg>
  );
}

export default function SponsorDemoBanner() {
  const pathname = usePathname() ?? '/';
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<DemoMode>('both');
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const demoParam = params.get('demo')?.toLowerCase();

    if (demoParam === 'off' || demoParam === '0') {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_MODE_KEY);
      setActive(false);
      return;
    }

    if (demoParam === '1xbet' || demoParam === 'sponsor') {
      sessionStorage.setItem(STORAGE_KEY, '1');
      const slotParam = params.get('slot')?.toLowerCase();
      if (slotParam === 'header' || slotParam === 'sticky' || slotParam === 'both') {
        sessionStorage.setItem(STORAGE_MODE_KEY, slotParam);
        setMode(slotParam);
      }
      setActive(true);
      return;
    }

    if (sessionStorage.getItem(STORAGE_KEY) === '1') {
      const savedMode = sessionStorage.getItem(STORAGE_MODE_KEY) as DemoMode | null;
      if (savedMode === 'header' || savedMode === 'sticky' || savedMode === 'both') {
        setMode(savedMode);
      }
      setActive(true);
    }
  }, [pathname]);

  if (!active) return null;
  if (pathname.startsWith('/admin') || pathname.startsWith('/staff') || pathname.startsWith('/auth')) {
    return null;
  }

  const showHeader = mode === 'both' || mode === 'header';
  const showSticky = (mode === 'both' || mode === 'sticky') && !stickyDismissed;

  const headerHref = `/api/go/sponsor?brand=1xbet&slot=header_leaderboard&from=${encodeURIComponent(pathname)}`;
  const stickyHref = `/api/go/sponsor?brand=1xbet&slot=sticky_mobile&from=${encodeURIComponent(pathname)}`;

  function changeMode(next: DemoMode) {
    setMode(next);
    setStickyDismissed(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_MODE_KEY, next);
    }
  }

  function exitDemo() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_MODE_KEY);
    }
    setActive(false);
  }

  return (
    <>
      {/* 1. CABECERA WEB PREMIUM (Above the fold / Pushdown Leaderboard) */}
      {showHeader && (
        <div
          role="complementary"
          aria-label="Patrocinador oficial"
          className="w-full bg-gradient-to-r from-[#06182c] via-[#0a2d52] to-[#06182c] border-b border-[#00A8E8]/40 shadow-md z-30"
        >
          <a
            href={headerHref}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            onClick={() => trackSponsorClick('header_leaderboard', pathname)}
            className="mx-auto max-w-4xl px-3 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 group"
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="shrink-0 bg-[#041221] border border-[#00A8E8]/30 rounded-lg px-2 py-1 flex items-center">
                <OneXBetWordmark className="h-4 sm:h-5 w-auto" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-[#00A8E8]/20 text-[#5ce1ff] border border-[#00A8E8]/30">
                    Sponsor Oficial
                  </span>
                  <span className="hidden sm:inline text-xs text-sky-200/80 font-medium">
                    · Hipismo Internacional y Deportes en Vivo
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5">
                  BONO 100% EN TU 1ER DEPÓSITO{' '}
                  <span className="text-[#7CFC00] font-black">HASTA $130 USD</span>
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide text-[#041221] bg-gradient-to-r from-[#65e000] to-[#89ff1c] group-hover:brightness-110 transition-all shadow-sm">
                Regístrate →
              </span>
            </div>
          </a>
        </div>
      )}

      {/* 2. STICKY MOBILE WEB (Persistent Bottom Bar) */}
      {showSticky && (
        <div
          role="complementary"
          aria-label="Promoción patrocinador móvil"
          className="fixed bottom-0 inset-x-0 z-40 px-2 pb-2 pt-1 pointer-events-none"
        >
          <div className="mx-auto max-w-lg pointer-events-auto rounded-2xl bg-gradient-to-r from-[#051527]/95 via-[#0b315a]/95 to-[#051527]/95 backdrop-blur-md border border-[#00A8E8]/50 shadow-[0_-6px_24px_rgba(0,168,232,0.25)] px-3 py-2.5 flex items-center justify-between gap-2">
            <a
              href={stickyHref}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              onClick={() => trackSponsorClick('sticky_mobile', pathname)}
              className="flex-1 flex items-center justify-between gap-2.5 min-w-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="shrink-0 bg-[#030d18] border border-[#00A8E8]/40 rounded-lg px-2 py-1">
                  <OneXBetWordmark className="h-4 w-auto" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-white leading-tight truncate">
                    Duplica tu recarga hoy <span className="text-[#7CFC00]">+Bono VIP</span>
                  </p>
                  <p className="text-[11px] text-sky-200/80 truncate">
                    Apuesta en carreras y deportes · Pago rápido
                  </p>
                </div>
              </div>

              <span className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-black uppercase text-[#041221] bg-gradient-to-r from-[#65e000] to-[#89ff1c] shadow">
                Jugar →
              </span>
            </a>

            <button
              type="button"
              onClick={() => setStickyDismissed(true)}
              aria-label="Cerrar anuncio"
              className="shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 text-xs flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. DEMO MODE FLOATING SWITCHER (Only visible in ?demo=1xbet) */}
      <div className="fixed bottom-16 right-3 z-50">
        {controlsOpen ? (
          <div className="rounded-2xl bg-gray-950/95 border border-yellow-600/60 shadow-2xl p-3 text-xs text-gray-200 w-60 space-y-2 backdrop-blur">
            <div className="flex items-center justify-between border-b border-gray-800 pb-1.5">
              <span className="font-bold text-yellow-400">👁️ Vista Demo Sponsor</span>
              <button
                type="button"
                onClick={() => setControlsOpen(false)}
                className="text-gray-400 hover:text-white px-1"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => changeMode('both')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                  mode === 'both' ? 'bg-yellow-500 text-black' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                }`}
              >
                Pack Web Completo ($800)
              </button>
              <button
                type="button"
                onClick={() => changeMode('header')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                  mode === 'header' ? 'bg-yellow-500 text-black' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                }`}
              >
                Solo Cabecera ($600)
              </button>
              <button
                type="button"
                onClick={() => changeMode('sticky')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                  mode === 'sticky' ? 'bg-yellow-500 text-black' : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                }`}
              >
                Solo Sticky Móvil ($450)
              </button>
            </div>
            <button
              type="button"
              onClick={exitDemo}
              className="w-full text-center py-1 rounded-lg bg-red-950/60 border border-red-800/50 text-red-300 hover:bg-red-900/50 font-semibold"
            >
              Desactivar modo demo
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setControlsOpen(true)}
            className="px-2.5 py-1 rounded-full bg-gray-950/90 border border-yellow-600/60 text-[11px] font-bold text-yellow-400 shadow-lg hover:bg-gray-900 transition-colors"
          >
            👁️ Demo 1xBet
          </button>
        )}
      </div>
    </>
  );
}
