'use client';

import { useState } from 'react';
import { ForecastLabel } from '@/models/Forecast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Mark {
  preferenceOrder: number;
  horseName: string;
  dorsalNumber?: number;
  label: ForecastLabel;
  note?: string;
}

interface HandicapperInfo {
  id: string;
  pseudonym: string;
  pct1st: number;
  pct2nd: number;
  pctGeneral: number;
  contactNumber?: string;
}

interface ForecastItem {
  handicapper: HandicapperInfo;
  marks: Mark[];
  isVip: boolean;
  _locked?: boolean;
}

interface RaceItem {
  raceId: string;
  raceNumber: number;
  annualRaceNumber?: number;
  distance: number;
  scheduledTime: string;
  conditions: string;
  prizePool: number;
  forecasts: ForecastItem[];
}

interface MeetingData {
  meetingId: string;
  meetingNumber: number;
  date: string;
  trackName: string;
  races: RaceItem[];
}

// ─── Label config ─────────────────────────────────────────────────────────────

const LABEL_CFG: Record<ForecastLabel, { color: string; bg: string; border: string; emoji: string }> = {
  'Línea':          { color: 'text-gray-300',   bg: 'bg-gray-700/50',    border: 'border-gray-600',   emoji: '📌' },
  'Casi Fijo':      { color: 'text-blue-300',   bg: 'bg-blue-900/40',   border: 'border-blue-700',   emoji: '🔵' },
  'Súper Especial': { color: 'text-yellow-300', bg: 'bg-yellow-900/40', border: 'border-yellow-600', emoji: '⭐' },
  'Buen Dividendo': { color: 'text-green-300',  bg: 'bg-green-900/40',  border: 'border-green-700',  emoji: '💰' },
  'Batacazo':       { color: 'text-orange-300', bg: 'bg-orange-900/40', border: 'border-orange-600', emoji: '🔥' },
};

const GOLD = '#D4AF37';
const FREE_PER_MEETING = 2;

// ─── Mock data (replace with API) ────────────────────────────────────────────

const MOCK_MEETING: MeetingData = {
  meetingId: 'meeting-9',
  meetingNumber: 9,
  date: '22/02/2026',
  trackName: 'La Rinconada',
  races: Array.from({ length: 11 }, (_, i) => ({
    raceId: `race-${i + 1}`,
    raceNumber: i + 1,
    annualRaceNumber: 76 + i,
    distance: [1400,1200,1200,1400,1200,1200,1400,1100,1100,1100,1200][i],
    scheduledTime: `${String(13 + Math.floor(i * 0.45)).padStart(2,'0')}:${String((i*27)%60).padStart(2,'0')} p.m.`,
    conditions: 'HANDICAP LIBRE',
    prizePool: [3600,2800,3600,3600,3800,2400,2200,2000,2000,3600,1600][i],
    forecasts: i < 4 ? [
      {
        handicapper: { id: 'h1', pseudonym: 'El Maestro', pct1st: 42, pct2nd: 55, pctGeneral: 68, contactNumber: '+58 412 0000000' },
        isVip: i >= 2,
        marks: [
          { preferenceOrder: 1, horseName: 'QUALITY PRINCESS', dorsalNumber: 1, label: 'Casi Fijo' },
          { preferenceOrder: 2, horseName: 'MISS BUENA VISTA',  dorsalNumber: 2, label: 'Línea' },
          { preferenceOrder: 3, horseName: 'ABUSIVA',           dorsalNumber: 3, label: 'Buen Dividendo' },
        ],
      },
      {
        handicapper: { id: 'h2', pseudonym: 'TurfMaster VE', pct1st: 38, pct2nd: 49, pctGeneral: 61 },
        isVip: false,
        marks: [
          { preferenceOrder: 1, horseName: 'ABUSIVA',           dorsalNumber: 3, label: 'Batacazo', note: 'Viene de buena forma' },
          { preferenceOrder: 2, horseName: 'QUALITY PRINCESS',  dorsalNumber: 1, label: 'Línea' },
        ],
      },
    ] : [],
  })),
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PronosticosPage() {
  // Simulated session — replace with real auth
  const [userRole] = useState<'customer' | 'staff' | 'handicapper' | 'admin'>('customer');
  const [goldBalance, setGoldBalance] = useState(5);
  const [unlockedRaceIds, setUnlockedRaceIds] = useState<Set<string>>(new Set());
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  const isPrivileged = userRole !== 'customer';
  const freeUsed = [...unlockedRaceIds].filter(id =>
    MOCK_MEETING.races.findIndex(r => r.raceId === id) < FREE_PER_MEETING
  ).length;
  const freeRemaining = Math.max(0, FREE_PER_MEETING - freeUsed);

  function isUnlocked(raceId: string, idx: number): boolean {
    if (isPrivileged) return true;
    if (unlockedRaceIds.has(raceId)) return true;
    // First FREE_PER_MEETING races are auto-unlocked (consumed on first open)
    const alreadyConsumed = unlockedRaceIds.size;
    const autoSlots = Math.max(0, FREE_PER_MEETING - alreadyConsumed);
    const lockedCount = [...unlockedRaceIds].length;
    // Count how many races before this one are not yet unlocked
    const unlockedBefore = MOCK_MEETING.races.slice(0, idx).filter(r => unlockedRaceIds.has(r.raceId)).length;
    const freeSlotsUsedBefore = idx - unlockedBefore;
    return freeSlotsUsedBefore < FREE_PER_MEETING;
  }

  function handleUnlock(raceId: string) {
    if (goldBalance < 1) return;
    setGoldBalance(b => b - 1);
    setUnlockedRaceIds(prev => new Set([...prev, raceId]));
    // TODO: call POST /api/forecasts/unlock
  }

  function toggleFollow(handicapperId: string) {
    setFollowedIds(prev => {
      const next = new Set(prev);
      next.has(handicapperId) ? next.delete(handicapperId) : next.add(handicapperId);
      return next;
    });
    // TODO: call POST /api/handicappers/[id]/follow
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-900/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white truncate">🏇 Pronósticos</h1>
            <p className="text-xs text-gray-500 truncate">
              {MOCK_MEETING.trackName} · Reunión {MOCK_MEETING.meetingNumber} · {MOCK_MEETING.date}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isPrivileged && (
              <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-2.5 py-1.5">
                <span className="text-sm">🪙</span>
                <span className="text-sm font-bold" style={{ color: GOLD }}>{goldBalance}</span>
              </div>
            )}
            {isPrivileged && (
              <span className="text-xs bg-purple-900/50 border border-purple-700/50 text-purple-300 px-2.5 py-1 rounded-full font-medium capitalize">
                {userRole}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-3">
        {/* Freemium banner — only for customers */}
        {!isPrivileged && (
          <div className="rounded-xl border border-yellow-800/40 bg-yellow-950/20 px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-xs text-yellow-200/80 leading-relaxed">
              <span className="font-semibold text-yellow-300">{freeRemaining} carrera{freeRemaining !== 1 ? 's' : ''} gratis</span>
              {' '}restante{freeRemaining !== 1 ? 's' : ''} en esta reunión.
              {' '}Desbloquea más por <span className="font-semibold">1 Gold</span> c/u.
              <br />
              <span className="text-yellow-600">40 Golds = $10 USD</span>
            </div>
            <button
              className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg text-black whitespace-nowrap"
              style={{ backgroundColor: GOLD }}
            >
              + Golds
            </button>
          </div>
        )}

        {/* Race list */}
        {MOCK_MEETING.races.map((race, idx) => (
          <RaceCard
            key={race.raceId}
            race={race}
            unlocked={isUnlocked(race.raceId, idx)}
            isPrivileged={isPrivileged}
            goldBalance={goldBalance}
            followedIds={followedIds}
            onUnlock={() => handleUnlock(race.raceId)}
            onFollow={toggleFollow}
          />
        ))}
      </main>
    </div>
  );
}

// ─── Race Card ────────────────────────────────────────────────────────────────

function RaceCard({
  race, unlocked, isPrivileged, goldBalance, followedIds, onUnlock, onFollow,
}: {
  race: RaceItem;
  unlocked: boolean;
  isPrivileged: boolean;
  goldBalance: number;
  followedIds: Set<string>;
  onUnlock: () => void;
  onFollow: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasBatacazo = race.forecasts.some(f => f.marks.some(m => m.label === 'Batacazo'));
  const hasVip = race.forecasts.some(f => f.isVip);
  const freeCount = race.forecasts.filter(f => !f.isVip).length;

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      hasBatacazo && unlocked ? 'border-orange-700/50' : 'border-gray-800'
    } bg-gray-900`}>
      {/* Header row */}
      <button
        onClick={() => { if (unlocked) setOpen(o => !o); }}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          unlocked ? 'hover:bg-gray-800/50 active:bg-gray-800' : ''
        }`}
      >
        {/* Race number badge */}
        <span
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-black"
          style={{ backgroundColor: GOLD }}
        >
          C{race.raceNumber}
        </span>

        {/* Race info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{race.distance} mts</span>
            <span className="text-xs text-gray-500">{race.scheduledTime}</span>
            {hasBatacazo && unlocked && (
              <span className="text-xs font-bold text-orange-400 bg-orange-950/60 border border-orange-700/40 px-2 py-0.5 rounded-full">
                🔥 BATACAZO
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {race.forecasts.length > 0 && (
              <span className="text-xs text-gray-600">{race.forecasts.length} handicapper{race.forecasts.length > 1 ? 's' : ''}</span>
            )}
            {hasVip && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ color: GOLD, backgroundColor: 'rgba(212,175,55,0.12)', border: `1px solid rgba(212,175,55,0.3)` }}>
                VIP
              </span>
            )}
            {freeCount > 0 && (
              <span className="text-xs text-green-400 bg-green-950/30 border border-green-800/40 px-1.5 py-0.5 rounded">
                {freeCount} free
              </span>
            )}
          </div>
        </div>

        {/* Right side */}
        {unlocked ? (
          <span className="text-gray-600 text-xs shrink-0">{open ? '▲' : '▼'}</span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onUnlock(); }}
            disabled={goldBalance < 1}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-black disabled:opacity-40 active:scale-95 transition-transform"
            style={{ backgroundColor: GOLD }}
          >
            🔒 1 Gold
          </button>
        )}
      </button>

      {/* Locked placeholder */}
      {!unlocked && (
        <div className="mx-4 mb-4 rounded-xl border border-gray-800 bg-gray-900/60 py-6 flex flex-col items-center gap-2">
          <span className="text-4xl">🔒</span>
          <p className="text-sm text-gray-500 text-center px-4">
            Desbloquea los pronósticos de esta carrera
          </p>
          <p className="text-xs text-gray-700">Premio Bs. {race.prizePool.toLocaleString()}</p>
        </div>
      )}

      {/* Forecasts */}
      {unlocked && open && (
        <div className="border-t border-gray-800 divide-y divide-gray-800/50">
          {race.forecasts.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-600 text-center italic">
              Sin pronósticos publicados aún.
            </p>
          ) : (
            race.forecasts.map((fc, i) => (
              <HandicapperBlock
                key={i}
                forecast={fc}
                isFollowed={followedIds.has(fc.handicapper.id)}
                onFollow={() => onFollow(fc.handicapper.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Handicapper Forecast Block ───────────────────────────────────────────────

function HandicapperBlock({
  forecast, isFollowed, onFollow,
}: {
  forecast: ForecastItem;
  isFollowed: boolean;
  onFollow: () => void;
}) {
  const { handicapper, marks, isVip, _locked } = forecast;

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Handicapper header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
          style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: GOLD, border: `1.5px solid rgba(212,175,55,0.3)` }}
        >
          {handicapper.pseudonym[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{handicapper.pseudonym}</span>
            {isVip && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ color: GOLD, backgroundColor: 'rgba(212,175,55,0.12)', border: `1px solid rgba(212,175,55,0.3)` }}>
                VIP
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <StatPill label="1ra" value={`${handicapper.pct1st}%`} />
            <StatPill label="2da" value={`${handicapper.pct2nd}%`} />
            <StatPill label="Gral" value={`${handicapper.pctGeneral}%`} accent />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {handicapper.contactNumber && (
            <a
              href={`https://wa.me/${handicapper.contactNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-green-800/40 hover:bg-green-700/50 border border-green-700/40 text-green-400 text-base transition-colors"
              title="Contactar por WhatsApp"
            >
              📱
            </a>
          )}
          <button
            onClick={onFollow}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
              isFollowed
                ? 'bg-yellow-900/40 border-yellow-700/50 text-yellow-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-yellow-700/50 hover:text-yellow-300'
            }`}
          >
            {isFollowed ? '✓ Siguiendo' : '+ Seguir'}
          </button>
        </div>
      </div>

      {/* Locked VIP teaser */}
      {_locked ? (
        <div className="rounded-xl border border-yellow-800/30 bg-yellow-950/20 px-4 py-3 flex items-center gap-3">
          <span className="text-xl">🔒</span>
          <div>
            <p className="text-xs font-semibold text-yellow-300">Pronóstico VIP</p>
            <p className="text-xs text-gray-500">Desbloquea esta carrera para ver las marcas</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          {[...marks].sort((a, b) => a.preferenceOrder - b.preferenceOrder).map(mark => {
            const cfg = LABEL_CFG[mark.label];
            return (
              <div
                key={mark.preferenceOrder}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${cfg.bg} ${cfg.border}`}
              >
                <span className="shrink-0 w-5 h-5 rounded-full bg-gray-700/80 flex items-center justify-center text-xs font-bold text-gray-300">
                  {mark.preferenceOrder}
                </span>
                {mark.dorsalNumber != null && (
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-bold text-white">
                    {mark.dorsalNumber}
                  </span>
                )}
                <span className={`flex-1 text-sm font-semibold truncate ${cfg.color}`}>
                  {mark.horseName}
                </span>
                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                  {LABEL_CFG[mark.label].emoji} {mark.label}
                </span>
              </div>
            );
          })}
          {marks.filter(m => m.note).map(m => (
            <p key={m.preferenceOrder} className="text-xs text-gray-500 italic px-1">
              · {m.horseName}: {m.note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-mono border ${
      accent
        ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700/40'
        : 'bg-gray-800 text-gray-400 border-gray-700'
    }`}>
      {label} {value}
    </span>
  );
}
