'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';
const SITE = 'desafiohipico.com';

interface RaceHistoryItem {
  date: string;
  trackName: string;
  meetingNumber: number;
  raceNumber: number;
  annualRaceNumber: string | null;
  trackCode: string;
  distance: number;
  conditions: string;
  dorsalNumber: number;
  weight: string;
  medication: string | null;
  jockeyName: string;
  finishPosition: number | null;
  officialTime: string | null;
  winnerTime: string | null;
  diffVsFirst: string | null;
  distanceMargin: string | null;
  winnerName: string | null;
  secondName: string | null;
  isScratched: boolean;
}

interface WorkoutItem {
  workoutDate: string;
  distance: number;
  workoutType: string;
  splits: string;
  comment: string;
  rm: number | null;
  jockeyName: string;
  trainerName: string;
  daysRest: number | null;
}

interface YearStats {
  starts: number;
  wins: number;
  winless: number;
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
  yearStats: YearStats | null;
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
  trackCode: string;
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
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}`;
}

function daysSince(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

function jockeyShort(name: string): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return parts.join(' ');
  // Format in DB: APELLIDO [INICIAL] NOMBRE — e.g. "QUEVEDO M FRANCISCO"
  // Show first 2 words only: "QUEVEDO M"
  return `${parts[0]} ${parts[1]}`;
}

// ── Race label helper: C089, V012, etc. ──
function raceLabel(trackCode: string, annualRaceNumber: string | null, raceNumber: number): string {
  const prefix = trackCode || '';
  if (annualRaceNumber) {
    // annualRaceNumber may already contain letters like "C089" or just "089"
    const clean = String(annualRaceNumber).replace(/^[a-zA-Z]+/, '');
    return `${prefix}${clean}`;
  }
  return `${prefix}${raceNumber}`;
}

// ── Encabezado de columnas del historial ──
function HistoryHeader() {
  return (
    <div className="grid text-[8px] font-bold uppercase tracking-wider text-gray-400 pb-0.5 border-b border-gray-600/60"
      style={{ gridTemplateColumns: '34px 38px 20px 36px 34px 46px 46px 1fr' }}>
      <span>Fecha</span>
      <span>Carr.</span>
      <span className="text-center">Pos</span>
      <span>Dist</span>
      <span>Dif</span>
      <span>T.1°</span>
      <span>T.Ej</span>
      <span>Gan / 2°</span>
    </div>
  );
}

// ── Historial — tabla con columnas fijas ──
function HistoryRow({ h }: { h: RaceHistoryItem }) {
  const pos = h.isScratched ? 'R' : (h.finishPosition ?? '?');
  const col = posColor(h.finishPosition);
  const isWinner = h.finishPosition === 1;
  const diff = isWinner ? '—' : (h.diffVsFirst ?? h.distanceMargin ?? '—');
  const refName = isWinner
    ? (h.secondName ? `2° ${h.secondName}` : '—')
    : (h.winnerName ? `1° ${h.winnerName}` : '—');

  return (
    <div className="border-t border-gray-700/40">
      {/* Fila principal — 8 columnas fijas */}
      <div className="grid items-center py-[3px] gap-x-0"
        style={{ gridTemplateColumns: '34px 38px 20px 36px 34px 46px 46px 1fr' }}>
        {/* Fecha dd-mm */}
        <span className="text-[9px] text-white font-mono">{shortDate(h.date)}</span>
        {/* Carrera anual C089 */}
        <span className="text-[9px] font-mono text-gray-300">{raceLabel(h.trackCode, h.annualRaceNumber, h.raceNumber)}</span>
        {/* Posición */}
        <span className="text-[10px] font-extrabold text-center" style={{ color: col }}>
          {pos}{typeof pos === 'number' ? '°' : ''}
        </span>
        {/* Distancia */}
        <span className="text-[9px] text-white">{h.distance}m</span>
        {/* Dif vs 1° */}
        <span className="text-[9px] text-amber-200 font-mono font-bold">{diff}</span>
        {/* T.1° */}
        <span className="text-[9px] font-mono text-yellow-400">{h.winnerTime ?? '—'}</span>
        {/* T.Ej */}
        <span className="text-[9px] font-mono font-bold" style={{ color: col }}>{h.officialTime ?? '—'}</span>
        {/* Ganador o 2° — truncado pero visible */}
        <span className="text-[9px] text-gray-300 truncate">{refName}</span>
      </div>
      {/* Fila secundaria — jinete */}
      {h.jockeyName && (
        <p className="text-[9px] text-amber-300 font-semibold pb-[2px] pl-[72px] leading-none">
          {jockeyShort(h.jockeyName)}
        </p>
      )}
    </div>
  );
}

// ── Trabajos inline ──
function WorkoutRow({ w }: { w: WorkoutItem }) {
  return (
    <div className="workout-row flex items-start gap-1 text-[10px] leading-tight py-[3px] border-t border-gray-800/50">
      <span className={`shrink-0 text-[8px] font-bold px-1 py-0.5 rounded border leading-none ${WORKOUT_COLORS[w.workoutType] ?? WORKOUT_COLORS.galopo}`}>
        {WORKOUT_LABELS[w.workoutType] ?? w.workoutType}
      </span>
      <span className="shrink-0 text-gray-300 w-[3.2rem]">{shortDate(w.workoutDate)}</span>
      {w.distance > 0 && <span className="shrink-0 text-gray-400 w-[2.8rem]">{w.distance}m</span>}
      {w.daysRest !== null && (
        <span className={`shrink-0 font-bold w-5 ${
          (w.daysRest ?? 99) <= 3 ? 'text-green-400' : (w.daysRest ?? 99) <= 7 ? 'text-yellow-500' : 'text-gray-600'
        }`}>{w.daysRest}d</span>
      )}
      {w.splits && <span className="font-mono text-yellow-400/90">{w.splits}</span>}
      {w.rm != null && <span className="shrink-0 font-bold text-yellow-300">RM {w.rm}</span>}
      {w.comment && <span className="flex-1 text-gray-400 italic truncate">{w.comment}</span>}
    </div>
  );
}

// ── Horse card ──
function HorseCard({ entry, hasWorkouts }: { entry: EntryItem; hasWorkouts: boolean }) {
  const hasHistory = entry.raceHistory.length > 0;
  const hasWork = entry.workouts.length > 0;
  const scratched = entry.isScratched;
  const fp = entry.finishPosition;

  return (
    <div className={`horse-card border-b border-gray-800/60 last:border-0 ${scratched ? 'opacity-50' : ''}`}>
      <div className="px-3 pt-2.5 pb-2">

        {/* ── Fila principal ── */}
        <div className="flex items-start gap-2.5">

          {/* Dorsal + resultado */}
          <div className="shrink-0 flex flex-col items-center gap-0.5 pt-0.5">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-extrabold border-2 ${
              scratched        ? 'bg-gray-900 border-red-800/40 text-red-400'
              : fp === 1       ? 'border-yellow-500 text-yellow-400 bg-yellow-950/30'
              : fp === 2       ? 'border-gray-500 text-gray-300 bg-gray-800'
              : fp === 3       ? 'border-amber-700/60 text-amber-600 bg-gray-900'
              :                  'border-gray-700 text-white bg-gray-800'
            }`}>
              {entry.dorsalNumber}
            </span>
            {fp && (
              <span className="text-[9px] font-extrabold leading-none" style={{ color: posColor(fp) }}>
                {fp}°
              </span>
            )}
          </div>

          {/* Centro: nombre + implementos + entrenador */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[15px] font-extrabold leading-tight tracking-tight ${scratched ? 'line-through text-gray-600' : 'text-white'}`}>
                {entry.horseName}
              </span>
              {scratched && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-950/60 border border-red-800/50 text-red-300 uppercase tracking-wide">Ret.</span>
              )}
              {entry.medication && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border bg-blue-950/40 border-blue-800/40 text-blue-300">
                  {entry.medication}
                </span>
              )}
              {entry.implements && (
                <span className="text-[9px] font-medium px-1 py-0.5 rounded border border-gray-700/60 text-gray-500 bg-gray-800/60">
                  {entry.implements}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">
              Ent: <span className="text-gray-200">{entry.trainerName || '—'}</span>
              {entry.studName && <span className="text-gray-500"> · {entry.studName}</span>}
            </p>
            {entry.yearStats && entry.yearStats.starts > 0 && (
              <p className="text-[10px] mt-0.5 leading-tight">
                <span className="text-gray-500">2026: </span>
                <span className="font-bold text-gray-300">{entry.yearStats.starts}-{entry.yearStats.wins}</span>
                {entry.yearStats.winless > 0 && (
                  <span className="text-gray-500"> ({entry.yearStats.winless})</span>
                )}
              </p>
            )}
          </div>

          {/* Peso + Jinete — alineados derecha */}
          <div className="shrink-0 text-right">
            <p className="text-[15px] font-extrabold text-white leading-tight">
              {entry.weightDeclared || '—'}<span className="text-[10px] font-normal text-gray-600"> kg</span>
            </p>
            <p className="text-[13px] font-bold text-amber-200 leading-tight text-right">
              {jockeyShort(entry.jockeyName)}
            </p>
          </div>
        </div>

        {/* ── Historial ── */}
        {hasHistory && (() => {
          const lastRace = entry.raceHistory[0];
          const dsc = lastRace ? daysSince(lastRace.date) : null;
          return (
            <div className="mt-1.5 ml-[2.875rem]">
              <HistoryHeader />
              {entry.raceHistory.map((h, i) => <HistoryRow key={i} h={h} />)}
              {dsc !== null && (
                <p className="text-[8px] text-gray-500 mt-1 font-mono">
                  DSC: <span className={`font-bold ${dsc <= 7 ? 'text-green-400' : dsc <= 21 ? 'text-yellow-400' : 'text-gray-400'}`}>{dsc} días</span>
                </p>
              )}
            </div>
          );
        })()}
        {!hasHistory && (
          <div className="ml-[2.875rem] mt-1">
            <p className="text-[10px] text-gray-500 italic">Sin historial</p>
            <p className="text-[8px] text-gray-500 font-mono mt-0.5">DSC: <span className="text-gray-400">N/A</span></p>
          </div>
        )}

        {/* ── Trabajos ── */}
        {hasWorkouts && hasWork && (
          <div className="mt-1.5 ml-[2.875rem]">
            <p className="text-[8px] font-bold uppercase tracking-widest text-gray-700 pb-0.5">Trabajos</p>
            {entry.workouts.map((w, i) => <WorkoutRow key={i} w={w} />)}
          </div>
        )}
      </div>
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

  function handlePrint() {
    window.print();
  }

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

      {/* Watermark siempre en DOM pero solo visible en print */}
      <div className="print-watermark hidden">
        Revista Hípica Oficial · {SITE} · Datos INH/HINAVA · Distribución gratuita
      </div>

      {/* ── Header pantalla ── */}
      <header className="screen-only sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
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
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
              title="Imprimir / Guardar como PDF">
              🖨 PDF
            </button>
            <Link href={`/programa/${meetingId}`}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-black"
              style={{ backgroundColor: GOLD }}>
              Inscritos →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Contenido pantalla ── */}
      <main className="screen-only mx-auto max-w-2xl px-4 py-4 space-y-4">

        {/* Aviso trabajos */}
        {!hasWorkouts && (
          <div className="rounded-xl border border-gray-800/60 bg-gray-900/40 px-3 py-2 flex items-center gap-2">
            <span className="text-xs shrink-0">📋</span>
            <p className="text-[11px] text-gray-600">
              <strong className="text-gray-500">Trabajos aún no disponibles.</strong> Se cargan entre martes y sábado.
            </p>
          </div>
        )}

        {/* Selector de carrera */}
        <div>
          <p className="text-[9px] text-gray-700 mb-2 font-bold uppercase tracking-wider">Selecciona una carrera</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {races.map(race => {
              const isSelected = selectedRace === race.raceNumber;
              const hasResult = race.entries.some(e => e.finishPosition !== null);
              const hasWork   = race.entries.some(e => e.workouts.length > 0);
              const hasHist   = race.entries.some(e => e.raceHistory.length > 0);
              return (
                <button key={race.raceId}
                  onClick={() => setSelectedRace(race.raceNumber)}
                  className={`relative flex flex-col items-center py-2 px-1 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    isSelected ? 'text-black border-yellow-600' : 'bg-gray-900 border-gray-800 text-white hover:border-gray-600'
                  }`}
                  style={isSelected ? { backgroundColor: GOLD } : {}}>
                  <span className="text-sm font-extrabold">{race.raceNumber}</span>
                  <span className={`text-[9px] ${isSelected ? 'text-black/60' : 'text-gray-600'}`}>{race.distance}m</span>
                  <div className="flex gap-0.5 mt-0.5">
                    {hasHist   && <span className="text-[7px]">🏁</span>}
                    {hasWork   && <span className="text-[7px]">📋</span>}
                    {hasResult && <span className="text-[7px]">✅</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Carrera seleccionada */}
        {currentRace && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">

            {/* Cabecera carrera */}
            <div className="px-4 py-3 border-b border-gray-800">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-extrabold text-white leading-none">C{currentRace.raceNumber}</span>
                    {currentRace.annualRaceNumber && (
                      <span className="text-xs text-gray-700 border border-gray-800 rounded px-1">Anual {currentRace.annualRaceNumber}</span>
                    )}
                    <span className="text-sm font-bold text-gray-300">{currentRace.distance} mts</span>
                    {currentRace.scheduledTime && (
                      <span className="text-xs text-gray-600">· {currentRace.scheduledTime}</span>
                    )}
                    {currentRace.status === 'finished' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-950/50 border border-green-700/40 text-green-300">✓ Finalizada</span>
                    )}
                  </div>
                  {currentRace.conditions && (
                    <p className="text-[11px] text-gray-500 mt-1 leading-snug">{currentRace.conditions}</p>
                  )}
                  {(currentRace.prizePool?.bs > 0 || currentRace.prizePool?.usd > 0) && (
                    <p className="text-xs font-bold mt-1" style={{ color: GOLD }}>
                      {currentRace.prizePool.bs > 0 && `Bs. ${currentRace.prizePool.bs.toLocaleString('es-VE')}`}
                      {currentRace.prizePool.usd > 0 && `  US$ ${currentRace.prizePool.usd.toLocaleString()}`}
                    </p>
                  )}
                </div>
                {currentRace.games.length > 0 && (
                  <div className="flex flex-wrap gap-1 shrink-0">
                    {currentRace.games.map(g => (
                      <span key={g} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700/50 text-gray-500 uppercase">
                        {g.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Participantes */}
            <div className="divide-y divide-gray-800/50">
              {currentRace.entries.map(entry => (
                <HorseCard key={entry.dorsalNumber} entry={entry} hasWorkouts={hasWorkouts} />
              ))}
            </div>
          </div>
        )}

        {!currentRace && (
          <div className="text-center py-12 text-gray-800">
            <p className="text-3xl mb-2">☝️</p>
            <p className="text-sm">Selecciona una carrera arriba</p>
          </div>
        )}

        <p className="text-center text-[10px] text-gray-800 pb-4">
          {SITE} · Datos oficiales INH/HINAVA
        </p>
      </main>

      {/* ── BLOQUE IMPRESIÓN: todas las carreras, diseño blanco/negro con marca ── */}
      <div className="print-races-full hidden">

        {/* Cabecera de la revista impresa */}
        <div className="print-header">
          <div>
            <p style={{ fontSize: '18px', fontWeight: 900, letterSpacing: '-0.5px' }}>REVISTA HÍPICA DIGITAL</p>
            <p style={{ fontSize: '11px', color: '#555' }}>
              {trackEmoji} {meeting.trackName} · Reunión {meeting.meetingNumber} · <span style={{ textTransform: 'capitalize' }}>{meetingDate}</span>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#D4AF37' }}>{SITE}</p>
            <p style={{ fontSize: '9px', color: '#888' }}>Datos oficiales INH/HINAVA</p>
          </div>
        </div>

        {races.map(race => (
          <div key={race.raceId} className="print-race-block">
            {/* Cabecera de carrera */}
            <div style={{ borderBottom: '1.5px solid #222', paddingBottom: '4px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 900 }}>CARRERA {race.raceNumber}</span>
                {race.annualRaceNumber && <span style={{ fontSize: '10px', color: '#666', marginLeft: '6px' }}>· Anual {race.annualRaceNumber}</span>}
                <span style={{ fontSize: '11px', fontWeight: 700, marginLeft: '8px' }}>{race.distance} mts</span>
                {race.scheduledTime && <span style={{ fontSize: '10px', color: '#666', marginLeft: '6px' }}>{race.scheduledTime}</span>}
                {race.conditions && <p style={{ fontSize: '9px', color: '#666', marginTop: '1px' }}>{race.conditions}</p>}
              </div>
              {(race.prizePool?.bs > 0 || race.prizePool?.usd > 0) && (
                <div style={{ textAlign: 'right' }}>
                  {race.prizePool.bs > 0 && <p style={{ fontSize: '10px', fontWeight: 700 }}>Bs. {race.prizePool.bs.toLocaleString('es-VE')}</p>}
                  {race.prizePool.usd > 0 && <p style={{ fontSize: '10px', fontWeight: 700 }}>US$ {race.prizePool.usd.toLocaleString()}</p>}
                </div>
              )}
            </div>

            {/* Caballos */}
            {race.entries.map(entry => (
              <div key={entry.dorsalNumber} className="print-horse-row">
                {/* Fila principal */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  {/* Dorsal */}
                  <span style={{ width: '20px', textAlign: 'center', fontWeight: 900, fontSize: '14px', flexShrink: 0, paddingTop: '1px',
                    color: entry.finishPosition === 1 ? '#b7860a' : entry.finishPosition === 2 ? '#555' : '#111' }}>
                    {entry.dorsalNumber}
                  </span>
                  {/* Datos */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, textDecoration: entry.isScratched ? 'line-through' : 'none', color: entry.isScratched ? '#888' : '#000' }}>
                        {entry.horseName}
                      </span>
                      {entry.isScratched && <span className="print-badge-ret" style={{ fontSize: '9px' }}>RETIRADO</span>}
                      {entry.medication && <span className="print-badge-med" style={{ fontSize: '8px', padding: '0 3px', borderRadius: '2px' }}>{entry.medication}</span>}
                      {entry.implements && <span style={{ fontSize: '8px', color: '#666' }}>{entry.implements}</span>}
                    </div>
                    <p style={{ fontSize: '9px', color: '#555', margin: '1px 0 0' }}>
                      Ent: {entry.trainerName || '—'}{entry.studName ? ` · ${entry.studName}` : ''}
                    </p>
                    {/* Historial */}
                    {entry.raceHistory.length > 0 && (
                      <div style={{ marginTop: '3px', paddingLeft: '4px', borderLeft: '2px solid #eee' }}>
                        <p style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em', marginBottom: '1px' }}>Últimas carreras</p>
                        {entry.raceHistory.map((h, i) => {
                          const isW2 = h.finishPosition === 1;
                          const diff2 = isW2 ? 'GANÓ' : (h.diffVsFirst ?? h.distanceMargin ?? '');
                          return (
                          <div key={i} style={{ display: 'flex', gap: '5px', fontSize: '9px', color: '#444', padding: '1px 0', borderTop: i > 0 ? '1px solid #f0f0f0' : 'none' }}>
                            <span style={{ width: '44px', color: '#666' }}>{shortDate(h.date)}</span>
                            <span style={{ width: '36px', fontFamily: 'monospace', color: '#555' }}>
                              {raceLabel(h.trackCode, h.annualRaceNumber, h.raceNumber)}
                            </span>
                            <span style={{ width: '14px', textAlign: 'center', fontWeight: 800,
                              color: isW2 ? '#b7860a' : h.finishPosition === 2 ? '#666' : '#222' }}>
                              {h.isScratched ? 'R' : (h.finishPosition ?? '?')}
                            </span>
                            <span style={{ width: '38px', color: '#666' }}>{h.distance}m</span>
                            <span style={{ width: '48px', fontFamily: 'monospace', color: '#999' }} title="T. Ganador">
                              {isW2 ? '' : (h.winnerTime ?? '—')}
                            </span>
                            <span style={{ width: '48px', fontFamily: 'monospace', color: isW2 ? '#b7860a' : '#333', fontWeight: isW2 ? 700 : 400 }} title="T. Ejemplar">
                              {h.officialTime ?? '—'}
                            </span>
                            <span style={{ width: '36px', color: '#666' }} title="Dif vs 1°">{diff2}</span>
                            <span style={{ width: '80px', color: '#777', fontSize: '8px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {h.jockeyName ?? ''}
                            </span>
                            <span style={{ flex: 1, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '8px' }}>
                              {isW2 ? (h.secondName ? `2° ${h.secondName}` : '') : (h.winnerName ? `1° ${h.winnerName}` : '')}
                            </span>
                          </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Trabajos */}
                    {entry.workouts.length > 0 && (
                      <div style={{ marginTop: '3px', paddingLeft: '4px', borderLeft: '2px solid #dbeafe' }}>
                        <p style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', color: '#888', letterSpacing: '0.05em', marginBottom: '1px' }}>Trabajos</p>
                        {entry.workouts.map((w, i) => (
                          <div key={i} style={{ display: 'flex', gap: '6px', fontSize: '9px', color: '#444', padding: '1px 0', borderTop: i > 0 ? '1px solid #f0f0f0' : 'none' }}>
                            <span style={{ width: '44px', fontWeight: 700, color: '#1d4ed8' }}>{WORKOUT_LABELS[w.workoutType] ?? w.workoutType}</span>
                            <span style={{ width: '46px', color: '#666' }}>{shortDate(w.workoutDate)}</span>
                            {w.distance > 0 && <span style={{ width: '36px', color: '#666' }}>{w.distance}m</span>}
                            {w.daysRest !== null && <span style={{ width: '24px', fontWeight: 700, color: (w.daysRest ?? 99) <= 7 ? '#15803d' : '#666' }}>{w.daysRest}d</span>}
                            {w.splits && <span style={{ width: '50px', fontFamily: 'monospace', color: '#444' }}>{w.splits}</span>}
                            <span style={{ flex: 1, color: '#666', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {w.comment || w.jockeyName}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Peso + Jinete alineados derecha */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '70px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 900, margin: 0 }}>{entry.weightDeclared || '—'} <span style={{ fontSize: '9px', fontWeight: 400, color: '#666' }}>kg</span></p>
                    <p style={{ fontSize: '9px', color: '#555', margin: '1px 0 0' }}>{entry.jockeyName || '—'}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Juegos de esta carrera */}
            {race.games.length > 0 && (
              <p style={{ fontSize: '8px', color: '#888', marginTop: '4px', textAlign: 'right' }}>
                Juegos: {race.games.map(g => g.replace(/_/g, ' ')).join(' · ')}
              </p>
            )}
          </div>
        ))}

        {/* Pie de página de marca */}
        <div style={{ borderTop: '1px solid #ddd', marginTop: '16px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#aaa' }}>
          <span>Generado por {SITE} · Datos oficiales INH/HINAVA</span>
          <span>Distribución gratuita — {new Date().toLocaleDateString('es-VE')}</span>
        </div>
      </div>

    </div>
  );
}
