'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

const GOLD = '#D4AF37';

interface EntryItem {
  dorsalNumber: number;
  postPosition: number;
  weight: number;
  weightRaw: string;
  medication: string | null;
  implements: string | null;
  status: string;
  horseName: string;
  jockeyName: string;
  trainerName: string;
}

interface RaceItem {
  raceId: string;
  raceNumber: number;
  annualRaceNumber?: number;
  distance: number;
  scheduledTime: string;
  conditions: string;
  prizePool: { bs: number; usd: number };
  games: string[];
  entries: EntryItem[];
  forecastCount: number;
  forecastPreview: { pseudonym: string }[];
}

interface MeetingData {
  id: string;
  meetingNumber: number;
  date: string;
  trackName: string;
  trackLocation: string;
  trackAbbr: string;
  isValencia: boolean;
}

const MED_LABELS: Record<string, string> = {
  'BUT-LAX': 'B+L',
  'BUT': 'BUT',
  'LAX': 'LAX',
  'COR-FUR': 'C+F',
  'COR': 'COR',
  'FUR': 'FUR',
};

export default function ProgramaPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { data: session, status } = useSession();
  const [meetingId, setMeetingId] = useState('');
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [races, setRaces] = useState<RaceItem[]>([]);
  const [selectedRaceNumber, setSelectedRaceNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isLoggedIn = status === 'authenticated';

  useEffect(() => {
    params.then(p => setMeetingId(p.meetingId));
  }, [params]);

  useEffect(() => {
    if (!meetingId) return;
    setLoading(true);
    fetch(`/api/programa/${meetingId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setMeeting(d.meeting);
        setRaces(d.races ?? []);
        if (d.races?.length > 0) setSelectedRaceNumber(d.races[0].raceNumber);
      })
      .catch(() => setError('Error al cargar el programa'))
      .finally(() => setLoading(false));
  }, [meetingId]);

  const selectedRace = races.find(r => r.raceNumber === selectedRaceNumber) ?? null;

  const trackEmoji = meeting?.isValencia ? '🏟' : '🏇';
  const trackColor = meeting?.isValencia ? 'text-blue-400' : 'text-yellow-500';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error || 'Reunión no encontrada'}</p>
        <Link href="/" className="text-sm text-yellow-500 hover:underline">← Volver al inicio</Link>
      </div>
    );
  }

  const meetingDate = new Date(meeting.date).toLocaleDateString('es-VE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-gray-400 hover:text-white text-lg leading-none shrink-0">←</Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">
                {trackEmoji} Inscritos · <span className={trackColor}>{meeting.trackAbbr}</span> Reunión {meeting.meetingNumber}
              </h1>
              <p className="text-xs text-gray-500 truncate capitalize">{meetingDate}</p>
            </div>
          </div>
          <Link href={`/pronosticos`}
            className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-black"
            style={{ backgroundColor: GOLD }}>
            Ver pronósticos →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">

        {/* ── Meeting summary ── */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3 flex flex-wrap gap-4">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Hipódromo</p>
            <p className={`text-sm font-bold ${trackColor}`}>{meeting.trackName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Reunión</p>
            <p className="text-sm font-bold text-white">N° {meeting.meetingNumber}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Carreras</p>
            <p className="text-sm font-bold text-white">{races.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-wide">Inscritos</p>
            <p className="text-sm font-bold text-white">{races.reduce((s, r) => s + r.entries.length, 0)}</p>
          </div>
        </div>

        {/* ── Race selector ── */}
        <div>
          <p className="text-xs text-gray-600 mb-2 font-medium uppercase tracking-wide">Selecciona una carrera</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {races.map(race => {
              const isSelected = selectedRaceNumber === race.raceNumber;
              return (
                <button key={race.raceId}
                  onClick={() => setSelectedRaceNumber(isSelected ? null : race.raceNumber)}
                  className={`flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    isSelected
                      ? 'text-black border-yellow-600'
                      : 'bg-gray-900 border-gray-700 text-white hover:border-gray-500'
                  }`}
                  style={isSelected ? { backgroundColor: GOLD } : {}}>
                  <span className="text-sm font-extrabold">C{race.raceNumber}</span>
                  <span className={`text-[10px] ${isSelected ? 'text-black/60' : 'text-gray-500'}`}>
                    {race.distance}m
                  </span>
                  <span className={`text-[10px] font-semibold ${isSelected ? 'text-black/70' : race.entries.length > 0 ? 'text-green-500' : 'text-gray-700'}`}>
                    {race.entries.length > 0 ? `${race.entries.length} ej.` : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Race detail ── */}
        {selectedRace ? (
          <div className="space-y-3">

            {/* Race header */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-extrabold text-white">Carrera {selectedRace.raceNumber}</span>
                    {selectedRace.annualRaceNumber && (
                      <span className="text-xs text-gray-600">Anual #{selectedRace.annualRaceNumber}</span>
                    )}
                    <span className="text-sm text-gray-400">{selectedRace.distance} mts</span>
                    <span className="text-xs text-gray-600">{selectedRace.scheduledTime}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{selectedRace.conditions}</p>
                  {selectedRace.prizePool?.bs > 0 && (
                    <p className="text-xs font-semibold mt-1" style={{ color: GOLD }}>
                      Premio Bs. {selectedRace.prizePool.bs.toLocaleString('es-VE')}
                      {selectedRace.prizePool.usd > 0 && ` · US$ ${selectedRace.prizePool.usd.toLocaleString()}`}
                    </p>
                  )}
                </div>
                {selectedRace.games.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedRace.games.map(g => (
                      <span key={g} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400">
                        {g.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Entries table */}
            {selectedRace.entries.length === 0 ? (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-8 text-center">
                <p className="text-sm text-gray-600 italic">Sin inscritos registrados para esta carrera.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Inscritos — {selectedRace.entries.length} ejemplares
                  </p>
                  <p className="text-xs text-gray-700">La Rinconada · INH</p>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[2rem_1fr_3.5rem_1fr] gap-x-3 px-4 py-1.5 border-b border-gray-800/60 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                  <span className="text-center">#</span>
                  <span>Ejemplar / Entrenador</span>
                  <span className="text-center">Kg</span>
                  <span>Jinete</span>
                </div>

                <div className="divide-y divide-gray-800/40">
                  {selectedRace.entries.map(entry => (
                    <div key={entry.dorsalNumber}
                      className={`grid grid-cols-[2rem_1fr_3.5rem_1fr] gap-x-3 px-4 py-2.5 items-start ${
                        entry.status === 'scratched' ? 'opacity-40 line-through' : ''
                      }`}>

                      {/* Dorsal */}
                      <div className="flex flex-col items-center gap-0.5 pt-0.5">
                        <span className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-extrabold text-white">
                          {entry.dorsalNumber}
                        </span>
                        {entry.postPosition !== entry.dorsalNumber && (
                          <span className="text-[9px] text-gray-700">PP{entry.postPosition}</span>
                        )}
                      </div>

                      {/* Horse + trainer */}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white leading-tight truncate">{entry.horseName}</p>
                        <p className="text-xs text-gray-600 truncate">{entry.trainerName}</p>
                        {entry.medication && (
                          <span className="inline-block mt-0.5 text-[9px] font-bold px-1 py-0.5 rounded bg-blue-950/60 border border-blue-800/40 text-blue-400">
                            {MED_LABELS[entry.medication] ?? entry.medication}
                          </span>
                        )}
                      </div>

                      {/* Weight */}
                      <div className="text-center">
                        <span className="text-sm font-bold text-white">{entry.weightRaw || entry.weight}</span>
                        {entry.implements && (
                          <p className="text-[9px] text-gray-700 leading-tight mt-0.5 break-all">{entry.implements}</p>
                        )}
                      </div>

                      {/* Jockey */}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-300 leading-tight">{entry.jockeyName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Forecast CTA block ── */}
            <div className="rounded-2xl border border-yellow-700/40 bg-yellow-950/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-yellow-800/30 flex items-center justify-between">
                <p className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">
                  🎯 Pronósticos de expertos
                </p>
                {selectedRace.forecastCount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-900/40 border border-yellow-700/40 text-yellow-300">
                    {selectedRace.forecastCount} publicado{selectedRace.forecastCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {selectedRace.forecastCount === 0 ? (
                <div className="px-4 py-5 text-center">
                  <p className="text-sm text-gray-600 italic">Aún no hay pronósticos publicados para esta carrera.</p>
                  <p className="text-xs text-gray-700 mt-1">Vuelve más cerca de la fecha de la reunión.</p>
                </div>
              ) : (
                <div className="px-4 py-4 space-y-3">
                  {/* Blurred preview of expert names */}
                  <div className={`space-y-2 ${!isLoggedIn ? 'blur-sm pointer-events-none select-none' : ''}`}>
                    {selectedRace.forecastPreview.map((fp, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-900/60 rounded-xl px-3 py-2.5 border border-gray-800">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
                          style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: GOLD, border: '1.5px solid rgba(212,175,55,0.25)' }}>
                          {fp.pseudonym[0].toUpperCase()}
                        </span>
                        <span className="text-sm font-bold text-white flex-1">{fp.pseudonym}</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{ color: GOLD, backgroundColor: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}>
                          VIP 🎁
                        </span>
                        {/* Blurred dorsal chips */}
                        <div className="flex gap-1">
                          {[1, 2, 3].map(n => (
                            <span key={n} className="w-6 h-6 rounded bg-gray-700 border border-gray-600 flex items-center justify-center text-xs font-bold text-white">
                              {n}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {selectedRace.forecastCount > selectedRace.forecastPreview.length && (
                      <p className="text-xs text-gray-700 text-center">
                        +{selectedRace.forecastCount - selectedRace.forecastPreview.length} experto{selectedRace.forecastCount - selectedRace.forecastPreview.length > 1 ? 's' : ''} más
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  {!isLoggedIn ? (
                    <div className="flex flex-col gap-2 pt-1">
                      <p className="text-sm font-extrabold text-white text-center">
                        Regístrate gratis para ver<br />
                        <span style={{ color: GOLD }}>las marcas de los expertos</span>
                      </p>
                      <Link href="/auth/signin?mode=register"
                        className="w-full py-3 rounded-2xl text-sm font-bold text-black text-center"
                        style={{ backgroundColor: GOLD }}>
                        🎁 Crear cuenta gratis
                      </Link>
                      <Link href="/auth/signin"
                        className="w-full py-2.5 rounded-2xl text-xs font-semibold text-gray-400 bg-gray-800 border border-gray-700 text-center hover:bg-gray-700 transition-colors">
                        Ya tengo cuenta →
                      </Link>
                    </div>
                  ) : (
                    <Link href="/pronosticos"
                      className="w-full py-3 rounded-2xl text-sm font-bold text-black text-center block"
                      style={{ backgroundColor: GOLD }}>
                      Ver pronósticos completos →
                    </Link>
                  )}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="text-center py-10 text-gray-700">
            <p className="text-4xl mb-3">☝️</p>
            <p className="text-sm">Selecciona una carrera para ver los inscritos</p>
          </div>
        )}

      </main>
    </div>
  );
}
