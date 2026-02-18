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
  trackName: string;
  raceCount: number;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/meetings/upcoming?limit=4')
      .then(r => r.json())
      .then(d => setMeetings(d.meetings ?? []))
      .catch(() => {});
  }, []);

  const user = session?.user;
  const isLoggedIn = status === 'authenticated';
  const golds = (user as any)?.balance?.golds ?? 0;
  const roles: string[] = (user as any)?.roles ?? [];
  const isPrivileged = roles.some(r => ['admin', 'staff'].includes(r));
  const isHandicapper = roles.includes('handicapper');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-gray-800 bg-gray-950/95 backdrop-blur">
        <div className="mx-auto max-w-lg px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🏇</span>
            <span className="text-sm font-bold text-white">Desafío Hípico</span>
          </Link>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <button onClick={() => setShowTopUp(true)}
                  className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors hover:bg-gray-700"
                  style={{ color: GOLD }}>
                  🪙 {golds}
                </button>
                <div className="relative">
                  <button onClick={() => setMenuOpen(o => !o)}
                    className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-white hover:bg-gray-700 transition-colors">
                    {(user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                      <div className="px-3 py-2.5 border-b border-gray-800">
                        <p className="text-xs text-gray-400 font-semibold truncate">{user?.name ?? user?.email}</p>
                        <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                      </div>
                      <Link href="/pronosticos" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                        🏇 Pronósticos
                      </Link>
                      <Link href="/perfil" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                        👤 Mi perfil
                      </Link>
                      {isHandicapper && (
                        <Link href="/handicapper/forecast" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                          🎯 Subir pronóstico
                        </Link>
                      )}
                      {isPrivileged && (
                        <Link href="/admin/topup" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                          ⚙️ Admin
                        </Link>
                      )}
                      <button onClick={() => { setMenuOpen(false); signOut(); }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-gray-800 transition-colors border-t border-gray-800">
                        🚪 Salir
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link href="/auth/signin"
                className="px-4 py-2 rounded-xl text-sm font-bold text-black"
                style={{ backgroundColor: GOLD }}>
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 mx-auto w-full max-w-lg px-4 pt-14 pb-10 flex flex-col items-center text-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            Pronósticos<br /><span style={{ color: GOLD }}>hípicos</span> VIP
          </h1>
          <p className="text-sm text-gray-500 mt-3">Venezuela · La Rinconada · La Rinconada</p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col w-full gap-3 max-w-xs">
          <Link href="/pronosticos"
            className="w-full py-3.5 rounded-2xl text-base font-bold text-black text-center"
            style={{ backgroundColor: GOLD }}>
            Ver pronósticos
          </Link>
          {!isLoggedIn && (
            <Link href="/auth/signin"
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors text-center">
              Crear cuenta gratis
            </Link>
          )}
        </div>

        {/* Upcoming meetings — minimal */}
        {meetings.length > 0 && (
          <div className="w-full mt-2 space-y-2">
            <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Próximas reuniones</p>
            {meetings.map(m => {
              const d = new Date(m.date);
              return (
                <Link key={m.id} href={`/pronosticos`}
                  className="flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-yellow-800/40 rounded-2xl px-4 py-3 transition-colors group">
                  <div className="shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center text-black font-bold text-xs"
                    style={{ backgroundColor: GOLD }}>
                    <span className="text-base font-extrabold leading-none">{d.getDate()}</span>
                    <span className="uppercase leading-none">{d.toLocaleDateString('es-VE', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-bold text-white truncate">{m.trackName}</p>
                    <p className="text-xs text-gray-600">Reunión {m.meetingNumber} · {m.raceCount} carreras</p>
                  </div>
                  <span className="text-gray-700 group-hover:text-yellow-600 transition-colors text-lg">›</span>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
    </div>
  );
}
