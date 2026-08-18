'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface ActivityEvent {
  alias: string;
  action: string;
  emoji: string;
  type: string;
  minutesAgo: number;
}

function timeLabel(minutes: number): string {
  if (minutes < 2) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  if (minutes < 120) return 'hace 1 hora';
  const h = Math.floor(minutes / 60);
  if (h < 24) return `hace ${h}h`;
  return 'esta semana';
}

export default function SocialProofToast({ onTopUp }: { onTopUp?: () => void }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/activity/recent')
      .then(r => r.json())
      .then(d => { if (d.events?.length) setEvents(d.events); })
      .catch(() => {});
  }, []);

  const showToast = useCallback((idx: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setIndex(idx);
    setVisible(true);
    hideTimer.current = setTimeout(() => setVisible(false), 6000);
  }, []);

  useEffect(() => {
    if (!events.length || dismissed) return;
    // First show after 10s
    const first = setTimeout(() => showToast(0), 10000);
    // Repeat every 30s
    const interval = setInterval(() => {
      setIndex(prev => {
        const next = (prev + 1) % events.length;
        showToast(next);
        return next;
      });
    }, 30000);
    return () => { clearTimeout(first); clearInterval(interval); if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [events, dismissed, showToast]);

  if (!events.length || dismissed || !visible) return null;
  const ev = events[index];
  const isPurchase = ev.type === 'purchase' || ev.type === 'meeting_pass';

  return (
    <div
      className="fixed bottom-24 left-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 pointer-events-auto"
      style={{ animation: 'spFadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <style>{`
        @keyframes spFadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div className={`rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3 border ${isPurchase ? 'bg-gray-900 border-yellow-600/50' : 'bg-gray-900 border-gray-700/60'}`}>
        {/* Emoji icon */}
        <span className="text-xl shrink-0 mt-0.5">{ev.emoji}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-100 leading-snug">
            <span className="font-bold text-yellow-300">{ev.alias}</span>{' '}
            <span>{ev.action}</span>
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">{timeLabel(ev.minutesAgo)}</p>
        </div>

        {/* CTA only for purchase-type events */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isPurchase && onTopUp && (
            <button
              onClick={() => { setVisible(false); onTopUp(); }}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-black whitespace-nowrap"
              style={{ backgroundColor: '#D4AF37' }}
            >
              Ver planes
            </button>
          )}
          <button
            onClick={() => { setVisible(false); setDismissed(true); }}
            className="text-gray-600 hover:text-gray-400 text-xs leading-none px-1"
            aria-label="Cerrar"
          >✕</button>
        </div>
      </div>
    </div>
  );
}
