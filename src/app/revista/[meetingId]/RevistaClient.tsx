'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';

interface RaceHistoryItem {
  date: string;
  trackName: string;
  meetingNumber: number;
  raceNumber: number;
  distance: number;
  conditions: string;
  dorsalNumber: number;
  weight: string;
  medication: string | null;
  jockeyName: string;
  finishPosition: number | null;
  officialTime: string | null;
  distanceMargin: string | null;
  isScratched: boolean;
}

interface WorkoutItem {
  workoutDate: string;
  distance: number;
  workoutType: string;
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
  horseId: string;
  jockeyName: string;
  trainerName: string;
  studName: string;
  weightDeclared: string;
  medication: string | null;
  implements: string | null;
  status: string;
  finishPosition: number | null;
  isScratched: boolean;
  raceHistory: RaceHistoryItem[];
  workouts: WorkoutItem[];
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

const WORKOUT_COLORS: Record<string, string> = {
  EP:     'bg-blue-950/50 border-blue-700/40 text-blue-300',
  ES:     'bg-purple-950/50 border-purple-700/40 text-purple-300',
  AP:     'bg-orange-950/50 border-orange-700/40 text-orange-300',
  galopo: 'bg-gray-800 border-gray-700 text-gray-400',
};
const WORKOUT_LABELS: Record<string, string> = {
  EP: 'En Pelo', ES: 'En Silla', AP: 'Aparato', galopo: 'Galopo',
};

function posColor(pos: number | null) {
  if (!pos) return '#6b7280';
  if (pos === 1) return GOLD;
  if (pos === 2) return '#9ca3af';
  if (pos === 3) return '#c4a96b';
  return '#6b7280';
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// ── Horse card: dorsal header + history rows + workout rows ──
function HorseCard({ entry, hasWorkouts }: { entry: EntryItem; hasWorkouts: boolean }) {
  const [open, setOpen] = useState(false);
  const hasHistory = entry.raceHistory.length > 0;
  const hasWork = entry.workouts.length > 0;

  return (
    <div className={`border-b border-gray-800/60 last:border-0 ${entry.isScratched ? 'opacity-40' : ''}`}>

      {/* ── Header row — always visible ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-gray-800/30 transition-colors"
      >
        {/* Dorsal / result */}
        <div className="shrink-0 flex flex-col items-center w-7">
          {entry.finishPosition ? (
            <>
              <span className="text-[9px] font-extrabold leading-none" style={{ color: posColor(entry.finishPosition) }}>
                {entry.finishPosition}°
              </span>
              <span className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-sm font-extrabold text-white mt-0.5">
                {entry.dorsalNumber}
              </span>
            </>
          ) : (
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-extrabold border ${
              entry.isScratched ? 'bg-red-950/30 border-red-800/30 text-red-400' : 'bg-gray-800 border-gray-700 text-white'
            }`}>
              {entry.dorsalNumber}
            </span>
          )}
        </div>

        {/* Horse name + trainer */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-sm font-bold leading-tight ${entry.isScratched ? 'line-through text-gray-500' : 'text-white'}`}>
              {entry.horseName}
            </span>
            {entry.isScratched && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded border bg-red-950/40 border-red-800/40 text-red-300">RET</span>
            )}
            {entry.medication && (
              <span className="text-[9px] font-bold px-1 py-0.5 rounded border bg-blue-950/40 border-blue-800/40 text-blue-300">
                {entry.medication.replace('-', '+')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-600 truncate">{entry.trainerName}</span>
            {entry.studName && <span className="text-[9px] text-gray-700 truncate">· {entry.studName}</span>}
          </div>
        </div>

        {/* Weight + jockey */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-white">{entry.weightDeclared || '—'}</p>
          <p className="text-[10px] text-gray-500 truncate max-w-[5rem]">{entry.jockeyName}</p>
        </div>

        {/* Indicators + chevron */}
        <div className="shrink-0 flex flex-col items-end gap-0.5 ml-1">
          <div className="flex gap-1">
            {hasHistory && <span className="text-[9px] text-gray-600">🏁{entry.raceHistory.length}</span>}
            {hasWork && <span className="text-[9px] text-gray-600">📋{entry.workouts.length}</span>}
          </div>
          <span className={`text-gray-600 text-xs transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
        </div>
      </button>

      {/* ── Expanded: history + workouts ── */}
      {open && (
        <div className="px-3 pb-3 space-y-3 bg-gray-900/30">

          {/* Last 4 races */}
          {hasHistory ? (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-1.5 pt-1">
                🏁 Últimas carreras
              </p>
              <div className="space-y-1">
                {entry.raceHistory.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-800/40 rounded-xl px-2 py-1.5">
                    {/* Position */}
                    <span className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold border"
                      style={{
                        color: posColor(h.finishPosition),
                        borderColor: 'rgba(75,85,99,0.4)',
                        backgroundColor: 'rgba(17,24,39,0.6)',
                      }}>
                      {h.isScratched ? 'R' : (h.finishPosition ?? '?')}
                    </span>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-300">{shortDate(h.date)}</span>
                        <span className="text-[9px] text-gray-600">R{h.meetingNumber} C{h.raceNumber}</span>
                        <span className="text-[9px] text-gray-600">{h.distance}m</span>
                        <span className="text-[9px] text-gray-700">D{h.dorsalNumber}</span>
                        {h.trackName && h.trackName !== entry.trainerName && (
                          <span className="text-[9px] text-gray-700 truncate">{h.trackName.includes('alencia') ? 'Val' : 'LR'}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {h.officialTime && (
                          <span className="text-[9px] font-mono text-yellow-500/70">{h.officialTime}</span>
                        )}
                        {h.distanceMargin && (
                          <span className="text-[9px] text-gray-600">{h.distanceMargin}</span>
                        )}
                        {h.jockeyName && (
                          <span className="text-[9px] text-gray-600 truncate">{h.jockeyName}</span>
                        )}
                        {h.medication && (
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-blue-950/40 border border-blue-800/40 text-blue-400">
                            {h.medication.replace('-', '+')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[9px] text-gray-700 pt-1 italic">Sin historial de carreras disponible.</p>
          )}

          {/* Workouts since last race */}
          {hasWorkouts && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 mb-1.5">
                📋 Trabajos desde última carrera
              </p>
              {hasWork ? (
                <div className="space-y-1">
                  {entry.workouts.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 bg-gray-800/40 rounded-xl px-2 py-1.5">
                      <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border ${WORKOUT_COLORS[w.workoutType] ?? WORKOUT_COLORS.galopo}`}>
                        {WORKOUT_LABELS[w.workoutType] ?? w.workoutType}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-gray-300">{shortDate(w.workoutDate)}</span>
                          {w.distance > 0 && <span className="text-[9px] text-gray-600">{w.distance}m</span>}
                          {w.daysRest !== null && (
                            <span className={`text-[9px] font-bold px-1 py-0 rounded border ${
                              (w.daysRest ?? 99) <= 3 ? 'text-green-400 border-green-800/40 bg-green-950/30'
                              : (w.daysRest ?? 99) <= 7 ? 'text-yellow-400 border-yellow-800/40 bg-yellow-950/30'
                              : 'text-gray-500 border-gray-700'
                            }`}>{w.daysRest}D</span>
                          )}
                          {w.jockeyName && <span className="text-[9px] text-gray-600 truncate">{w.jockeyName}</span>}
                        </div>
                        {w.splits && (
                          <p className="text-[9px] font-mono text-yellow-500/70 leading-tight mt-0.5">{w.splits}</p>
                        )}
                        {w.comment && (
                          <p className="text-[9px] text-gray-500 italic leading-tight">{w.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[9px] text-gray-700 italic">Sin trabajos registrados desde su última carrera.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RevistaClient({ meetingId }: { meetingId: string }) {
  const [meeting, setMeeting] = useState<MeetingData | null>(null);
  const [races, setRaces] = useState<RaceItem[]>([]);
  const [hasWorkouts, setHasWorkouts] = useState(false);
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-gray-400 hover:text-white text-lg leading-none shrink-0">←</Link>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">
                {trackEmoji} Revista · <span className={trackColor}>{meeting.trackName}</span> R{meeting.meetingNumber}
              </h1>
              <p className="text-xs text-gray-500 truncate capitalize">{meetingDate}</p>
            </div>
          </div>
          <Link href={`/programa/${meetingId}`}
            className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-black"
            style={{ backgroundColor: GOLD }}>
            Inscritos →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">

        {/* Nota si no hay trabajos */}
        {!hasWorkouts && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-3 py-2.5 flex items-center gap-2">
            <span className="text-sm shrink-0">📋</span>
            <p className="text-xs text-gray-600">
              <strong className="text-gray-500">Trabajos no disponibles aún.</strong> Se cargan entre martes y sábado. El historial de carreras sí está activo.
            </p>
          </div>
        )}

        {/* Selector de carreras */}
        <div>
          <p className="text-[10px] text-gray-600 mb-2 font-bold uppercase tracking-wider">Carrera</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {races.map(race => {
              const isSelected = selectedRace === race.raceNumber;
              const hasResult = race.entries.some(e => e.finishPosition !== null);
              const hasWork = race.entries.some(e => e.workouts.length > 0);
              const hasHist = race.entries.some(e => e.raceHistory.length > 0);
              return (
                <button key={race.raceId}
                  onClick={() => setSelectedRace(race.raceNumber)}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    isSelected ? 'text-black border-yellow-600' : 'bg-gray-900 border-gray-700 text-white hover:border-gray-500'
                  }`}
                  style={isSelected ? { backgroundColor: GOLD } : {}}>
                  <span className="text-sm font-extrabold">C{race.raceNumber}</span>
                  <span className={`text-[9px] ${isSelected ? 'text-black/60' : 'text-gray-500'}`}>{race.distance}m</span>
                  <div className="flex gap-0.5 mt-0.5">
                    {hasHist && <span className="text-[8px] leading-none">🏁</span>}
                    {hasWork && <span className="text-[8px] leading-none">📋</span>}
                    {hasResult && <span className="text-[8px] leading-none">✅</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Carrera seleccionada */}
        {currentRace && (
          <div>
            {/* Encabezado de carrera */}
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
                <div className="flex flex-wrap gap-1 shrink-0 items-center">
                  {currentRace.status === 'finished' && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-950/50 border border-green-700/40 text-green-300">
                      🏁 Finalizada
                    </span>
                  )}
                  {currentRace.games.map(g => (
                    <span key={g} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-500">
                      {g.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna header */}
            <div className="border-x border-gray-700 bg-gray-900 px-3 py-1.5 border-y border-gray-800 grid grid-cols-[2rem_1fr_4rem_5rem] gap-x-2 text-[9px] font-bold uppercase tracking-widest text-gray-600">
              <span className="text-center">#</span>
              <span>Ejemplar · Entrenador</span>
              <span className="text-right">Kg · Jinete</span>
              <span className="text-right">Historial</span>
            </div>

            {/* Ejemplares — cada uno expandible */}
            <div className="border-x border-b border-gray-700 bg-gray-900 rounded-b-2xl overflow-hidden divide-y divide-gray-800/40">
              {currentRace.entries.map(entry => (
                <HorseCard key={entry.dorsalNumber} entry={entry} hasWorkouts={hasWorkouts} />
              ))}
            </div>
          </div>
        )}

        {!currentRace && (
          <div className="text-center py-10 text-gray-700">
            <p className="text-4xl mb-3">☝️</p>
            <p className="text-sm">Selecciona una carrera</p>
          </div>
        )}

        <p className="text-center text-[10px] text-gray-700 pb-4">
          Datos oficiales INH/HINAVA · Desafío Hípico · Toca cada caballo para ver historial y trabajos
        </p>

      </main>
    </div>
  );
}
