'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import type { TickerEntry } from './HandicapperQuickDrawer';
import HandicapperQuickDrawer from './HandicapperQuickDrawer';

const GOLD = '#D4AF37';

// ExpertTickerBar is now self-fetching — no entries prop required.
// The optional meetingId prop is still accepted for the drawer context.
interface Props {
  meetingId?: string;
}

export default function ExpertTickerBar({ meetingId }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<TickerEntry | null>(null);
  const [entries, setEntries] = useState<TickerEntry[]>([]);
  const [slots, setSlots] = useState<TickerEntry[]>([]);
  const [activeMeetingId, setActiveMeetingId] = useState<string | undefined>(meetingId);

  // ── Fetch hybrid ticker data ────────────────────────────────────
  useEffect(() => {
    fetch('/api/ticker/today')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.meetingId && !meetingId) setActiveMeetingId(d.meetingId);
        const mapped: TickerEntry[] = (d.entries ?? []).map((e: any) => ({
          id: e.id,
          pseudonym: e.pseudonym,
          isGhost: e.isGhost,
          e1: e.e1,
          eGeneral: e.eGeneral,
          totalRaces: e.totalRaces,
          contactNumber: e.contactNumber,
          // hybrid-specific
          activeToday: e.activeToday,
          fijoDorsal: e.fijoDorsal,
          fijoHorseName: e.fijoHorseName,
          fijoLabel: e.fijoLabel,
        }));
        setEntries(mapped);
      })
      .catch(() => {});
  }, [meetingId]);

  // ── Fetch commercial slots ──────────────────────────────────────
  useEffect(() => {
    fetch('/api/ticker-slots')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.slots) setSlots(d.slots); })
      .catch(() => {});
  }, []);

  // ── Drag / touch scroll ─────────────────────────────────────────
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

  // ── Auto-scroll marquee ─────────────────────────────────────────
  const animRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || entries.length < 3) return;
    let pos = el.scrollLeft;
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

  // ── Merge commercial slots every 4 handicapper entries ──────────
  const merged: TickerEntry[] = [];
  let slotIdx = 0;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && i % 4 === 0 && slotIdx < slots.length) {
      merged.push(slots[slotIdx++]);
    }
    merged.push(entries[i]);
  }
  while (slotIdx < slots.length) merged.push(slots[slotIdx++]);

  if (!merged.length) return null;

  const displayEntries = merged.length >= 4 ? [...merged, ...merged] : merged;

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
          {displayEntries.map((entry, idx) => {
            const isSponsor = entry.slotType === 'sponsor' || entry.slotType === 'promo';
            const isActive = (entry as any).activeToday === true;
            const fijoDorsal = (entry as any).fijoDorsal;
            const accent = entry.accentColor ?? GOLD;

            return (
              <button
                key={`${entry.id}-${idx}`}
                onClick={() => setSelected(entry)}
                className={`flex items-center gap-1.5 shrink-0 px-2.5 py-1.5 rounded-xl border transition-all select-none active:scale-95 ${
                  isSponsor
                    ? 'bg-gray-900 hover:bg-gray-800/80'
                    : isActive
                      ? 'bg-gray-900 border-green-800/50 hover:border-green-600/60 hover:bg-gray-800/80'
                      : 'bg-gray-900 border-gray-800 hover:border-yellow-700/50 hover:bg-gray-800/80'
                }`}
                style={isSponsor ? { borderColor: `${accent}55` } : {}}
              >
                {/* ── SPONSOR card ── */}
                {isSponsor ? (
                  <>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-black shrink-0 overflow-hidden"
                      style={{ backgroundColor: accent }}>
                      {entry.logoUrl
                        ? <img src={entry.logoUrl} alt={entry.pseudonym} className="w-full h-full object-cover" />
                        : entry.pseudonym[0].toUpperCase()
                      }
                    </div>
                    <span className="text-xs font-bold text-white whitespace-nowrap">{entry.pseudonym}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border"
                      style={{ color: accent, borderColor: `${accent}55`, backgroundColor: `${accent}18` }}>
                      {entry.badgeText ?? (entry.slotType === 'promo' ? '📢' : '🤝')}
                    </span>
                  </>
                ) : isActive && fijoDorsal != null ? (
                  /* ── ACTIVE TODAY with fijo dorsal ── */
                  <>
                    {/* Green live dot */}
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
                    {/* Dorsal chip — prominent */}
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 text-black"
                      style={{ backgroundColor: GOLD }}>
                      {fijoDorsal}
                    </span>
                    {/* Name */}
                    <span className="text-xs font-bold text-white whitespace-nowrap">{entry.pseudonym}</span>
                    {/* E1 if available */}
                    {entry.e1 !== null && (
                      <span className={`text-[10px] font-bold px-1 py-0.5 rounded border ${
                        entry.e1 >= 70 ? 'text-green-400 border-green-800/50 bg-green-950/40' :
                        entry.e1 >= 50 ? 'text-yellow-400 border-yellow-800/50 bg-yellow-950/40' :
                        'text-gray-400 border-gray-700 bg-gray-800/40'
                      }`}>
                        {entry.e1}%
                      </span>
                    )}
                  </>
                ) : isActive ? (
                  /* ── ACTIVE TODAY but no specific dorsal ── */
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 animate-pulse" />
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-black shrink-0"
                      style={{ backgroundColor: GOLD }}>
                      {entry.pseudonym[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-white whitespace-nowrap">{entry.pseudonym}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-green-950/40 border border-green-800/40 text-green-400">
                      Hoy
                    </span>
                  </>
                ) : (
                  /* ── DISCOVERY (ranking fill) ── */
                  <>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-black shrink-0 opacity-70"
                      style={{ backgroundColor: GOLD }}>
                      {entry.pseudonym[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">{entry.pseudonym}</span>
                    {entry.e1 !== null && (
                      <span className="text-[10px] font-bold px-1 py-0.5 rounded border text-gray-500 border-gray-700 bg-gray-800/40">
                        E1 {entry.e1}%
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Drawer */}
      <HandicapperQuickDrawer
        entry={selected}
        onClose={() => setSelected(null)}
        meetingId={activeMeetingId}
      />
    </>
  );
}
