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

function Avatar({ alias }: { alias: string }) {
  const initial = alias.replace(/\*/g, '').trim()[0]?.toUpperCase() ?? '?';
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-extrabold text-black"
      style={{ background: 'linear-gradient(135deg, #D4AF37 0%, #F5D76E 100%)' }}
    >
      {initial}
    </div>
  );
}

export default function SocialProofToast({
  onTopUp,
  isGuest,
}: {
  onTopUp?: () => void;
  isGuest?: boolean;
}) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    fetch('/api/activity/recent')
      .then(r => r.json())
      .then(d => { if (d.events?.length) setEvents(d.events); })
      .catch(() => {});
  }, []);

  const showNext = useCallback((evts: ActivityEvent[]) => {
    if (!evts.length) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const next = (indexRef.current + 1) % evts.length;
    indexRef.current = next;
    setIndex(next);
    setVisible(true);
    hideTimer.current = setTimeout(() => setVisible(false), 5000);
  }, []);

  useEffect(() => {
    if (!events.length) return;
    // First show after 12s
    const first = setTimeout(() => {
      indexRef.current = -1;
      showNext(events);
    }, 12000);
    // Repeat every 20s indefinitely
    const interval = setInterval(() => showNext(events), 20000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [events, showNext]);

  if (!events.length || !visible) return null;
  const ev = events[index];
  const isPurchase = ev.type === 'purchase' || ev.type === 'meeting_pass';

  return (
    <div
      className="fixed top-20 left-1/2 z-[60] w-[calc(100vw-24px)] max-w-[420px] -translate-x-1/2 pointer-events-auto"
      style={{ animation: 'spSlideDown 0.45s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <style>{`
        @keyframes spSlideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.96); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)      scale(1);    }
        }
      `}</style>

      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: '#0f0f0f',
          border: '1px solid rgba(212,175,55,0.35)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.15)',
        }}
      >
        {/* Gold accent bar top */}
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #D4AF37, #F5D76E, #D4AF37)' }} />

        <div className="flex items-center gap-3 px-4 py-3">
          {/* Avatar */}
          <Avatar alias={ev.alias} />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">
              {ev.alias}
            </p>
            <p className="text-sm text-gray-300 leading-snug mt-0.5">
              {ev.emoji} {ev.action}
            </p>
            <p className="text-xs text-yellow-500/80 mt-1 font-medium">
              {timeLabel(ev.minutesAgo)}
            </p>
          </div>

          {/* CTA */}
          {(isPurchase || isGuest) && (
            <div className="shrink-0">
              {isGuest ? (
                <a
                  href="/api/auth/signin"
                  className="block text-xs font-extrabold px-3 py-2 rounded-xl text-black whitespace-nowrap text-center"
                  style={{ background: 'linear-gradient(135deg,#D4AF37,#F5D76E)' }}
                >
                  Entrar gratis
                  <span className="block text-[9px] font-normal opacity-70">es gratis →</span>
                </a>
              ) : onTopUp ? (
                <button
                  onClick={() => { setVisible(false); onTopUp(); }}
                  className="text-xs font-extrabold px-3 py-2 rounded-xl text-black whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg,#D4AF37,#F5D76E)' }}
                >
                  Ver planes →
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
