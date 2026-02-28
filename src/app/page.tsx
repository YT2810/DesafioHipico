'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import TopUpModal from '@/components/TopUpModal';
import NotificationBell from '@/components/NotificationBell';

const GOLD = '#D4AF37';

interface PreviewForecast {
  pseudonym: string;
  raceLabel?: string;
  marks: { dorsalNumber?: number; horseName: string; label: string }[];
}

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
  const [previewForecasts, setPreviewForecasts] = useState<PreviewForecast[]>([]);

  useEffect(() => {
    fetch('/api/meetings/upcoming?limit=4')
      .then(r => r.json())
      .then(d => {
        const ms: MeetingItem[] = d.meetings ?? [];
        setMeetings(ms);
        // Prefer La Rinconada meeting for preview; fall back to first
        const lrc = ms.find(m => !m.trackName.toLowerCase().includes('valencia'));
        const previewMeeting = lrc ?? ms[0];
        if (previewMeeting?.id) {
          fetch(`/api/forecasts/preview?meetingId=${previewMeeting.id}`)
            .then(r => r.json())
            .then(d => setPreviewForecasts(d.forecasts ?? []))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [])

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
                <NotificationBell />
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
                      <Link href="/retirados" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                        🚫 Retirados
                      </Link>
                      <Link href="/perfil" onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                        👤 Mi perfil
                      </Link>
                      {(isHandicapper || isPrivileged) && (
                        <Link href="/handicapper/forecast" onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 transition-colors">
                          🎯 Subir pronóstico
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

      {/* ── Launch Banner ── */}
      <div className="bg-gradient-to-r from-yellow-900/70 to-yellow-800/40 border-b border-yellow-700/50 px-4 py-2.5 text-center">
        <p className="text-xs font-bold text-yellow-300">🎁 ¡PROMO DE LANZAMIENTO! Todo el análisis hípico liberado por tiempo limitado</p>
      </div>

      {/* ── Main ── */}
      <main className="flex-1 mx-auto w-full max-w-lg px-4 pt-8 pb-10 flex flex-col items-center text-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white leading-tight">
            Pronósticos<br /><span style={{ color: GOLD }}>hípicos</span> VIP
          </h1>
          <p className="text-sm text-gray-500 mt-3">Inscritos La Rinconada y Valencia · Resultados · Venezuela</p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col w-full gap-3 max-w-xs">
          <Link href="/pronosticos"
            className="w-full py-3.5 rounded-2xl text-base font-bold text-black text-center"
            style={{ backgroundColor: GOLD }}>
            Ver pronósticos
          </Link>
          <Link href="/retirados"
            className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-400 bg-gray-900 border border-gray-800 hover:border-gray-600 transition-colors text-center">
            🚫 Ver retirados del día
          </Link>
          {!isLoggedIn && (
            <Link href="/auth/signin?mode=register"
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors text-center">
              🎁 Crear cuenta gratis
            </Link>
          )}
        </div>

        {/* ── Upcoming meetings — shown first for SEO and UX ── */}
        {meetings.length > 0 && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Próximas reuniones</p>
              <span className="text-xs text-gray-700">Inscritos disponibles</span>
            </div>
            {meetings.map(m => {
              const d = new Date(m.date);
              const isValencia = m.trackName.toLowerCase().includes('valencia');
              const trackLabel = isValencia ? '🏟 Valencia' : '🏇 La Rinconada';
              return (
                <Link key={m.id} href={`/programa/${m.id}`}
                  className="flex items-center gap-3 bg-gray-900 border border-gray-800 hover:border-yellow-800/40 rounded-2xl px-4 py-3 transition-colors group">
                  <div className="shrink-0 w-10 h-10 rounded-xl flex flex-col items-center justify-center text-black font-bold text-xs"
                    style={{ backgroundColor: GOLD }}>
                    <span className="text-base font-extrabold leading-none">{d.getUTCDate()}</span>
                    <span className="uppercase leading-none">{d.toLocaleDateString('es-VE', { month: 'short', timeZone: 'UTC' })}</span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-bold text-white truncate">{trackLabel} · Reunión {m.meetingNumber}</p>
                    <p className="text-xs text-gray-500">{m.raceCount} carreras programadas · Ver inscritos</p>
                  </div>
                  <span className="text-gray-700 group-hover:text-yellow-600 transition-colors text-lg">›</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Forecast preview ── */}
        {status !== 'loading' && (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Vista previa · expertos</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{color:GOLD,backgroundColor:'rgba(212,175,55,0.12)',border:'1px solid rgba(212,175,55,0.2)'}}>Gratis hoy</span>
            </div>

            {/* Show all real forecasters or placeholder */}
            {(previewForecasts.length > 0 ? previewForecasts : [
              {pseudonym:'El Profeta',marks:[{horseName:'RELÁMPAGO',dorsalNumber:3,label:'Línea'},{horseName:'SOL NACIENTE',dorsalNumber:7,label:'Casi Fijo'},{horseName:'VIENTO NORTE',dorsalNumber:1,label:'Buen Dividendo'}]},
              {pseudonym:'La Cátedra',marks:[{horseName:'LUNA LLENA',dorsalNumber:5,label:'Línea'},{horseName:'TRUENO REAL',dorsalNumber:2,label:'Casi Fijo'}]},
            ] as PreviewForecast[]).flatMap((exp, ei) => {
              const card = (
                <div key={`fc-${ei}`} className={`bg-gray-900 border border-gray-800 rounded-2xl p-4 text-left transition-all ${
                  !isLoggedIn && ei > 0 ? 'blur-sm pointer-events-none select-none opacity-50' : ''
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
                      style={{backgroundColor:'rgba(212,175,55,0.15)',color:GOLD,border:'1.5px solid rgba(212,175,55,0.25)'}}>
                      {exp.pseudonym[0].toUpperCase()}
                    </span>
                    <span className="text-sm font-bold text-white flex-1 truncate">{exp.pseudonym}</span>
                    {exp.raceLabel && (
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300 shrink-0">{exp.raceLabel}</span>
                    )}
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0" style={{color:GOLD,backgroundColor:'rgba(212,175,55,0.12)',border:'1px solid rgba(212,175,55,0.2)'}}>VIP 🎁</span>
                  </div>
                  <div className="space-y-1.5">
                    {exp.marks.slice(0,3).map((m, mi) => (
                      <div key={mi} className="flex items-center gap-2 bg-gray-800/60 rounded-xl px-3 py-2">
                        <span className="text-xs font-bold text-gray-600 w-3">{mi+1}</span>
                        {m.dorsalNumber != null && (
                          <span className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-xs font-extrabold text-white shrink-0">{m.dorsalNumber}</span>
                        )}
                        <span className="text-xs font-semibold text-white truncate flex-1">{m.horseName}</span>
                        <span className="text-xs text-gray-500 shrink-0">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
              // Inject CTA between card 0 and card 1 for non-logged users
              if (!isLoggedIn && ei === 0 && previewForecasts.length > 1) {
                return [card, (
                  <div key="cta-inline" className="rounded-2xl border border-yellow-700/50 bg-yellow-950/20 px-5 py-4 flex flex-col items-center gap-2.5 text-center">
                    <p className="text-sm font-extrabold text-white">
                      Regístrate gratis para ver<br />
                      <span style={{color:GOLD}}>las marcas de todos los expertos</span>
                    </p>
                    <Link href="/auth/signin?mode=register"
                      className="w-full max-w-xs py-3 rounded-2xl text-sm font-bold text-black text-center"
                      style={{ backgroundColor: GOLD }}>
                      🎁 Regístrate gratis — es gratis
                    </Link>
                    <Link href="/auth/signin" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Ya tengo cuenta →</Link>
                  </div>
                )];
              }
              return [card];
            })}

            {/* Ver más for logged users */}
            {isLoggedIn && (
              <Link href="/pronosticos"
                className="w-full py-3 rounded-2xl text-sm font-bold text-black text-center block"
                style={{ backgroundColor: GOLD }}>
                Ver todos los pronósticos →
              </Link>
            )}
          </div>
        )}

        {/* SEO footer text — visible but subtle, helps Google index key terms */}
        <p className="text-xs text-gray-800 text-center leading-relaxed">
          Inscritos La Rinconada · Inscritos Valencia · Resultados hípicos Venezuela · Revista La Rinconada · Datos INH · HINAVA
        </p>
      </main>

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}

      {/* Sticky bottom CTA — non-logged users with blurred forecasters */}
      {!isLoggedIn && previewForecasts.length > 1 && status !== 'loading' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 pt-2 bg-gradient-to-t from-gray-950 via-gray-950/95 to-transparent pointer-events-none">
          <div className="max-w-sm mx-auto pointer-events-auto">
            <Link
              href="/auth/signin?mode=register"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-extrabold text-black shadow-lg shadow-yellow-900/30"
              style={{ backgroundColor: GOLD }}
            >
              🎁 Ver todos los expertos — gratis
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
