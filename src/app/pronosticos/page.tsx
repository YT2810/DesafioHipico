'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ForecastLabel, MARK_POINTS, FIJO_BONUS_POINTS, FREE_RACES_PER_MEETING } from '@/lib/constants';

interface Mark { preferenceOrder: number; horseName: string; dorsalNumber?: number; label: ForecastLabel; note?: string; }
interface HandicapperInfo { id: string; pseudonym: string; pct1st: number; pct2nd: number; pctGeneral: number; contactNumber?: string; }
interface ForecastItem { handicapper: HandicapperInfo; marks: Mark[]; isVip: boolean; _locked?: boolean; }
interface RaceItem { raceId: string; raceNumber: number; distance: number; scheduledTime: string; conditions: string; prizePool: number; forecasts: ForecastItem[]; }
interface MeetingItem { meetingId: string; meetingNumber: number; date: string; trackName: string; races: RaceItem[]; }
interface HorseFactor { horseName: string; dorsalNumber?: number; points: number; factor: number; }

function calcFactors(forecasts: ForecastItem[]): HorseFactor[] {
  const pub = forecasts.filter(f => !f._locked);
  if (!pub.length) return [];
  const maxTotal = pub.length * FIJO_BONUS_POINTS;
  const map = new Map<string, { points: number; dorsalNumber?: number }>();
  for (const fc of pub) {
    for (const m of fc.marks) {
      const key = m.horseName.toUpperCase();
      const isFijo = m.preferenceOrder === 1 && m.label === 'Casi Fijo';
      const pts = isFijo ? FIJO_BONUS_POINTS : (MARK_POINTS[m.preferenceOrder] ?? 1);
      const prev = map.get(key);
      map.set(key, { points: (prev?.points ?? 0) + pts, dorsalNumber: prev?.dorsalNumber ?? m.dorsalNumber });
    }
  }
  return [...map.entries()]
    .map(([horseName, { points, dorsalNumber }]) => ({ horseName, dorsalNumber, points, factor: maxTotal > 0 ? points / maxTotal : 0 }))
    .sort((a, b) => b.factor - a.factor);
}

const LABEL_CFG: Record<ForecastLabel, { color: string; bg: string; border: string; emoji: string }> = {
  'Línea':          { color: 'text-gray-300',   bg: 'bg-gray-700/50',    border: 'border-gray-600',   emoji: '📌' },
  'Casi Fijo':      { color: 'text-blue-300',   bg: 'bg-blue-900/40',   border: 'border-blue-700',   emoji: '🔵' },
  'Súper Especial': { color: 'text-yellow-300', bg: 'bg-yellow-900/40', border: 'border-yellow-600', emoji: '⭐' },
  'Buen Dividendo': { color: 'text-green-300',  bg: 'bg-green-900/40',  border: 'border-green-700',  emoji: '💰' },
  'Batacazo':       { color: 'text-orange-300', bg: 'bg-orange-900/40', border: 'border-orange-600', emoji: '🔥' },
};
const GOLD = '#D4AF37';

const MOCK_MEETINGS: MeetingItem[] = [
  {
    meetingId: 'meeting-9', meetingNumber: 9, date: '22/02/2026', trackName: 'La Rinconada',
    races: Array.from({ length: 11 }, (_, i) => ({
      raceId: `r9-${i+1}`, raceNumber: i+1,
      distance: [1400,1200,1200,1400,1200,1200,1400,1100,1100,1100,1200][i],
      scheduledTime: `${String(13+Math.floor(i*0.45)).padStart(2,'0')}:${String((i*27)%60).padStart(2,'0')} p.m.`,
      conditions: 'HANDICAP LIBRE',
      prizePool: [3600,2800,3600,3600,3800,2400,2200,2000,2000,3600,1600][i],
      forecasts: i < 5 ? [
        { handicapper: { id:'h1', pseudonym:'El Maestro', pct1st:42, pct2nd:55, pctGeneral:68, contactNumber:'+584120000000' }, isVip: i>=3,
          marks: [{ preferenceOrder:1, horseName:'QUALITY PRINCESS', dorsalNumber:1, label:'Casi Fijo' },{ preferenceOrder:2, horseName:'MISS BUENA VISTA', dorsalNumber:4, label:'Línea' },{ preferenceOrder:3, horseName:'ABUSIVA', dorsalNumber:7, label:'Buen Dividendo' }] },
        { handicapper: { id:'h2', pseudonym:'TurfMaster VE', pct1st:38, pct2nd:49, pctGeneral:61 }, isVip: false,
          marks: [{ preferenceOrder:1, horseName:'ABUSIVA', dorsalNumber:7, label:'Batacazo', note:'Viene de buena forma' },{ preferenceOrder:2, horseName:'QUALITY PRINCESS', dorsalNumber:1, label:'Línea' },{ preferenceOrder:3, horseName:'LA REINA DEL SUR', dorsalNumber:3, label:'Buen Dividendo' }] },
        { handicapper: { id:'h3', pseudonym:'Don Caballos', pct1st:51, pct2nd:62, pctGeneral:74, contactNumber:'+584141111111' }, isVip: false,
          marks: [{ preferenceOrder:1, horseName:'QUALITY PRINCESS', dorsalNumber:1, label:'Casi Fijo' },{ preferenceOrder:2, horseName:'LA REINA DEL SUR', dorsalNumber:3, label:'Casi Fijo' },{ preferenceOrder:3, horseName:'ABUSIVA', dorsalNumber:7, label:'Línea' },{ preferenceOrder:4, horseName:'MISS BUENA VISTA', dorsalNumber:4, label:'Buen Dividendo' }] },
      ] : [],
    })),
  },
  {
    meetingId: 'meeting-10', meetingNumber: 10, date: '01/03/2026', trackName: 'La Rinconada',
    races: Array.from({ length: 11 }, (_, i) => ({
      raceId: `r10-${i+1}`, raceNumber: i+1,
      distance: [1200,1400,1200,1400,1200,1100,1400,1200,1100,1200,1400][i],
      scheduledTime: `${String(13+Math.floor(i*0.45)).padStart(2,'0')}:${String((i*27)%60).padStart(2,'0')} p.m.`,
      conditions: 'HANDICAP LIBRE', prizePool: [2800,3600,2400,3600,3800,2000,2200,2000,2000,3600,1600][i], forecasts: [],
    })),
  },
];

function StatPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-mono border ${accent ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700/40' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {label} {value}
    </span>
  );
}

function HandicapperBlock({ forecast, isFollowed, onFollow }: { forecast: ForecastItem; isFollowed: boolean; onFollow: () => void }) {
  const { handicapper, marks, isVip, _locked } = forecast;
  const [open, setOpen] = useState(false);

  const sortedMarks = [...marks].sort((a, b) => a.preferenceOrder - b.preferenceOrder);

  return (
    <div className="px-4 py-0">
      {/* ── Collapsed row — always visible ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-800/30 active:bg-gray-800/50 transition-colors rounded-lg -mx-1 px-1"
      >
        {/* Avatar */}
        <span
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold"
          style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: GOLD, border: '1.5px solid rgba(212,175,55,0.25)' }}
        >
          {handicapper.pseudonym[0].toUpperCase()}
        </span>

        {/* Name + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{handicapper.pseudonym}</span>
            {isVip && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ color: GOLD, backgroundColor: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                VIP
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StatPill label="1ra" value={`${handicapper.pct1st}%`} />
            <StatPill label="2da" value={`${handicapper.pct2nd}%`} />
            <StatPill label="Gral" value={`${handicapper.pctGeneral}%`} accent />
          </div>
        </div>

        {/* Compact dorsal chips preview (collapsed) */}
        {!open && !_locked && sortedMarks.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {sortedMarks.slice(0, 3).map(m => {
              const cfg = LABEL_CFG[m.label];
              return (
                <span
                  key={m.preferenceOrder}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold border ${cfg.border}`}
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: 'white' }}
                  title={m.horseName}
                >
                  {m.dorsalNumber ?? '?'}
                </span>
              );
            })}
            {sortedMarks.length > 3 && (
              <span className="text-xs text-gray-600">+{sortedMarks.length - 3}</span>
            )}
          </div>
        )}
        {!open && _locked && (
          <span className="text-xs text-yellow-600 shrink-0">VIP 🔒</span>
        )}

        {/* Follow + chevron */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          {handicapper.contactNumber && (
            <a
              href={`https://wa.me/${handicapper.contactNumber.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 rounded-full bg-green-900/40 border border-green-800/40 flex items-center justify-center text-xs transition-colors hover:bg-green-800/50"
              title="WhatsApp"
            >
              📱
            </a>
          )}
          <button
            onClick={onFollow}
            className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all ${
              isFollowed
                ? 'bg-yellow-900/40 border-yellow-700/50 text-yellow-300'
                : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-yellow-700/40 hover:text-yellow-300'
            }`}
          >
            {isFollowed ? '✓' : '+ Seguir'}
          </button>
        </div>
        <span className="text-gray-700 text-xs shrink-0 ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {/* ── Expanded marks ── */}
      {open && (
        <div className="pb-3 pt-1">
          {_locked ? (
            <div className="rounded-xl border border-yellow-800/30 bg-yellow-950/20 px-3 py-2.5 flex items-center gap-2">
              <span className="text-base">🔒</span>
              <div>
                <p className="text-xs font-semibold text-yellow-300">Pronóstico VIP</p>
                <p className="text-xs text-gray-600">Desbloquea esta carrera para ver las marcas</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sortedMarks.map(mark => {
                const cfg = LABEL_CFG[mark.label];
                const isFijo = mark.preferenceOrder === 1 && mark.label === 'Casi Fijo';
                return (
                  <div
                    key={mark.preferenceOrder}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${cfg.bg} ${cfg.border}`}
                  >
                    {/* Preference order */}
                    <span className="shrink-0 w-4 text-xs font-bold text-gray-500 text-center">
                      {mark.preferenceOrder}
                    </span>
                    {/* Dorsal */}
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-sm font-extrabold text-white">
                      {mark.dorsalNumber ?? '—'}
                    </span>
                    {/* Label badge */}
                    <span className={`shrink-0 text-xs font-semibold ${cfg.color}`}>
                      {cfg.emoji} {mark.label}
                    </span>
                    {isFijo && (
                      <span className="shrink-0 text-xs font-bold text-blue-300 bg-blue-900/50 border border-blue-700/40 px-1.5 py-0.5 rounded-full">
                        8pts
                      </span>
                    )}
                    {/* Horse name — subtle, secondary info */}
                    <span className="flex-1 text-xs text-gray-500 truncate text-right">
                      {mark.horseName}
                    </span>
                    {mark.note && (
                      <span className="shrink-0 text-xs text-gray-700 italic truncate max-w-[80px]" title={mark.note}>
                        {mark.note}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RacePanel({ race, unlocked, goldBalance, followedIds, onUnlock, onFollow }: {
  race: RaceItem; unlocked: boolean; goldBalance: number; followedIds: Set<string>; onUnlock: () => void; onFollow: (id: string) => void;
}) {
  const factors = unlocked ? calcFactors(race.forecasts) : [];
  const hasBatacazo = race.forecasts.some(f => f.marks.some(m => m.label === 'Batacazo'));
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-extrabold text-white">Carrera {race.raceNumber}</span>
            <span className="text-sm text-gray-400">{race.distance} mts</span>
            <span className="text-xs text-gray-600">{race.scheduledTime}</span>
            {hasBatacazo && unlocked && <span className="text-xs font-bold text-orange-400 bg-orange-950/60 border border-orange-700/40 px-2 py-0.5 rounded-full">🔥 BATACAZO</span>}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{race.conditions} · Premio Bs. {race.prizePool.toLocaleString()}</p>
        </div>
        {!unlocked && (
          <button onClick={onUnlock} disabled={goldBalance < 1}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-black disabled:opacity-40"
            style={{ backgroundColor: GOLD }}>
            🔒 1 Gold
          </button>
        )}
      </div>
      {!unlocked && (
        <div className="px-4 py-10 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🔒</span>
          <p className="text-sm text-gray-500">Desbloquea para ver los pronósticos de esta carrera</p>
          {goldBalance < 1 && <Link href="/" className="text-xs font-bold px-4 py-2 rounded-xl text-black" style={{ backgroundColor: GOLD }}>Recargar Golds</Link>}
        </div>
      )}
      {unlocked && (
        <>
          {factors.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                Factor de Victoria <span className="ml-1 text-gray-700 font-normal normal-case">· {race.forecasts.filter(f => !f._locked).length} pronosticadores</span>
              </p>
              <div className="space-y-2">
                {factors.slice(0, 6).map((h, i) => (
                  <div key={h.horseName} className="flex items-center gap-2">
                    <span className="shrink-0 w-4 text-xs text-gray-600 font-bold">{i+1}</span>
                    {h.dorsalNumber != null && <span className="shrink-0 w-6 h-6 rounded bg-gray-800 flex items-center justify-center text-xs font-bold text-white">{h.dorsalNumber}</span>}
                    <span className="flex-1 text-xs font-semibold text-white truncate">{h.horseName}</span>
                    <div className="w-20 h-2 rounded-full bg-gray-800 overflow-hidden shrink-0">
                      <div className="h-full rounded-full" style={{ width: `${h.factor*100}%`, backgroundColor: h.factor>=0.5?'#22c55e':h.factor>=0.25?GOLD:'#6b7280' }} />
                    </div>
                    <span className="shrink-0 text-xs font-bold font-mono w-9 text-right" style={{ color: h.factor>=0.5?'#22c55e':h.factor>=0.25?GOLD:'#9ca3af' }}>
                      {h.factor.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {race.forecasts.length === 0
            ? <p className="px-4 py-8 text-sm text-gray-600 text-center italic">Sin pronósticos publicados aún para esta carrera.</p>
            : <div className="divide-y divide-gray-800/60">{race.forecasts.map((fc, i) => <HandicapperBlock key={i} forecast={fc} isFollowed={followedIds.has(fc.handicapper.id)} onFollow={() => onFollow(fc.handicapper.id)} />)}</div>
          }
        </>
      )}
    </div>
  );
}

export default function PronosticosPage() {
  const [selectedMeetingId, setSelectedMeetingId] = useState(MOCK_MEETINGS[0].meetingId);
  const [selectedRaceNumber, setSelectedRaceNumber] = useState<number | null>(null);
  const userRole = 'customer' as const;
  const [goldBalance, setGoldBalance] = useState(5);
  const [unlockedRaceIds, setUnlockedRaceIds] = useState<Set<string>>(new Set());
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const isPrivileged = userRole !== 'customer';
  const meeting = MOCK_MEETINGS.find(m => m.meetingId === selectedMeetingId) ?? MOCK_MEETINGS[0];

  function isRaceUnlocked(raceId: string, idx: number) {
    if (isPrivileged) return true;
    if (idx < FREE_RACES_PER_MEETING) return true;
    return unlockedRaceIds.has(raceId);
  }
  const freeRemaining = Math.max(0, FREE_RACES_PER_MEETING - meeting.races.filter((_,i) => i < FREE_RACES_PER_MEETING).length);

  function handleUnlock(raceId: string) {
    if (goldBalance < 1) return;
    setGoldBalance(b => b - 1);
    setUnlockedRaceIds(prev => new Set([...prev, raceId]));
  }
  function toggleFollow(id: string) {
    setFollowedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const selectedRace = selectedRaceNumber != null ? meeting.races.find(r => r.raceNumber === selectedRaceNumber) ?? null : null;
  const selectedRaceIdx = selectedRace ? meeting.races.findIndex(r => r.raceId === selectedRace.raceId) : -1;
  const selectedUnlocked = selectedRace ? isRaceUnlocked(selectedRace.raceId, selectedRaceIdx) : false;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-gray-500 hover:text-white text-lg leading-none shrink-0">←</Link>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white truncate">🏇 Pronósticos</h1>
              <p className="text-xs text-gray-500 truncate">{meeting.trackName} · Reunión {meeting.meetingNumber} · {meeting.date}</p>
            </div>
          </div>
          {!isPrivileged && (
            <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-2.5 py-1.5 shrink-0">
              <span className="text-sm">🪙</span>
              <span className="text-sm font-bold" style={{ color: GOLD }}>{goldBalance}</span>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        {/* Meeting selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {MOCK_MEETINGS.map(m => (
            <button key={m.meetingId}
              onClick={() => { setSelectedMeetingId(m.meetingId); setSelectedRaceNumber(null); }}
              className={`shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${selectedMeetingId === m.meetingId ? 'text-black border-yellow-600' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}
              style={selectedMeetingId === m.meetingId ? { backgroundColor: GOLD } : {}}>
              <span className="font-bold text-sm">R{m.meetingNumber}</span>
              <span className="opacity-80">{m.date}</span>
            </button>
          ))}
        </div>
        {/* Freemium banner */}
        {!isPrivileged && (
          <div className="rounded-xl border border-yellow-800/40 bg-yellow-950/20 px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-yellow-200/80">
              <span className="font-semibold text-yellow-300">{freeRemaining} carrera{freeRemaining!==1?'s':''} gratis</span>
              {' '}en esta reunión · resto <span className="font-semibold">1 Gold</span> c/u
            </p>
            <Link href="/" className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg text-black whitespace-nowrap" style={{ backgroundColor: GOLD }}>+ Golds</Link>
          </div>
        )}
        {/* Race buttons C1–C11 */}
        <div>
          <p className="text-xs text-gray-600 mb-2 font-medium uppercase tracking-wide">Selecciona una carrera</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {meeting.races.map((race, idx) => {
              const unlocked = isRaceUnlocked(race.raceId, idx);
              const hasForecasts = race.forecasts.length > 0;
              const isSelected = selectedRaceNumber === race.raceNumber;
              const topFactor = unlocked ? (calcFactors(race.forecasts)[0]?.factor ?? 0) : 0;
              return (
                <button key={race.raceId}
                  onClick={() => setSelectedRaceNumber(isSelected ? null : race.raceNumber)}
                  className={`relative flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl border text-xs font-bold transition-all active:scale-95 ${isSelected ? 'text-black border-yellow-600' : unlocked ? 'bg-gray-900 border-gray-700 text-white hover:border-gray-500' : 'bg-gray-900/50 border-gray-800 text-gray-600'}`}
                  style={isSelected ? { backgroundColor: GOLD } : {}}>
                  <span className="text-sm font-extrabold">C{race.raceNumber}</span>
                  {hasForecasts && unlocked && <span className={`text-xs ${isSelected?'text-black/70':'text-yellow-400'}`}>{race.forecasts.length}🎯</span>}
                  {hasForecasts && !unlocked && <span className="text-xs">🔒</span>}
                  {!hasForecasts && <span className={`text-xs ${isSelected?'text-black/50':'text-gray-700'}`}>—</span>}
                  {unlocked && topFactor > 0 && (
                    <div className="w-full h-0.5 rounded-full bg-gray-700 mt-0.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${topFactor*100}%`, backgroundColor: isSelected?'rgba(0,0,0,0.4)':GOLD }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {/* Race detail */}
        {selectedRace ? (
          <RacePanel race={selectedRace} unlocked={selectedUnlocked} goldBalance={goldBalance} followedIds={followedIds}
            onUnlock={() => handleUnlock(selectedRace.raceId)} onFollow={toggleFollow} />
        ) : (
          <div className="text-center py-10 text-gray-700">
            <p className="text-4xl mb-3">☝️</p>
            <p className="text-sm">Selecciona una carrera para ver los pronósticos</p>
          </div>
        )}
      </main>
    </div>
  );
}
