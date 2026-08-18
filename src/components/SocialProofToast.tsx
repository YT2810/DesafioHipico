'use client';

import { useEffect, useState, useCallback } from 'react';

interface ActivityEvent {
  alias: string;
  action: string;
  minutesAgo: number;
}

function timeLabel(minutes: number): string {
  if (minutes < 2) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const h = Math.floor(minutes / 60);
  return `hace ${h}h`;
}

export default function SocialProofToast({ onTopUp }: { onTopUp?: () => void }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/activity/recent')
      .then(r => r.json())
      .then(d => { if (d.events?.length) setEvents(d.events); })
      .catch(() => {});
  }, []);

  const showNext = useCallback(() => {
    if (!events.length || dismissed) return;
    setIndex(prev => (prev + 1) % events.length);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [events, dismissed]);

  useEffect(() => {
    if (!events.length || dismissed) return;
    // First show after 8s
    const first = setTimeout(() => {
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    }, 8000);
    // Then every 25s
    const interval = setInterval(showNext, 25000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [events, dismissed, showNext]);

  if (!events.length || dismissed || !visible) return null;
  const ev = events[index];

  return (
    <div
      className="fixed bottom-20 left-4 z-50 max-w-[260px] animate-fade-in"
      style={{ animation: 'fadeSlideUp 0.35s ease' }}
    >
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="bg-gray-900 border border-yellow-700/40 rounded-2xl px-4 py-3 shadow-xl flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-gray-200 leading-snug">
            <span className="font-bold text-yellow-300">{ev.alias}</span>{' '}
            {ev.action}
          </p>
          <button
            onClick={() => { setVisible(false); setDismissed(true); }}
            className="text-gray-600 hover:text-gray-400 shrink-0 text-sm leading-none mt-0.5"
            aria-label="Cerrar"
          >✕</button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-gray-600">{timeLabel(ev.minutesAgo)}</span>
          {onTopUp && (
            <button
              onClick={() => { setVisible(false); onTopUp(); }}
              className="text-[10px] font-bold text-yellow-400 hover:text-yellow-300 underline whitespace-nowrap"
            >
              Ver planes →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
