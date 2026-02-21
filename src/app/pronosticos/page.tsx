'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ForecastLabel, MARK_POINTS, FIJO_BONUS_POINTS, FREE_RACES_PER_MEETING } from '@/lib/constants';
import NotificationBell from '@/components/NotificationBell';

interface Mark { preferenceOrder: number; horseName: string; dorsalNumber?: number; label: ForecastLabel; note?: string; }
interface HandicapperInfo { id: string; pseudonym: string; pct1st: number; pct2nd: number; pctGeneral: number; contactNumber?: string; }
interface ForecastItem { handicapper: HandicapperInfo; marks: Mark[]; isVip: boolean; _locked?: boolean; }
interface RaceItem { raceId: string; raceNumber: number; distance: number; scheduledTime: string; conditions: string; prizePool: { bs: number; usd: number } | number; forecasts: ForecastItem[]; }
interface MeetingItem { meetingId: string; meetingNumber: number; date: string; trackName: string; races: RaceItem[]; }
interface HorseFactor { horseName: string; dorsalNumber?: number; points: number; factor: number; }

function calcFactors(forecasts: ForecastItem[]): HorseFactor[] {
  const pub = forecasts.filter(f => !f._locked);
  if (!pub.length) return [];
  // Max per forecaster is always 8 (FIJO_BONUS_POINTS) — 1 pronosticador=8, 2=16, etc.
  const maxTotal = pub.length * FIJO_BONUS_POINTS;
  const map = new Map<string, { points: number; dorsalNumber?: number }>();
  for (const fc of pub) {
    for (const m of fc.marks) {
      const key = m.horseName.toUpperCase();
      const isFijo = fc.marks.length === 1 && m.label === 'Línea';
      const pts = isFijo ? FIJO_BONUS_POINTS : (MARK_POINTS[m.preferenceOrder] ?? 1);
      const prev = map.get(key);
      map.set(key, { points: (prev?.points ?? 0) + pts, dorsalNumber: prev?.dorsalNumber ?? m.dorsalNumber });
    }
  }
  return [...map.entries()]
    .map(([horseName, { points, dorsalNumber }]) => ({ horseName, dorsalNumber, points, factor: maxTotal > 0 ? points / maxTotal : 0 }))
    .sort((a, b) => b.factor - a.factor);
}

const LABEL_CFG: Record<string, { color: string; bg: string; border: string; emoji: string }> = {
  '':               { color: 'text-gray-500',   bg: 'bg-gray-800/30',    border: 'border-gray-700',   emoji: '' },
  'Línea':          { color: 'text-gray-300',   bg: 'bg-gray-700/50',    border: 'border-gray-600',   emoji: '📌' },
  'Casi Fijo':      { color: 'text-blue-300',   bg: 'bg-blue-900/40',   border: 'border-blue-700',   emoji: '🔵' },
  'Súper Especial': { color: 'text-yellow-300', bg: 'bg-yellow-900/40', border: 'border-yellow-600', emoji: '⭐' },
  'Buen Dividendo': { color: 'text-green-300',  bg: 'bg-green-900/40',  border: 'border-green-700',  emoji: '💰' },
  'Batacazo':       { color: 'text-orange-300', bg: 'bg-orange-900/40', border: 'border-orange-600', emoji: '🔥' },
};
const getLabelCfg = (label?: string) => LABEL_CFG[label ?? ''] ?? LABEL_CFG[''];
const GOLD = '#D4AF37';

// ── API meeting shape ──────────────────────────────────────────────────────
interface ApiMeeting { id: string; meetingNumber: number; date: string; trackName: string; raceCount: number; }

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
              const cfg = getLabelCfg(m.label);
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
                const cfg = getLabelCfg(mark.label);
                const isFijo = marks.length === 1 && mark.label === 'Línea';
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
          <p className="text-xs text-gray-600 mt-0.5">{race.conditions}{typeof race.prizePool === 'object' && race.prizePool.bs ? ` · Premio Bs. ${race.prizePool.bs.toLocaleString()}` : typeof race.prizePool === 'number' && race.prizePool > 0 ? ` · Premio Bs. ${race.prizePool.toLocaleString()}` : ''}</p>
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
  const { data: session, status } = useSession();
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [selectedRaceNumber, setSelectedRaceNumber] = useState<number | null>(null);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());

  // Real data state
  const [apiMeetings, setApiMeetings] = useState<ApiMeeting[]>([]);
  const [meeting, setMeeting] = useState<MeetingItem | null>(null);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [loadingMeeting, setLoadingMeeting] = useState(false);
  const [freeRemaining, setFreeRemaining] = useState(FREE_RACES_PER_MEETING);

  const user = session?.user as any;
  const roles: string[] = user?.roles ?? [];
  const goldBalance = user?.balance?.golds ?? 0;
  const isPrivileged = roles.some(r => ['admin', 'staff', 'handicapper'].includes(r));

  // Load meetings list
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/meetings/upcoming?limit=10')
      .then(r => r.json())
      .then(d => {
        const meetings: ApiMeeting[] = d.meetings ?? [];
        setApiMeetings(meetings);
        if (meetings.length > 0) setSelectedMeetingId(meetings[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingMeetings(false));
  }, [status]);

  // Load races + forecasts when meeting changes
  const loadMeeting = useCallback(async (meetingId: string) => {
    if (!meetingId) return;
    setLoadingMeeting(true);
    setSelectedRaceNumber(null);
    try {
      const userId = (session?.user as any)?.id ?? '';
      const [racesRes, forecastsRes] = await Promise.all([
        fetch(`/api/meetings/${meetingId}/races`).then(r => r.json()),
        fetch(`/api/forecasts?meetingId=${meetingId}&userId=${userId}`).then(r => r.json()),
      ]);

      const races: any[] = racesRes.races ?? [];
      const forecastsByRace: Record<string, { access: any; forecasts: any[] }> = forecastsRes.races ?? {};
      setFreeRemaining(forecastsRes.freeRemaining ?? FREE_RACES_PER_MEETING);

      const apiMeeting = apiMeetings.find(m => m.id === meetingId);
      const meetingDate = apiMeeting ? new Date(apiMeeting.date).toLocaleDateString('es-VE') : '';

      const raceItems: RaceItem[] = races.map(r => {
        const raceData = forecastsByRace[r.id] ?? { access: { unlocked: true, free: true }, forecasts: [] };
        const forecasts: ForecastItem[] = raceData.forecasts.map((f: any) => ({
          handicapper: {
            id: f.handicapperId?._id ?? f.handicapperId ?? '',
            pseudonym: f.handicapperId?.pseudonym ?? 'Handicapper',
            pct1st: f.handicapperId?.stats?.pct1st ?? 0,
            pct2nd: f.handicapperId?.stats?.pct2nd ?? 0,
            pctGeneral: f.handicapperId?.stats?.pctGeneral ?? 0,
            contactNumber: f.handicapperId?.contactNumber,
          },
          marks: f.marks ?? [],
          isVip: f.isVip ?? false,
          _locked: f._locked ?? false,
        }));
        return {
          raceId: r.id,
          raceNumber: r.raceNumber,
          distance: r.distance,
          scheduledTime: r.scheduledTime,
          conditions: r.conditions,
          prizePool: r.prizePool,
          forecasts,
          _access: raceData.access,
        } as RaceItem & { _access: any };
      });

      setMeeting({
        meetingId,
        meetingNumber: apiMeeting?.meetingNumber ?? 0,
        date: meetingDate,
        trackName: apiMeeting?.trackName ?? 'Hipódromo',
        races: raceItems,
      });
    } catch {
      setMeeting(null);
    } finally {
      setLoadingMeeting(false);
    }
  }, [apiMeetings, session]);

  useEffect(() => {
    if (selectedMeetingId) loadMeeting(selectedMeetingId);
  }, [selectedMeetingId, loadMeeting]);

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
        <header className="border-b border-gray-800 px-4 py-3">
          <div className="mx-auto max-w-lg flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-white text-lg leading-none">←</Link>
            <span className="text-sm font-bold text-white">🏇 Pronósticos</span>
          </div>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-6">
          <div>
            <div className="text-5xl mb-4">🔐</div>
            <h2 className="text-xl font-bold text-white mb-2">Inicia sesión para ver los pronósticos</h2>
            <p className="text-sm text-gray-500 max-w-xs">
              Las 2 primeras carreras de cada reunión son gratis. El resto se desbloquea con Golds.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Link href="/auth/signin"
              className="w-full py-3.5 rounded-2xl text-base font-bold text-black text-center"
              style={{ backgroundColor: '#D4AF37' }}>
              Entrar
            </Link>
            <Link href="/auth/signin?mode=register"
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-gray-300 bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors text-center">
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function isRaceUnlocked(raceId: string, idx: number) {
    if (isPrivileged) return true;
    if (idx < FREE_RACES_PER_MEETING) return true;
    // Access comes from server-side access map
    const race = meeting?.races[idx];
    return (race as any)?._access?.unlocked ?? false;
  }

  function handleUnlock(_raceId: string) {
    // Gold unlock is handled server-side via forecastAccessService
    // Reload the meeting data to reflect new access
    if (selectedMeetingId) loadMeeting(selectedMeetingId);
  }
  function toggleFollow(id: string) {
    setFollowedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const races = meeting?.races ?? [];
  const selectedRace = selectedRaceNumber != null ? races.find(r => r.raceNumber === selectedRaceNumber) ?? null : null;
  const selectedRaceIdx = selectedRace ? races.findIndex(r => r.raceId === selectedRace.raceId) : -1;
  const selectedUnlocked = selectedRace ? isRaceUnlocked(selectedRace.raceId, selectedRaceIdx) : false;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm font-medium transition-colors shrink-0">
              <span className="text-base leading-none">←</span>
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-white truncate">🏇 Pronósticos</h1>
              <p className="text-xs text-gray-500 truncate">{meeting?.trackName ?? '—'} · Reunión {meeting?.meetingNumber ?? '—'} · {meeting?.date ?? ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isPrivileged && (
              <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-2.5 py-1.5">
                <span className="text-sm">🪙</span>
                <span className="text-sm font-bold" style={{ color: GOLD }}>{goldBalance}</span>
              </div>
            )}
            <NotificationBell />
            <Link href="/perfil"
              className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 hover:border-yellow-600 flex items-center justify-center transition-colors"
              title="Mi perfil">
              <span className="text-sm">👤</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-4">
        {/* Meeting selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {loadingMeetings ? (
            <div className="flex gap-2">{[1,2,3].map(i => <div key={i} className="shrink-0 w-20 h-14 rounded-xl bg-gray-900 animate-pulse" />)}</div>
          ) : apiMeetings.length === 0 ? (
            <p className="text-xs text-gray-600 italic py-2">Sin reuniones próximas</p>
          ) : apiMeetings.map(m => (
            <button key={m.id}
              onClick={() => { setSelectedMeetingId(m.id); setSelectedRaceNumber(null); }}
              className={`shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${selectedMeetingId === m.id ? 'text-black border-yellow-600' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'}`}
              style={selectedMeetingId === m.id ? { backgroundColor: GOLD } : {}}>
              <span className="font-bold text-sm">R{m.meetingNumber}</span>
              <span className="opacity-80">{new Date(m.date).toLocaleDateString('es-VE', { day:'2-digit', month:'2-digit' })}</span>
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
        {/* Race buttons */}
        <div>
          <p className="text-xs text-gray-600 mb-2 font-medium uppercase tracking-wide">Selecciona una carrera</p>
          {loadingMeeting ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {[...Array(11)].map((_,i) => <div key={i} className="h-14 rounded-xl bg-gray-900 animate-pulse" />)}
            </div>
          ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {races.map((race, idx) => {
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
          )}
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
