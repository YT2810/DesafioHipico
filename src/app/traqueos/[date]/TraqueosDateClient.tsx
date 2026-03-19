'use client';

import { useState, useEffect } from 'react';
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

const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

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
interface NextMeeting { id: string; date: string; meetingNumber: number; }

function humanDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return `${DAYS_ES[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS_ES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

function sessionLabel(sourceFile: string) {
  const f = sourceFile.toUpperCase();
  if (f.includes('AJUSTE')) return 'Ajustes';
  if (f.includes('TRABAJO')) return 'Trabajos';
  return 'Traqueos';
}

function trackGA(eventName: string, params: Record<string, string | number>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
}

export default function TraqueosDateClient({ date }: { date: string }) {
  const [entries, setEntries] = useState<WorkoutEntry[]>([]);
  const [sourceFile, setSourceFile] = useState('');
  const [nextMeeting, setNextMeeting] = useState<NextMeeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`/api/traqueos/${date}`)
      .then(r => r.json())
      .then(d => {
        setEntries(d.entries ?? []);
        setSourceFile(d.sourceFile ?? '');
        setNextMeeting(d.nextMeeting ?? null);
        trackGA('traqueos_date_page_view', { date, count: d.entries?.length ?? 0 });
      })
      .finally(() => setLoading(false));
  }, [date]);

  const workoutTypes = ['all', ...Array.from(new Set(entries.map(e => e.workoutType))).sort()];
  const filtered = entries.filter(e => {
    const matchType = filter === 'all' || e.workoutType === filter;
    const matchSearch = !search || e.horseName.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const label = sessionLabel(sourceFile);
  const pageTitle = `${label} La Rinconada · ${humanDate(date)}`;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ── Header ── */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <Link href="/traqueos" className="text-[11px] text-gray-500 hover:text-yellow-500 transition-colors">
                ← Todos los traqueos
              </Link>
              <h1 className="text-xl font-black text-white mt-1 leading-tight">{pageTitle}</h1>
              {sourceFile && (
                <p className="text-[11px] text-gray-600 mt-0.5">{sourceFile}</p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {nextMeeting && (
                <Link
                  href={`/revista/${nextMeeting.id}`}
                  onClick={() => trackGA('traqueos_cta_click', { destination: 'revista', from: date })}
                  className="shrink-0 px-3 py-2 rounded-xl text-sm font-bold border border-yellow-700/60 text-yellow-400 hover:bg-yellow-950/40 transition-colors">
                  Revista R.{nextMeeting.meetingNumber} →
                </Link>
              )}
              <Link
                href="/pronosticos"
                onClick={() => trackGA('traqueos_cta_click', { destination: 'pronosticos', from: date })}
                className="shrink-0 px-3 py-2 rounded-xl text-sm font-bold text-black transition-colors hover:brightness-110"
                style={{ backgroundColor: GOLD }}>
                Pronósticos →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* ── Filtros ── */}
        {!loading && entries.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <input
              type="text"
              placeholder="Buscar ejemplar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[160px] bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
            />
            {workoutTypes.map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
                  filter === t ? 'text-black border-yellow-600' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
                style={filter === t ? { backgroundColor: GOLD } : {}}>
                {t === 'all' ? `Todos (${entries.length})` : (WORKOUT_LABELS[t] ?? t)}
              </button>
            ))}
          </div>
        )}

        {/* ── Lista ── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-yellow-600 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-600 py-12 text-sm">No hay trabajos para esta selección.</p>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {filtered.map((e, i) => {
                  const wColor = WORKOUT_COLORS[e.workoutType] ?? WORKOUT_COLORS.galopo;
                  const wLabel = WORKOUT_LABELS[e.workoutType] ?? e.workoutType;
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
                            {e.rm != null && <span className="text-[11px] font-bold text-yellow-300">RM {e.rm}</span>}
                            {e.trainerName && <span className="text-[10px] text-gray-500">Ent: {e.trainerName}</span>}
                            {e.jockeyName && <span className="text-[10px] text-amber-400/80">{e.jockeyName}</span>}
                          </div>
                          {e.splits && <p className="text-[11px] font-mono text-yellow-500/80 mt-0.5 leading-tight">{e.splits}</p>}
                          {e.comment && <p className="text-[11px] text-gray-400 italic mt-0.5">{e.comment}</p>}
                        </div>
                        {e.daysRest != null && (
                          <span className={`shrink-0 text-[10px] font-bold ${e.daysRest <= 3 ? 'text-green-400' : e.daysRest <= 7 ? 'text-yellow-400' : 'text-gray-500'}`}>
                            {e.daysRest}d
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Navegación entre sesiones — SEO interno ── */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Ver otras sesiones</p>
          <Link href="/traqueos" className="text-sm text-yellow-500 hover:underline">
            → Ver todos los traqueos disponibles
          </Link>
        </div>

        {/* ── CTA revista ── */}
        {nextMeeting && (
          <div className="rounded-2xl border border-gray-700 bg-gray-900 p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Revista de la próxima reunión</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Reunión {nextMeeting.meetingNumber} — solo los caballos que corren, con historial y pronósticos.
              </p>
            </div>
            <Link
              href={`/revista/${nextMeeting.id}`}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold border border-yellow-700/60 text-yellow-400 hover:bg-yellow-950/40 transition-colors">
              Ver Revista
            </Link>
          </div>
        )}

        {/* ── Disclaimer INH ── */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 text-[11px] text-gray-500 space-y-1">
          <p className="font-bold text-gray-400">Fuente oficial</p>
          <p>
            Datos de la <span className="text-gray-300 font-semibold">División Oficial de Toma Tiempos del Instituto Nacional de Hipismo (INH)</span>.
            Desafío Hípico los presenta en formato digital para la comunidad hípica venezolana.
          </p>
        </div>

      </div>
    </div>
  );
}
