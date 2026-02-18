'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopUpModal from '@/components/TopUpModal';

const GOLD = '#D4AF37';

interface MeetingItem {
  id: string;
  meetingNumber: number;
  date: string;
  status: string;
  trackName: string;
  trackLocation: string;
  raceCount: number;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/meetings/upcoming?limit=6')
      .then(r => r.json())
      .then(d => setMeetings(d.meetings ?? []))
      .catch(() => {})
      .finally(() => setLoadingMeetings(false));
  }, []);

  const user = session?.user;
  const isLoggedIn = status === 'authenticated';
  const golds = user?.balance?.golds ?? 0;
  const isPrivileged = user?.roles?.some(r => ['admin', 'staff', 'handicapper'].includes(r));

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🏇</span>
            <span className="text-base font-bold text-white hidden sm:block">Desafío Hípico</span>
          </Link>

          <nav className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {/* Gold balance */}
                <button
                  onClick={() => setShowTopUp(true)}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <span className="text-sm">🪙</span>
                  <span className="text-sm font-bold" style={{ color: GOLD }}>{golds}</span>
                  <span className="text-xs text-gray-500 hidden sm:block">Golds</span>
                </button>

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-200 max-w-[80px] truncate">
                      {user?.alias ?? user?.name ?? 'Usuario'}
                    </span>
                    <span className="text-xs text-gray-500">{menuOpen ? '▲' : '▼'}</span>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-gray-800">
                        <p className="text-xs text-gray-500 truncate">{user?.email ?? ''}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {user?.roles?.map(r => (
                            <span key={r} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded capitalize">{r}</span>
                          ))}
                        </div>
                      </div>
                      <Link href="/pronosticos" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                        🏇 Pronósticos
                      </Link>
                      {isPrivileged && (
                        <Link href="/admin/ingest" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                          ⚙️ Admin
                        </Link>
                      )}
                      <button
                        onClick={() => { setMenuOpen(false); signOut(); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800 transition-colors"
                      >
                        🚪 Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black transition-opacity hover:opacity-90"
                style={{ backgroundColor: GOLD }}
              >
                Entrar
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-950/20 via-gray-950 to-gray-950 pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-950/40 border border-yellow-800/40 rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-semibold" style={{ color: GOLD }}>🏆 Marketplace de Pronósticos Hípicos</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4">
            Desafío <span style={{ color: GOLD }}>Hípico</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto mb-8">
            Los mejores handicappers de Venezuela en un solo lugar. Pronósticos VIP, estadísticas reales y comunidad hípica.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {!isLoggedIn ? (
              <>
                <button
                  onClick={() => signIn()}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl text-base font-bold text-black"
                  style={{ backgroundColor: GOLD }}
                >
                  Empezar gratis
                </button>
                <Link href="/pronosticos"
                  className="w-full sm:w-auto px-8 py-3 rounded-xl text-base font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors text-center">
                  Ver pronósticos
                </Link>
              </>
            ) : (
              <Link href="/pronosticos"
                className="px-8 py-3 rounded-xl text-base font-bold text-black"
                style={{ backgroundColor: GOLD }}>
                Ver pronósticos de hoy
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-gray-800 bg-gray-900/50">
        <div className="mx-auto max-w-4xl px-4 py-4 grid grid-cols-3 divide-x divide-gray-800">
          {[
            { icon: '🏇', label: 'Hipódromos', value: '2' },
            { icon: '🎯', label: 'Handicappers', value: '12+' },
            { icon: '🪙', label: 'Golds = $10', value: '40' },
          ].map(s => (
            <div key={s.label} className="text-center px-2">
              <p className="text-xl sm:text-2xl font-extrabold" style={{ color: GOLD }}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.icon} {s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Upcoming Meetings ── */}
      <section className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">📅 Próximas Reuniones</h2>
          <Link href="/pronosticos" className="text-xs font-medium hover:underline" style={{ color: GOLD }}>
            Ver pronósticos →
          </Link>
        </div>

        {loadingMeetings ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-gray-800/50 animate-pulse" />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">No hay reuniones programadas aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {meetings.map(m => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
          </div>
        )}
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-4xl px-4 py-8 border-t border-gray-800">
        <h2 className="text-base font-bold text-white mb-6 text-center">¿Cómo funciona?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '🆓', title: '2 carreras gratis', desc: 'Cada reunión incluye 2 carreras con pronósticos sin costo.' },
            { icon: '🪙', title: 'Desbloquea con Golds', desc: 'Compra Golds (40 = $10) y desbloquea el resto de las carreras.' },
            { icon: '📊', title: 'Estadísticas reales', desc: 'Cada handicapper tiene su % de acierto verificado automáticamente.' },
          ].map(s => (
            <div key={s.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
              <div className="text-3xl mb-3">{s.icon}</div>
              <p className="text-sm font-bold text-white mb-1">{s.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Floating Recharge button ── */}
      {isLoggedIn && (
        <button
          onClick={() => setShowTopUp(true)}
          className="fixed bottom-6 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold text-black shadow-2xl shadow-yellow-900/40 active:scale-95 transition-transform"
          style={{ backgroundColor: GOLD }}
        >
          🪙 Recargar Golds
        </button>
      )}

      {/* ── TopUp Modal ── */}
      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({ meeting }: { meeting: MeetingItem }) {
  const date = new Date(meeting.date);
  const dateStr = date.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
  const isPast = date < new Date();

  return (
    <Link href={`/pronosticos?meetingId=${meeting.id}`}
      className="group bg-gray-900 hover:bg-gray-800/80 border border-gray-800 hover:border-yellow-800/50 rounded-2xl p-4 flex items-center gap-4 transition-all">
      <div className="shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-black font-bold"
        style={{ backgroundColor: GOLD }}>
        <span className="text-lg leading-none">{date.getDate()}</span>
        <span className="text-xs leading-none uppercase">{date.toLocaleDateString('es-VE', { month: 'short' })}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{meeting.trackName}</p>
        <p className="text-xs text-gray-500 truncate capitalize">{dateStr}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-600">Reunión #{meeting.meetingNumber}</span>
          <span className="text-xs text-gray-700">·</span>
          <span className="text-xs text-gray-600">{meeting.raceCount} carreras</span>
          {isPast && <span className="text-xs text-gray-700 bg-gray-800 px-1.5 py-0.5 rounded">Pasada</span>}
        </div>
      </div>
      <span className="text-gray-600 group-hover:text-yellow-600 transition-colors">›</span>
    </Link>
  );
}
