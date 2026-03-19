'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';

const WORKOUT_COLORS: Record<string, string> = {
  EP:     'bg-blue-950/60 border-blue-700/50 text-blue-300',
  ES:     'bg-purple-950/60 border-purple-700/50 text-purple-300',
  AP:     'bg-orange-950/60 border-orange-700/50 text-orange-300',
  galopo: 'bg-gray-800 border-gray-600 text-gray-300',
};
const WORKOUT_LABELS: Record<string, string> = {
  EP: 'En Pelo', ES: 'En Silla', AP: 'Aparato', galopo: 'Galopo',
};

interface DateItem { _id: string; count: number; sourceFile: string; }
interface NextMeeting { id: string; date: string; meetingNumber: number; }
interface WorkoutEntry {
  _id: string;
  horseName: string;
  workoutType: string;
  distance: number;
  splits: string;
  comment: string;
  rm: number | null;
  jockeyName: string;
  trainerName: string;
  daysRest: number | null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function trackGA(eventName: string, params: Record<string, string | number>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
}

export default function TraqueosClient() {
  const [dates, setDates] = useState<DateItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [entries, setEntries] = useState<WorkoutEntry[]>([]);
  const [nextMeeting, setNextMeeting] = useState<NextMeeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const timeOnPageRef = useRef<number>(Date.now());

  // Load available dates on mount
  useEffect(() => {
    fetch('/api/traqueos')
      .then(r => r.json())
      .then(d => {
        setDates(d.dates ?? []);
        if (d.dates?.length > 0) setSelectedDate(d.dates[0]._id);
        if (d.nextMeeting) setNextMeeting(d.nextMeeting);
      });

    // Track time on page when leaving
    return () => {
      const seconds = Math.round((Date.now() - timeOnPageRef.current) / 1000);
      trackGA('traqueos_time_on_page', { seconds, page: 'traqueos' });
    };
  }, []);

  // Load entries when date changes
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetch(`/api/traqueos?date=${selectedDate}`)
      .then(r => r.json())
      .then(d => {
        setEntries(d.entries ?? []);
        if (d.nextMeeting) setNextMeeting(d.nextMeeting);
        trackGA('traqueos_date_view', { date: selectedDate, count: d.entries?.length ?? 0 });
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const workoutTypes = ['all', ...Array.from(new Set(entries.map(e => e.workoutType))).sort()];

  const filtered = entries.filter(e => {
    const matchType = filter === 'all' || e.workoutType === filter;
    const matchSearch = !search || e.horseName.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const selectedDateObj = dates.find(d => d._id === selectedDate);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ── Header SEO ── */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <Link href="/" className="text-[11px] text-gray-500 hover:text-yellow-500 transition-colors">
                ← Desafío Hípico
              </Link>
              <h1 className="text-2xl font-black text-white mt-1 leading-tight">
                Traqueos La Rinconada
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Trabajos y parciales oficiales · División de Toma Tiempos INH
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {nextMeeting && (
                <Link
                  href={`/revista/${nextMeeting.id}`}
                  onClick={() => trackGA('traqueos_cta_click', { destination: 'revista' })}
                  className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold border border-yellow-700/60 text-yellow-400 hover:bg-yellow-950/40 transition-colors">
                  Revista Reunión {nextMeeting.meetingNumber} →
                </Link>
              )}
              <Link
                href="/pronosticos"
                onClick={() => trackGA('traqueos_cta_click', { destination: 'pronosticos' })}
                className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold text-black transition-colors hover:brightness-110"
                style={{ backgroundColor: GOLD }}>
                Ver Pronósticos →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* ── Selector de fecha ── */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Selecciona la sesión</p>
          <div className="flex gap-2 flex-wrap">
            {dates.map(d => (
              <button
                key={d._id}
                onClick={() => setSelectedDate(d._id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
                  selectedDate === d._id
                    ? 'text-black border-yellow-600'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
                style={selectedDate === d._id ? { backgroundColor: GOLD } : {}}>
                {shortDate(d._id)}
                <span className="ml-1 opacity-60">{d.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Filtros ── */}
        {entries.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="text"
              placeholder="Buscar ejemplar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[160px] bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
            />
            {workoutTypes.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
                  filter === t
                    ? 'text-black border-yellow-600'
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
                style={filter === t ? { backgroundColor: GOLD } : {}}>
                {t === 'all' ? 'Todos' : (WORKOUT_LABELS[t] ?? t)}
              </button>
            ))}
          </div>
        )}

        {/* ── Título de sesión ── */}
        {selectedDate && (
          <div>
            <h2 className="text-base font-bold text-white capitalize">
              {formatDate(selectedDate)}
            </h2>
            {selectedDateObj && (
              <p className="text-[11px] text-gray-500 mt-0.5">{selectedDateObj.sourceFile}</p>
            )}
          </div>
        )}

        {/* ── Lista de trabajos ── */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-yellow-600 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-600 py-10 text-sm">No hay trabajos para esta selección.</p>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {filtered.map((e, i) => {
                  const wLabel = WORKOUT_LABELS[e.workoutType] ?? e.workoutType;
                  const wColor = WORKOUT_COLORS[e.workoutType] ?? WORKOUT_COLORS.galopo;
                  return (
                    <div key={i} className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none mt-0.5 ${wColor}`}>
                          {wLabel}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-[13px] font-bold text-white">{e.horseName}</span>
                            {e.distance > 0 && <span className="text-[11px] text-gray-400">{e.distance}m</span>}
                            {e.rm != null && (
                              <span className="text-[11px] font-bold text-yellow-300">RM {e.rm}</span>
                            )}
                            {e.trainerName && (
                              <span className="text-[10px] text-gray-500">Ent: {e.trainerName}</span>
                            )}
                            {e.jockeyName && (
                              <span className="text-[10px] text-amber-400/80">{e.jockeyName}</span>
                            )}
                          </div>
                          {e.splits && (
                            <p className="text-[11px] font-mono text-yellow-500/80 mt-0.5 leading-tight">{e.splits}</p>
                          )}
                          {e.comment && (
                            <p className="text-[11px] text-gray-400 italic mt-0.5 leading-tight">{e.comment}</p>
                          )}
                        </div>
                        {e.daysRest != null && (
                          <span className={`shrink-0 text-[10px] font-bold ${
                            e.daysRest <= 3 ? 'text-green-400' : e.daysRest <= 7 ? 'text-yellow-400' : 'text-gray-500'
                          }`}>{e.daysRest}d</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CTAs cruzados ── */}
        {entries.length > 0 && (
          <div className="space-y-3">
            {nextMeeting && (
              <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Revista de la próxima reunión</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Reunión {nextMeeting.meetingNumber} · {new Date(nextMeeting.date).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                    {' — ve solo los traqueos de los caballos que van a correr, con su historial completo.'}
                  </p>
                </div>
                <Link
                  href={`/revista/${nextMeeting.id}`}
                  onClick={() => trackGA('traqueos_cta_click', { destination: 'revista_bottom' })}
                  className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold border border-yellow-700/60 text-yellow-400 hover:bg-yellow-950/40 transition-colors">
                  Ver Revista
                </Link>
              </div>
            )}
            <div className="rounded-2xl border border-yellow-900/40 bg-yellow-950/20 p-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-bold text-white">¿Listo para apostar con información?</p>
                <p className="text-xs text-gray-400 mt-0.5">Consulta los pronósticos de los mejores handicappers de Venezuela.</p>
              </div>
              <Link
                href="/pronosticos"
                onClick={() => trackGA('traqueos_cta_click', { destination: 'pronosticos_bottom' })}
                className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-black transition-colors hover:brightness-110"
                style={{ backgroundColor: GOLD }}>
                Pronósticos
              </Link>
            </div>
          </div>
        )}

        {/* ── Disclaimer INH ── */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 text-[11px] text-gray-500 space-y-1.5">
          <p className="font-bold text-gray-400">Fuente oficial de los datos</p>
          <p>
            Los traqueos publicados en esta página provienen exclusivamente de la{' '}
            <span className="text-gray-300 font-semibold">División Oficial de Toma Tiempos del Instituto Nacional de Hipismo (INH)</span>.
            Desafío Hípico los presenta en formato digital para facilitar el acceso a la comunidad hípica venezolana.
          </p>
          <p>
            Toda la información es propiedad intelectual del INH. Agradecemos a la División de Toma Tiempos
            por su labor en la documentación oficial de los entrenamientos de La Rinconada.
          </p>
          <p className="text-gray-600">
            Para información oficial visita el INH · desafiohipico.com no es una entidad gubernamental ni está afiliada al INH.
          </p>
        </div>

      </div>
    </div>
  );
}
