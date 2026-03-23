'use client';

import { useState, useEffect } from 'react';

const ChevronDown  = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>;
const ChevronRight = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>;
const Clock        = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/></svg>;
const AlertTriangle = ({ className }: { className?: string }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

interface FinishEntry { position: number; dorsal: number; horseName: string; jockeyName: string; officialTime?: string; distanceMargin?: string; }
interface PayoutRow { combination: string; amount: number; }
interface Payouts { winner?: PayoutRow[]; place?: PayoutRow[]; exacta?: PayoutRow[]; trifecta?: PayoutRow[]; superfecta?: PayoutRow[]; tripleApuesta?: PayoutRow[]; poolDe4?: PayoutRow[]; cincoYSeis?: PayoutRow[]; lotoHipico?: PayoutRow[]; }
interface RaceResult { raceId: string; raceNumber: number; annualRaceNumber?: number; distance: number; conditions?: string; officialTime?: string; games: string[]; payouts: Payouts; finishOrder: FinishEntry[]; scratched: { dorsal: number; horseName: string }[]; }
interface MeetingResult { meetingId: string; meetingNumber: number; date: string; trackName: string; summaryVideoUrl: string | null; races: RaceResult[]; }

const GAME_LABELS: Record<string, string> = { GANADOR:'Ganador', PLACE:'Place', EXACTA:'Exacta', TRIFECTA:'Trifecta', SUPERFECTA:'Superfecta', TRIPLE_APUESTA:'Triple', POOL_DE_4:'Pool 4', CINCO_Y_SEIS:'5 y 6', LOTO_HIPICO:'Loto' };
const POS_COLOR = ['text-yellow-400','text-gray-300','text-amber-600','text-gray-400','text-gray-500'];
const POS_BG    = ['bg-yellow-950/40 border-yellow-800/40','bg-gray-800/40 border-gray-700/40','bg-amber-950/40 border-amber-800/40','bg-gray-800/30 border-gray-700/30','bg-gray-800/20 border-gray-700/20'];
const MEDAL     = ['1°','2°','3°','4°','5°'];

function fmtBs(n: number) { return !n ? '—' : 'Bs. '+n.toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('es-VE',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
function trackSeoTitle(t: string) {
  const l = t.toLowerCase();
  if (l.includes('rinconada')) return 'RESULTADOS LA RINCONADA';
  if (l.includes('valencia'))  return 'RESULTADOS VALENCIA';
  if (l.includes('maracaibo')) return 'RESULTADOS MARACAIBO';
  return 'RESULTADOS '+t.toUpperCase();
}

function PayoutSection({ p }: { p: Payouts }) {
  const keys: Array<[keyof Payouts, string]> = [
    ['winner','Ganador'],['place','Place'],['exacta','Exacta'],['trifecta','Trifecta'],
    ['superfecta','Superfecta'],['tripleApuesta','Triple Apuesta'],['poolDe4','Pool de 4'],
    ['cincoYSeis','5 y 6'],['lotoHipico','Loto Hípico'],
  ];
  const active = keys.filter(([k]) => p[k]?.length);
  if (!active.length) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Dividendos</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {active.map(([k, label]) => (
          <div key={k} className="bg-gray-900/60 border border-gray-800 rounded-lg p-2">
            <p className="text-[10px] font-bold text-yellow-500 mb-1.5 uppercase">{label}</p>
            {p[k]!.map((row, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="text-xs text-gray-300 font-mono">{row.combination}</span>
                <span className="text-xs font-bold text-white">{fmtBs(row.amount)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function RaceCard({ race }: { race: RaceResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors text-left">
        <div className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0">
          <span className="text-sm font-extrabold text-white">C{race.raceNumber}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">Carrera {race.raceNumber}</span>
            <span className="text-[10px] text-gray-500">{race.distance}m</span>
            {race.officialTime && (
              <span className="flex items-center gap-1 text-[10px] text-blue-400">
                <Clock className="w-3 h-3"/>{race.officialTime}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {race.finishOrder.slice(0,3).map((e,i) => (
              <span key={i} className="text-[11px] text-gray-400">
                {MEDAL[i]} <span className="text-white font-medium">{e.horseName}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          <div className="hidden sm:flex gap-1 flex-wrap max-w-[120px]">
            {race.games.slice(0,3).map(g => (
              <span key={g} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400">{GAME_LABELS[g]??g}</span>
            ))}
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-gray-500"/> : <ChevronRight className="w-4 h-4 text-gray-500"/>}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-gray-800/60 space-y-3">
          {race.conditions && <p className="text-[11px] text-gray-500 mt-3 italic">{race.conditions}</p>}

          {race.finishOrder.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Orden de llegada</p>
              <div className="space-y-1">
                {race.finishOrder.map((e,i) => (
                  <div key={e.dorsal} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${POS_BG[i]??'bg-gray-800/20 border-gray-700/20'}`}>
                    <span className={`text-sm font-extrabold w-5 text-center shrink-0 ${POS_COLOR[i]??'text-gray-500'}`}>{e.position}</span>
                    <span className="w-6 h-6 rounded-md bg-gray-800 border border-gray-700 text-xs font-bold text-white flex items-center justify-center shrink-0">{e.dorsal}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{e.horseName}</p>
                      <p className="text-[11px] text-gray-500 truncate">{e.jockeyName}</p>
                    </div>
                    {e.distanceMargin && <span className="text-[10px] text-gray-500 shrink-0">{e.distanceMargin}</span>}
                    {e.officialTime    && <span className="text-[10px] text-blue-400 font-mono shrink-0">{e.officialTime}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {race.scratched.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Retirados</p>
              <div className="flex flex-wrap gap-1.5">
                {race.scratched.map(s => (
                  <span key={s.dorsal} className="text-[11px] px-2 py-1 rounded-md bg-red-950/30 border border-red-900/40 text-red-400">#{s.dorsal} {s.horseName}</span>
                ))}
              </div>
            </div>
          )}

          <PayoutSection p={race.payouts}/>
        </div>
      )}
    </div>
  );
}

function MeetingCard({ m, defaultOpen }: { m: MeetingResult; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const d = new Date(m.date);
  const dayNum  = d.getDate();
  const monthSh = d.toLocaleDateString('es-VE',{month:'short'}).toUpperCase();
  const year    = d.getFullYear();
  const seo     = trackSeoTitle(m.trackName);

  return (
    <article className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-start gap-4 p-4 hover:bg-gray-800/30 transition-colors text-left">
        {/* Date badge */}
        <div className="shrink-0 w-14 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden text-center">
          <div className="bg-yellow-600 text-black text-[9px] font-extrabold py-0.5 uppercase tracking-wider">{monthSh}</div>
          <div className="py-1">
            <p className="text-xl font-extrabold text-white leading-none">{dayNum}</p>
            <p className="text-[10px] text-gray-400">{year}</p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* SEO-optimized heading */}
          <h2 className="text-base font-extrabold text-white leading-tight">{seo}</h2>
          <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{fmtDate(m.date)}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
              Reunión #{m.meetingNumber}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
              {m.races.length} carrera{m.races.length !== 1 ? 's' : ''}
            </span>
            {m.summaryVideoUrl && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/50 border border-red-800/50 text-red-400">▶ Video resumen</span>
            )}
          </div>
        </div>
        {open ? <ChevronDown className="w-5 h-5 text-gray-500 mt-1 shrink-0"/> : <ChevronRight className="w-5 h-5 text-gray-500 mt-1 shrink-0"/>}
      </button>

      {open && (
        <div className="px-4 pb-5 border-t border-gray-800/60 space-y-4 pt-4">
          {/* YouTube embed */}
          {m.summaryVideoUrl && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">▶ Video Resumen del Día</p>
              <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{paddingBottom:'56.25%'}}>
                <iframe
                  src={m.summaryVideoUrl}
                  title={`Resumen ${seo}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-800/40 rounded-xl px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5"/>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              Los dividendos y posiciones son obtenidos mediante procesamiento automático de imágenes (OCR/IA) y pueden contener errores tipográficos o de reconocimiento.
              Verifique siempre con la fuente oficial del hipódromo. Desafío Hípico no se responsabiliza por inexactitudes en los datos publicados.
            </p>
          </div>

          {/* Races */}
          <div className="space-y-2">
            {m.races.map(race => <RaceCard key={race.raceId} race={race}/>)}
          </div>
        </div>
      )}
    </article>
  );
}

export default function ResultadosClient() {
  const [meetings, setMeetings] = useState<MeetingResult[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error,    setError]    = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/resultados?limit=5&page=${page}`)
      .then(r => r.json())
      .then(d => {
        setMeetings(d.meetings ?? []);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch(() => setError('Error cargando resultados.'))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-gray-800/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-gray-400 hover:text-white transition-colors">← Inicio</a>
            <span className="text-gray-700">|</span>
            <h1 className="text-sm font-extrabold text-white tracking-tight">🏆 Resultados Hípicos</h1>
          </div>
          <span className="text-[10px] text-gray-500 hidden sm:block">Hipódromos Venezuela</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* SEO lead paragraph — visually subtle but crawlable */}
        <div className="bg-gray-900/40 border border-gray-800/40 rounded-2xl px-4 py-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-400">Resultados hípicos de hoy domingo</strong> — posiciones, tiempos oficiales, dividendos del{' '}
            <strong className="text-gray-400">5 y 6 La Rinconada</strong> y <strong className="text-gray-400">resultados INH</strong> actualizados cada jornada.{' '}
            También <strong className="text-gray-400">resultados HINAVA hoy</strong> (Hipódromo de Valencia). Datos oficiales procesados por Desafío Hípico.
          </p>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden animate-pulse">
                <div className="flex items-start gap-4 p-4">
                  <div className="shrink-0 w-14 h-20 rounded-xl bg-gray-800" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 w-48 rounded bg-gray-800" />
                    <div className="h-3 w-36 rounded bg-gray-800" />
                    <div className="flex gap-2 mt-2">
                      <div className="h-5 w-20 rounded-full bg-gray-800" />
                      <div className="h-5 w-16 rounded-full bg-gray-800" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/40 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-400"/>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {!loading && !error && meetings.length === 0 && (
          <div className="text-center py-16 text-gray-600 text-sm">No hay resultados disponibles aún.</div>
        )}

        {!loading && meetings.map((m, idx) => (
          <MeetingCard key={m.meetingId} m={m} defaultOpen={idx === 0}/>
        ))}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p-1))}
              disabled={page === 1}
              className="text-xs px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-xs text-gray-500">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p+1))}
              disabled={page === totalPages}
              className="text-xs px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              Siguiente →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
