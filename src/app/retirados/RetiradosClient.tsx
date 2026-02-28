'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface MeetingOption {
  id: string;
  meetingNumber: number;
  date: string;
  trackName: string;
  trackLocation: string;
}

interface ScratchedEntry {
  dorsal: number;
  horseName: string;
  scratchReason: string | null;
  scratchedAt: string | null;
}

interface ScratchedRace {
  raceId: string;
  raceNumber: number;
  distance: number;
  scratched: ScratchedEntry[];
}

interface RetiradosData {
  meetingId: string;
  meetingNumber: number;
  date: string;
  trackName: string;
  trackLocation: string;
  totalScratched: number;
  races: ScratchedRace[];
}

const GOLD = '#D4AF37';

export default function RetiradosClient({ initialMeetingId }: { initialMeetingId: string }) {
  const router = useRouter();
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [selectedId, setSelectedId] = useState(initialMeetingId);
  const [data, setData] = useState<RetiradosData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/retirados')
      .then(r => r.json())
      .then(d => {
        setMeetings(d.meetings ?? []);
        if (!initialMeetingId && d.meetings?.length > 0) {
          setSelectedId(d.meetings[0].id);
        }
      })
      .finally(() => setLoadingList(false));
  }, []);

  const loadData = useCallback(async (meetingId: string) => {
    if (!meetingId) return;
    setLoadingData(true);
    setData(null);
    try {
      const res = await fetch(`/api/retirados?meetingId=${meetingId}`);
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      router.replace(`/retirados?reunion=${meetingId}`, { scroll: false });
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  useEffect(() => {
    if (selectedId) loadData(selectedId);
  }, [selectedId]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-VE', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  function formatTime(isoStr: string) {
    return new Date(isoStr).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  }

  const selectedMeeting = meetings.find(m => m.id === selectedId);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Header ── */}
      <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-bold" style={{ color: GOLD }}>
              DH
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-sm font-bold text-white">Retirados</span>
          </div>
          <Link href="/pronosticos" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Ver pronósticos →
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Hero ── */}
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-white">🚫 Retirados del día</h1>
          <p className="text-sm text-gray-500">
            Ejemplares que no participarán en la reunión. Actualizado en tiempo real por el equipo de Desafío Hípico.
          </p>
        </div>

        {/* ── Meeting selector ── */}
        {loadingList ? (
          <div className="h-10 bg-gray-800 rounded-xl animate-pulse" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {meetings.map(m => {
              const isSelected = m.id === selectedId;
              const dateShort = new Date(m.date).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-all text-xs ${
                    isSelected
                      ? 'border-yellow-600 bg-yellow-900/20 text-yellow-300'
                      : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <span className="font-bold">{m.trackName}</span>
                  <span className="text-[10px] opacity-70">Reunión {m.meetingNumber} · {dateShort}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Content ── */}
        {loadingData && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-900 rounded-2xl animate-pulse border border-gray-800" />
            ))}
          </div>
        )}

        {!loadingData && data && (
          <>
            {/* Meeting summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4 space-y-1">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-base font-extrabold text-white">{data.trackName}</p>
                  <p className="text-xs text-gray-400 capitalize">{formatDate(data.date)}</p>
                  {data.trackLocation && (
                    <p className="text-xs text-gray-600">{data.trackLocation}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-extrabold" style={{ color: data.totalScratched > 0 ? '#ef4444' : '#22c55e' }}>
                    {data.totalScratched}
                  </p>
                  <p className="text-xs text-gray-500">retirado{data.totalScratched !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {lastUpdated && (
                <p className="text-[10px] text-gray-700">
                  Actualizado: {formatTime(lastUpdated.toISOString())}
                </p>
              )}
            </div>

            {/* No scratches */}
            {data.totalScratched === 0 && (
              <div className="bg-green-950/20 border border-green-800/40 rounded-2xl px-5 py-8 text-center space-y-2">
                <p className="text-2xl">✅</p>
                <p className="text-sm font-bold text-green-400">Sin retirados confirmados</p>
                <p className="text-xs text-gray-500">
                  No hay ejemplares retirados registrados para esta reunión todavía. Vuelve a consultar más cerca de la hora de inicio.
                </p>
              </div>
            )}

            {/* Races with scratches */}
            {data.races.map(race => (
              <section
                key={race.raceId}
                aria-label={`Retirados Carrera ${race.raceNumber}`}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
              >
                {/* Race header */}
                <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-white">Carrera {race.raceNumber}</span>
                    <span className="text-xs text-gray-500">{race.distance} mts</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-800/50">
                    {race.scratched.length} retirado{race.scratched.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Scratched entries */}
                <div className="divide-y divide-gray-800/60">
                  {race.scratched.map(entry => (
                    <div
                      key={entry.dorsal}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <span className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-800/50 flex items-center justify-center text-sm font-extrabold text-red-400 shrink-0">
                        {entry.dorsal}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white line-through decoration-red-600 truncate">
                          {entry.horseName}
                        </p>
                        {entry.scratchReason && (
                          <p className="text-xs text-gray-600 truncate">{entry.scratchReason}</p>
                        )}
                      </div>
                      <span className="text-red-500 text-base shrink-0">🚫</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* SEO structured content */}
            {data.totalScratched > 0 && (
              <div className="bg-gray-900/40 border border-gray-800/40 rounded-2xl px-5 py-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Resumen</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Para la <strong className="text-white">Reunión {data.meetingNumber}</strong> del <strong className="text-white">{data.trackName}</strong>{data.trackLocation ? ` (${data.trackLocation})` : ''}, celebrada el <strong className="text-white">{formatDate(data.date)}</strong>, se registran <strong className="text-red-400">{data.totalScratched} ejemplar{data.totalScratched !== 1 ? 'es' : ''} retirado{data.totalScratched !== 1 ? 's' : ''}</strong>:{' '}
                  {data.races.map((r, i) => (
                    <span key={r.raceId}>
                      {i > 0 ? '; ' : ''}
                      Carrera {r.raceNumber}: {r.scratched.map(e => `${e.horseName} (#${e.dorsal})`).join(', ')}
                    </span>
                  ))}.
                </p>
              </div>
            )}
          </>
        )}

        {/* Refresh button */}
        {selectedId && !loadingData && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => loadData(selectedId)}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1.5"
            >
              🔄 Actualizar retirados
            </button>
          </div>
        )}

        {/* Footer note */}
        <p className="text-xs text-gray-700 text-center pb-4">
          Los retirados son registrados por el equipo de Desafío Hípico basándose en información oficial del hipódromo.
          Para pronósticos de expertos, visita{' '}
          <Link href="/pronosticos" className="underline hover:text-gray-500">
            /pronosticos
          </Link>.
        </p>

      </main>
    </div>
  );
}
