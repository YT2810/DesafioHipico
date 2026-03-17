'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';

interface Workout {
  workoutDate: string;
  distance: number;
  workoutType: 'EP' | 'ES' | 'AP' | 'galopo';
  splits: string;
  comment: string;
  jockeyName: string;
  trainerName: string;
  daysRest: number | null;
}

interface EntryItem {
  dorsalNumber: number;
  postPosition: number;
  horseName: string;
  jockeyName: string;
  trainerName: string;
  studName: string;
  weightDeclared: string;
  medication: string | null;
  implements: string | null;
  status: string;
  finishPosition: number | null;
  isScratched: boolean;
  workout: Workout | null;
}

interface RaceItem {
  raceId: string;
  raceNumber: number;
  annualRaceNumber: number | null;
  distance: number;
  scheduledTime: string;
  conditions: string;
  prizePool: { bs: number; usd: number };
  games: string[];
  status: string;
  entries: EntryItem[];
}

interface MeetingData {
  id: string;
  meetingNumber: number;
  date: string;
  status: string;
  trackName: string;
  trackLocation: string;
  isValencia: boolean;
}

const WORKOUT_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  EP: { label: 'En Pelo',  color: 'bg-blue-950/50 border-blue-700/40 text-blue-300' },
  ES: { label: 'En Silla', color: 'bg-purple-950/50 border-purple-700/40 text-purple-300' },
  AP: { label: 'Aparato',  color: 'bg-orange-950/50 border-orange-700/40 text-orange-300' },
  galopo: { label: 'Galopo', color: 'bg-gray-800 border-gray-700 text-gray-400' },
};

function WorkoutBadge({ type }: { type: string }) {
  const def = WORKOUT_TYPE_LABEL[type] ?? WORKOUT_TYPE_LABEL.galopo;
  return (
    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${def.color}`}>
      {def.label}
    </span>
  );
}

function MedBadge({ med }: { med: string }) {
  return (
    <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border bg-blue-950/40 border-blue-800/40 text-blue-300">
      {med.replace('-', '+')}
    </span>
  );
}

function DaysChip({ days }: { days: number }) {
  const color = days <= 3 ? 'text-green-400 border-green-800/40 bg-green-950/30'
    : days <= 7 ? 'text-yellow-400 border-yellow-800/40 bg-yellow-950/30'
    : 'text-gray-500 border-gray-700 bg-gray-800/30';
  return (
    <span className={`inline-block text-[9px] font-bold px-1 py-0.5 rounded border ${color}`}>
      {days}D
    </span>
  );
}

export default function RevistaClient({ meetingId }: { meetingId: string }) {
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [races, setRaces] = useState<RaceItem[]>([]);
  const [hasWorkouts, setHasWorkouts] = useState(false);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [selectedRace, setSelectedRace] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/revista/${meetingId}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setMeeting(d.meeting);
        setRaces(d.races ?? []);
        setHasWorkouts(d.hasWorkouts ?? false);
        setWorkoutCount(d.workoutCount ?? 0);
        if (d.races?.length > 0) setSelectedRace(d.races[0].raceNumber);
      })
      .catch(() => setError('Error al cargar la revista'))
      .finally(() => setLoading(false));
  }, [meetingId]);

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
  const trackEmoji = meeting.isValencia ? '🏟' : '🏇';
  const trackColor = meeting.isValencia ? 'text-blue-400' : 'text-yellow-400';

  const currentRace = races.find(r => r.raceNumber === selectedRace) ?? null;
  const isFinished = meeting.status === 'finished';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-gray-400 hover:text-white text-lg leading-none shrink-0">←</Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">
                {trackEmoji} Revista · <span className={trackColor}>{meeting.trackName}</span> Reunión {meeting.meetingNumber}
              </h1>
              <p className="text-xs text-gray-500 truncate capitalize">{meetingDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasWorkouts && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-950/50 border border-green-700/40 text-green-300">
                {workoutCount} trabajos
              </span>
            )}
            <Link href={`/programa/${meetingId}`}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-black"
              style={{ backgroundColor: GOLD }}>
              Inscritos →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">

        {/* ── Aviso si no hay trabajos ── */}
        {!hasWorkouts && (
          <div className="rounded-2xl border border-yellow-800/30 bg-yellow-950/20 px-4 py-3 flex items-start gap-3">
            <span className="text-lg shrink-0">📋</span>
            <div>
              <p className="text-sm font-bold text-yellow-300">Trabajos aún no disponibles</p>
              <p className="text-xs text-yellow-200/60 mt-0.5">
                Los tiempos de entrenamiento se publican entre martes y sábado. Cuando el staff los suba, aparecerán aquí junto a cada ejemplar.
              </p>
            </div>
          </div>
        )}

        {/* ── Selector de carreras ── */}
        <div>
          <p className="text-xs text-gray-600 mb-2 font-medium uppercase tracking-wide">Selecciona una carrera</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {races.map(race => {
              const isSelected = selectedRace === race.raceNumber;
              const hasResult = race.entries.some(e => e.finishPosition !== null);
              const hasWork = race.entries.some(e => e.workout !== null);
              return (
                <button key={race.raceId}
                  onClick={() => setSelectedRace(isSelected ? null : race.raceNumber)}
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
                  <div className="flex gap-0.5">
                    {hasWork && <span className="text-[8px]" title="Tiene trabajos">🏋️</span>}
                    {hasResult && <span className="text-[8px]" title="Con resultados">🏁</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Detalle de carrera ── */}
        {currentRace && (
          <div className="space-y-0">

            {/* Encabezado */}
            <div className="rounded-t-2xl border border-gray-700 bg-gray-900 px-4 py-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-extrabold text-white">Carrera {currentRace.raceNumber}</span>
                    {currentRace.annualRaceNumber && (
                      <span className="text-xs text-gray-600">C{currentRace.annualRaceNumber}</span>
                    )}
                    <span className="text-sm text-gray-400">{currentRace.distance} mts</span>
                    {currentRace.scheduledTime && (
                      <span className="text-xs text-gray-600">{currentRace.scheduledTime}</span>
                    )}
                  </div>
                  {currentRace.conditions && (
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{currentRace.conditions}</p>
                  )}
                  {currentRace.prizePool?.bs > 0 && (
                    <p className="text-xs font-semibold mt-1" style={{ color: GOLD }}>
                      Premio Bs. {currentRace.prizePool.bs.toLocaleString('es-VE')}
                      {currentRace.prizePool.usd > 0 && ` · US$ ${currentRace.prizePool.usd.toLocaleString()}`}
                    </p>
                  )}
                </div>
                {currentRace.status === 'finished' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-950/50 border border-green-700/40 text-green-300 shrink-0">
                    🏁 Finalizada
                  </span>
                )}
              </div>
            </div>

            {/* Tabla de ejemplares */}
            <div className="border-x border-gray-700 bg-gray-900 overflow-hidden">

              {/* Cabecera de columnas — cambia si hay trabajos */}
              <div className={`grid px-3 py-1.5 border-y border-gray-800 text-[10px] font-semibold text-gray-600 uppercase tracking-wide ${
                hasWorkouts ? 'grid-cols-[2rem_1fr_3rem_4rem_1fr]' : 'grid-cols-[2rem_1fr_3rem_1fr]'
              }`}>
                <span className="text-center">#</span>
                <span>Ejemplar · Entrenador</span>
                <span className="text-center">Kg</span>
                {hasWorkouts && <span className="text-center">Trabajo</span>}
                <span>Jinete</span>
              </div>

              <div className="divide-y divide-gray-800/40">
                {currentRace.entries.map(entry => (
                  <div key={entry.dorsalNumber}
                    className={`grid px-3 py-2.5 gap-x-2 items-start ${
                      hasWorkouts ? 'grid-cols-[2rem_1fr_3rem_4rem_1fr]' : 'grid-cols-[2rem_1fr_3rem_1fr]'
                    } ${entry.isScratched ? 'opacity-40' : ''}`}>

                    {/* Dorsal — si hay resultado, muestra posición */}
                    <div className="flex flex-col items-center gap-0.5 pt-0.5">
                      {entry.finishPosition ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-extrabold" style={{
                            color: entry.finishPosition === 1 ? GOLD
                              : entry.finishPosition === 2 ? '#9ca3af'
                              : entry.finishPosition === 3 ? '#c4a96b' : '#6b7280'
                          }}>
                            {entry.finishPosition}°
                          </span>
                          <span className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-extrabold text-white">
                            {entry.dorsalNumber}
                          </span>
                        </div>
                      ) : (
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-extrabold border ${
                          entry.isScratched
                            ? 'bg-red-950/30 border-red-800/30 text-red-400'
                            : 'bg-gray-800 border-gray-700 text-white'
                        }`}>
                          {entry.dorsalNumber}
                        </span>
                      )}
                    </div>

                    {/* Caballo + entrenador + cuadra */}
                    <div className="min-w-0">
                      <p className={`text-sm font-bold leading-tight truncate ${entry.isScratched ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {entry.horseName}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{entry.trainerName}</p>
                      {entry.studName && (
                        <p className="text-[9px] text-gray-700 truncate">{entry.studName}</p>
                      )}
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {entry.medication && <MedBadge med={entry.medication} />}
                        {entry.isScratched && (
                          <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border bg-red-950/40 border-red-800/40 text-red-300">RET</span>
                        )}
                      </div>
                    </div>

                    {/* Peso */}
                    <div className="text-center pt-0.5">
                      <p className="text-sm font-bold text-white">{entry.weightDeclared || '—'}</p>
                      {entry.implements && (
                        <p className="text-[8px] text-gray-700 leading-tight break-all mt-0.5">{entry.implements}</p>
                      )}
                    </div>

                    {/* Trabajo */}
                    {hasWorkouts && (
                      <div className="min-w-0">
                        {entry.workout ? (
                          <div className="space-y-0.5">
                            <WorkoutBadge type={entry.workout.workoutType} />
                            {entry.workout.daysRest !== null && entry.workout.daysRest !== undefined && (
                              <DaysChip days={entry.workout.daysRest} />
                            )}
                            {entry.workout.distance > 0 && (
                              <p className="text-[9px] text-gray-600">{entry.workout.distance}m</p>
                            )}
                            {entry.workout.splits && (
                              <p className="text-[9px] font-mono text-yellow-500/80 leading-tight break-all">
                                {entry.workout.splits}
                              </p>
                            )}
                            {entry.workout.comment && (
                              <p className="text-[9px] text-gray-500 leading-tight italic">
                                {entry.workout.comment}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[9px] text-gray-700">—</span>
                        )}
                      </div>
                    )}

                    {/* Jinete */}
                    <div className="min-w-0 pt-0.5">
                      <p className="text-xs font-semibold text-gray-300 leading-tight truncate">{entry.jockeyName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resultado de carrera si está finalizada */}
            {currentRace.status === 'finished' && (() => {
              const finished = currentRace.entries
                .filter(e => e.finishPosition !== null)
                .sort((a, b) => (a.finishPosition ?? 99) - (b.finishPosition ?? 99));
              return finished.length > 0 ? (
                <div className="border-x border-gray-700 bg-gray-900/30 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">🏁 Orden de llegada</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {finished.slice(0, 5).map((e, i) => (
                      <div key={e.dorsalNumber} className="flex items-center gap-1">
                        <span className="text-xs font-extrabold" style={{
                          color: i === 0 ? GOLD : i === 1 ? '#9ca3af' : i === 2 ? '#c4a96b' : '#6b7280'
                        }}>{i + 1}°</span>
                        <span className="text-xs font-bold text-white">{e.horseName}</span>
                        {i < Math.min(finished.length, 5) - 1 && <span className="text-gray-700 text-xs">·</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Footer de carrera */}
            <div className="rounded-b-2xl border border-t-0 border-gray-700 bg-gray-900/10 px-3 py-1.5 flex items-center gap-2">
              {currentRace.games.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {currentRace.games.map(g => (
                    <span key={g} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-500">
                      {g.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {!currentRace && (
          <div className="text-center py-10 text-gray-700">
            <p className="text-4xl mb-3">☝️</p>
            <p className="text-sm">Selecciona una carrera para ver los detalles</p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 px-4 py-3 text-center">
          <p className="text-[10px] text-gray-700 leading-relaxed">
            Datos basados en el programa oficial INH/HINAVA. Los trabajos se publican entre martes y sábado.
            Los resultados y dividendos se actualizan tras la jornada. · <strong className="text-gray-600">Desafío Hípico</strong>
          </p>
        </div>

      </main>
    </div>
  );
}
