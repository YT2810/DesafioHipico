'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

const GOLD = '#D4AF37';
const POLL_INTERVAL = 30_000; // 30 seconds

interface Notif {
  _id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  topup_pending:       '💰',
  handicapper_request: '🎯',
  topup_approved:      '✅',
  topup_rejected:      '❌',
  followed_forecast:   '🏇',
  new_meeting:         '📅',
  new_meeting_hcp:     '📋',
  gold_low:            '⚠️',
  vip_purchase:        '💎',
  request_approved:    '🎉',
  request_rejected:    '❌',
  system:              '📢',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function NotificationBell() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    if (status !== 'authenticated') return;
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      // silent
    }
  }, [status]);

  // Initial load + polling
  useEffect(() => {
    fetchNotifs();
    const t = setInterval(fetchNotifs, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleOpen() {
    setOpen(o => !o);
    if (!open && unread > 0) {
      setLoading(true);
      try {
        await fetch('/api/notifications/read-all', { method: 'POST' });
        setUnread(0);
        setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  }

  if (status !== 'authenticated') return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative w-8 h-8 rounded-full bg-gray-800 border border-gray-700 hover:border-yellow-600 flex items-center justify-center transition-colors"
        title="Notificaciones"
        aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ''}`}
      >
        <span className="text-sm">🔔</span>
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold text-black px-0.5"
            style={{ backgroundColor: GOLD }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <p className="text-sm font-bold text-white">Notificaciones</p>
            <button
              onClick={() => { setOpen(false); fetchNotifs(); }}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 rounded-xl bg-gray-800 animate-pulse" />
                ))}
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <span className="text-3xl mb-2">🔕</span>
                <p className="text-sm text-gray-600">Sin notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/60">
                {notifs.map(n => {
                  const icon = TYPE_ICON[n.type] ?? '📢';
                  const content = (
                    <div className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-800/40 ${!n.read ? 'bg-yellow-950/10' : ''}`}>
                      <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-semibold leading-snug ${!n.read ? 'text-white' : 'text-gray-300'}`}>
                            {n.title}
                          </p>
                          <span className="text-xs text-gray-700 shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
                      </div>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: GOLD }} />
                      )}
                    </div>
                  );

                  return n.link ? (
                    <Link key={n._id} href={n.link} onClick={() => setOpen(false)}>
                      {content}
                    </Link>
                  ) : (
                    <div key={n._id}>{content}</div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="border-t border-gray-800 px-4 py-2.5 text-center">
              <button
                onClick={() => { fetchNotifs(); }}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
              >
                Actualizar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
