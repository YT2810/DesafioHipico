'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import TopUpModal from '@/components/TopUpModal';
import type { PublicVipMeetingItem } from '@/services/fvAccuracyService';

const GOLD = '#D4AF37';

interface VipAllResponse {
  meetings: PublicVipMeetingItem[];
  weekStartIso: string;
  isLoggedIn: boolean;
  isUnlocked: boolean;
}

// Track icon by name
function trackIcon(trackName: string): string {
  if (/valencia/i.test(trackName)) return '🏁';
  return '🏇';
}

// Short display name: "La Rinconada" → "La Rinconada", "Hipódromo Nacional..." → first meaningful word
function trackShortName(trackName: string): string {
  if (/rinconada/i.test(trackName)) return 'La Rinconada';
  if (/valencia/i.test(trackName)) return 'Valencia';
  // Fallback: first two words
  return trackName.split(' ').slice(0, 2).join(' ');
}

// Chip label: "R46 · Sáb 15"
function chipLabel(m: PublicVipMeetingItem): string {
  if (!m.date) return `R${m.meetingNumber}`;
  const d = new Date(m.date + 'T12:00:00');
  const day = d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric' });
  return `R${m.meetingNumber} · ${day}`;
}

// Smart default: first meeting where at least one válida hasn't been won yet
function pickDefault(meetings: PublicVipMeetingItem[]): number {
  const idx = meetings.findIndex(m =>
    m.validas.some(v => v.winnerDorsal == null)
  );
  return idx >= 0 ? idx : 0;
}

export default function VipFiveAndSixWidget() {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [tier, setTier] = useState<'economico' | 'medio'>('medio');
  const [allData, setAllData] = useState<VipAllResponse | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  const isHiddenRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/auth');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setAllData(null);
    try {
      const res = await fetch('/api/vip-5y6/todas');
      if (res.ok) {
        const json: VipAllResponse = await res.json();
        setAllData(json);
        setSelectedIdx(pickDefault(json.meetings));
      }
    } catch {
      // silent — network error on background fetch
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHiddenRoute && open && !allData) {
      loadAll();
    }
  }, [isHiddenRoute, open, allData, loadAll]);

  if (isHiddenRoute) return null;

  const meetings = allData?.meetings ?? [];
  const data = meetings[selectedIdx] ?? null;
  const isUnlocked = allData?.isUnlocked ?? false;
  const isLoggedIn = allData?.isLoggedIn ?? false;
  const showChips = meetings.length > 1;

  const combCount = tier === 'economico' ? (data?.combinationsEco ?? 144) : (data?.combinationsMed ?? 432);
  const costBs = tier === 'economico' ? (data?.costBsEco ?? 7200) : (data?.costBsMed ?? 21600);

  return (
    <>
      {/* FLOATING GOLD BADGE */}
      <div className="fixed right-3 bottom-32 z-40">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            fetch('/api/track/vip5y6', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ track: 'todas' }),
              keepalive: true,
            }).catch(() => {});
          }}
          aria-label="Abrir Cuadro 5y6 VIP del Algoritmo"
          className="group relative flex items-center gap-2 rounded-full p-1 pr-4 bg-gradient-to-r from-[#1a1405] via-[#2b2108] to-[#1a1405] border-2 border-[#D4AF37] shadow-[0_0_24px_rgba(212,175,55,0.45)] hover:shadow-[0_0_32px_rgba(212,175,55,0.75)] hover:scale-105 active:scale-95 transition-all"
        >
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black text-black shadow-inner shrink-0"
            style={{ background: 'radial-gradient(circle at 30% 30%, #FFE885, #D4AF37 65%, #9A7B1C)' }}
          >
            👑
          </span>
          <div className="text-left leading-tight">
            <span className="block text-[9px] font-extrabold uppercase tracking-widest text-yellow-400/80">Club VIP</span>
            <span className="block text-lg font-black text-white tracking-tight whitespace-nowrap" style={{ lineHeight: 1 }}>5y6</span>
          </div>
          <span className="absolute -top-1.5 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-600 text-white border border-yellow-400 animate-pulse">
            VIP
          </span>
        </button>
      </div>

      {/* VIP MODAL / DRAWER */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full sm:max-w-lg bg-gray-950 border border-yellow-600/50 rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(212,175,55,0.2)]">

            {/* Top Gold Bar */}
            <div className="bg-gradient-to-r from-[#1f1705] via-[#332609] to-[#1f1705] border-b border-yellow-700/40 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black text-black shrink-0" style={{ backgroundColor: GOLD }}>
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-extrabold text-white">Cuadro 5y6 VIP · Algoritmo FV</h2>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isUnlocked
                        ? 'bg-green-950 text-green-300 border-green-700'
                        : 'bg-yellow-950/80 text-yellow-300 border-yellow-700/60'
                    }`}>
                      {isUnlocked ? '🔓 ACTIVO ESTA SEMANA' : '🔒 EXCLUSIVO PASE VIP'}
                    </span>
                  </div>
                  <p className="text-xs text-yellow-200/70">Premiado en el 52% de las reuniones de 2026 · ROI verificado 3.93x</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-xl leading-none px-1 shrink-0">✕</button>
            </div>

            {/* Controls */}
            <div className="px-5 pt-3 pb-2 border-b border-gray-800/80 bg-gray-900/60 space-y-2 shrink-0">

              {/* Meeting chips — only when multiple meetings */}
              {showChips && (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                  {meetings.map((m, i) => {
                    const active = i === selectedIdx;
                    const allRan = m.validas.every(v => v.winnerDorsal != null);
                    return (
                      <button
                        key={m.meetingId}
                        type="button"
                        onClick={() => setSelectedIdx(i)}
                        className={`flex-none flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                          active
                            ? 'text-black border-transparent'
                            : allRan
                              ? 'text-gray-600 bg-gray-800/60 border-gray-700/40'
                              : 'text-gray-400 bg-gray-900 border-gray-700 hover:border-gray-600'
                        }`}
                        style={active ? { backgroundColor: GOLD } : undefined}
                        title={trackShortName(m.trackName)}
                      >
                        <span>{trackIcon(m.trackName)}</span>
                        <span>{chipLabel(m)}</span>
                        {allRan && !active && <span className="text-[9px] opacity-60">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tier selector */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTier('economico')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    tier === 'economico'
                      ? 'bg-yellow-950/50 text-yellow-300 border-yellow-600'
                      : 'bg-gray-900/60 text-gray-500 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  Económico{data ? ` · ${data.combinationsEco} comb.` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setTier('medio')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    tier === 'medio'
                      ? 'bg-yellow-950/50 text-yellow-300 border-yellow-600'
                      : 'bg-gray-900/60 text-gray-500 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  ⭐ Recomendado{data ? ` · ${data.combinationsMed} comb.` : ''}
                </button>
              </div>
            </div>

            {/* Content — scrollable */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
              {loading ? (
                <div className="space-y-2.5 py-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-16 rounded-xl bg-gray-900 animate-pulse" />
                  ))}
                </div>
              ) : !data ? (
                <div className="text-center py-10 text-xs text-gray-500 space-y-1.5">
                  <p className="text-2xl">🏇</p>
                  <p>No hay jornadas 5y6 activas esta semana.</p>
                  <p>El cuadro VIP aparecerá en cuanto se cargue el próximo programa.</p>
                </div>
              ) : (
                <>
                  {/* Meeting summary row */}
                  <div className="flex items-center justify-between text-xs bg-gray-900/90 border border-gray-800 rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span>{trackIcon(data.trackName)}</span>
                      <span className="text-gray-300 font-semibold">{trackShortName(data.trackName)}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-gray-400">Reunión {data.meetingNumber}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-gray-300">{data.date}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-yellow-400">
                        {combCount.toLocaleString('es-VE')} comb. · Bs. {costBs.toLocaleString('es-VE')}
                      </span>
                    </div>
                  </div>

                  {isUnlocked && (
                    <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-xl px-3.5 py-2 text-[11px] text-yellow-200/80">
                      📌 <strong>Nota:</strong> Los ejemplares se muestran en <strong>orden numérico de dorsal</strong>. Para ver el % FV exacto y el 1º favorito consulta Pronósticos.
                    </div>
                  )}

                  {/* Válidas */}
                  <div className="space-y-2.5">
                    {data.validas.map(v => {
                      const badge = tier === 'economico' ? v.badgeEco : v.badgeMed;
                      const count = tier === 'economico' ? v.countEco : v.countMed;
                      const horses = tier === 'economico' ? v.horsesEco : v.horsesMed;

                      return (
                        <div key={v.validaNumber} className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-white">
                              {v.validaNumber}ª Válida{' '}
                              <span className="text-gray-500 font-normal">
                                · Carrera {v.raceNumber} ({v.distance}m · {v.fieldSize} ej.)
                              </span>
                            </span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-yellow-500/15 text-yellow-300 border border-yellow-600/30">
                              {badge}
                            </span>
                          </div>

                          {isUnlocked ? (
                            <div className="flex flex-wrap gap-1.5">
                              {horses.map((h, idx) => {
                                const isWinner = v.winnerDorsal != null && h.dorsalNumber === v.winnerDorsal;
                                const isFaded = v.winnerDorsal != null && !isWinner;
                                return (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold text-white ${
                                      isWinner
                                        ? 'bg-yellow-500/15 border-yellow-500 shadow-[0_0_10px_rgba(212,175,55,0.25)]'
                                        : `bg-gray-950 border-gray-700 ${isFaded ? 'opacity-45' : ''}`
                                    }`}
                                  >
                                    <span className="w-5 h-5 rounded flex items-center justify-center text-[11px] font-black text-black shrink-0" style={{ backgroundColor: GOLD }}>
                                      {h.dorsalNumber ?? '?'}
                                    </span>
                                    <span className="truncate max-w-[140px]">{h.horseName}</span>
                                    {isWinner && <span title="Ganador oficial">🏆</span>}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between bg-gray-950/80 border border-gray-800/80 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                {Array.from({ length: count }).map((_, idx) => (
                                  <span key={idx} className="px-2.5 py-1 rounded bg-gray-800/90 border border-gray-700 text-[11px] font-bold text-gray-500 select-none">
                                    🔒 #{idx + 1}
                                  </span>
                                ))}
                              </div>
                              <span className="text-[11px] text-yellow-500/80 font-semibold">
                                {count} {count === 1 ? 'ejemplar' : 'ejemplares'}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA — only when locked */}
                  {!isUnlocked && (
                    <div className="bg-gradient-to-br from-yellow-950/50 via-gray-900 to-yellow-950/30 border border-yellow-600/50 rounded-2xl p-4 text-center space-y-3 mt-2">
                      <p className="text-xs font-extrabold text-yellow-300 uppercase tracking-wider">
                        🔓 Desbloquea el Cuadro 5y6 VIP
                        {showChips ? ` (${meetings.length} jornadas)` : ' de esta semana'}
                      </p>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Con el <strong>Pase Nacional activo</strong> tienes acceso al cuadro VIP de{' '}
                        <strong>todas las jornadas de lunes a domingo</strong>, además de pronósticos completos y diagnóstico FV por carrera.
                      </p>
                      {isLoggedIn ? (
                        <button
                          type="button"
                          onClick={() => { setOpen(false); setShowTopUp(true); }}
                          className="w-full py-3 rounded-xl text-sm font-black text-black shadow-lg hover:brightness-110 transition-all"
                          style={{ backgroundColor: GOLD }}
                        >
                          🎟️ Activar Pase Semanal (Bs. 6.000) →
                        </button>
                      ) : (
                        <Link
                          href="/auth/signin"
                          onClick={() => setOpen(false)}
                          className="block w-full py-3 rounded-xl text-sm font-black text-black shadow-lg"
                          style={{ backgroundColor: GOLD }}
                        >
                          🔑 Inicia sesión y activa tu Pase →
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
    </>
  );
}
