'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { TickerEntry } from './HandicapperQuickDrawer';
import HandicapperQuickDrawer from './HandicapperQuickDrawer';

interface Props {
  entries: TickerEntry[];
  meetingId?: string;
}

function EffBadge({ e1, eGeneral }: { e1: number | null; eGeneral: number }) {
  const val = e1 ?? eGeneral;
  const color =
    val >= 70 ? 'text-green-400 bg-green-950/50 border-green-800/50' :
    val >= 50 ? 'text-yellow-400 bg-yellow-950/50 border-yellow-800/50' :
    'text-gray-400 bg-gray-800/50 border-gray-700/50';
  const label = e1 !== null ? `E1 ${e1}%` : `Gral ${eGeneral}%`;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${color}`}>
      {label}
    </span>
  );
}

function StatusBadge({ races }: { races: number }) {
  if (races === 0) return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-800/60 border border-gray-700/40 text-gray-500">
      Nuevo
    </span>
  );
  if (races >= 20) return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-950/50 border border-orange-800/50 text-orange-400">
      🔥 {races} carreras
    </span>
  );
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-950/40 border border-blue-800/40 text-blue-400">
      {races} carreras
    </span>
  );
}

export default function ExpertTickerBar({ entries, meetingId }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<TickerEntry | null>(null);

  // ── Drag / touch scroll ──────────────────────────────────────────
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!trackRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - trackRef.current.offsetLeft;
    scrollLeft.current = trackRef.current.scrollLeft;
    trackRef.current.style.cursor = 'grabbing';
    trackRef.current.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    trackRef.current.scrollLeft = scrollLeft.current - (x - startX.current);
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (trackRef.current) {
      trackRef.current.style.cursor = 'grab';
      trackRef.current.style.userSelect = '';
    }
  }, []);

  // ── Auto-scroll marquee ──────────────────────────────────────────
  const animRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || entries.length < 4) return;

    let pos = 0;
    function tick() {
      if (!el || pausedRef.current) { animRef.current = requestAnimationFrame(tick); return; }
      pos += 0.5;
      if (pos >= el.scrollWidth / 2) pos = 0;
      el.scrollLeft = pos;
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [entries.length]);

  if (!entries.length) return null;

  // Duplicate list for seamless marquee loop when many entries
  const displayEntries = entries.length >= 4 ? [...entries, ...entries] : entries;

  return (
    <>
      <div
        className="relative w-full bg-gray-950 border-b border-gray-800/60 overflow-hidden"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-r from-gray-950 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-gray-950 to-transparent" />

        {/* Track */}
        <div
          ref={trackRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2 px-4"
          style={{ cursor: 'grab', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {displayEntries.map((entry, idx) => (
            <button
              key={`${entry.id}-${idx}`}
              onClick={() => setSelected(entry)}
              className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-yellow-700/60 hover:bg-gray-800/80 transition-all select-none active:scale-95"
            >
              {/* Avatar */}
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-black shrink-0"
                style={{ backgroundColor: '#D4AF37' }}
              >
                {entry.pseudonym[0].toUpperCase()}
              </div>

              {/* Name */}
              <span className="text-xs font-bold text-white whitespace-nowrap">{entry.pseudonym}</span>

              {/* Ghost badge */}
              {entry.isGhost && (
                <span className="text-[10px] text-blue-400">🤖</span>
              )}

              {/* Status badge */}
              <StatusBadge races={entry.totalRaces} />

              {/* Effectiveness */}
              {entry.totalRaces >= 5 && (
                <EffBadge e1={entry.e1} eGeneral={entry.eGeneral} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Drawer */}
      <HandicapperQuickDrawer
        entry={selected}
        onClose={() => setSelected(null)}
        meetingId={meetingId}
      />
    </>
  );
}
