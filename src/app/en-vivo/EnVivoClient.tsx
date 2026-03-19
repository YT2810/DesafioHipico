'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';
const REFRESH_MS = 60_000;

interface HorseRow {
  dorsal: number;
  name: string;
  jockey: string;
  odds: number | null;
  finishPos: number | null;
  officialTime: string | null;
  isScratched: boolean;
}

interface RaceRow {
  raceNumber: number;
  distance: number;
  scheduledTime: string;
  status: string;
  games: string[];
  hasResults: boolean;
  horses: HorseRow[];
}

interface MeetingInfo {
  id: string;
  meetingNumber: number;
  date: string;
  status: string;
  trackName: string;
  streamUrl: string | null;
  summaryVideoUrl: string | null;
}

// ── Embed detector ─────────────────────────────────────────────────────────
function buildEmbedUrl(raw: string): { type: 'youtube' | 'telegram' | 'vk' | 'iframe'; url: string } | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);

    // YouTube: watch?v=ID or youtu.be/ID or /live/ID
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let vid = '';
      if (u.hostname.includes('youtu.be')) vid = u.pathname.slice(1).split('?')[0];
      else if (u.pathname.startsWith('/live/')) vid = u.pathname.replace('/live/', '').split('?')[0];
      else vid = u.searchParams.get('v') ?? '';
      if (!vid) return null;
      return { type: 'youtube', url: `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0` };
    }

    // Telegram: t.me/+hash or t.me/channel/postId
    if (u.hostname === 't.me' || u.hostname === 'telegram.me') {
      // Telegram doesn't allow embedding streams — we show a link button instead
      return { type: 'telegram', url: raw };
    }

    // VK Video: vk.com/video-XXXXX_YYYYY or vk.com/video?z=video...
    if (u.hostname.includes('vk.com')) {
      // vk.com/video-OID_VID  →  embed: vkvideo.ru/video_ext.php?oid=-OID&id=VID&hd=2
      const pathMatch = u.pathname.match(/^\/video(-?\d+)_(\d+)/);
      if (pathMatch) {
        return { type: 'vk', url: `https://vkvideo.ru/video_ext.php?oid=${pathMatch[1]}&id=${pathMatch[2]}&hd=2&autoplay=1` };
      }
      // vk.com/video?z=video-OID_VID
      const z = u.searchParams.get('z') ?? '';
      const zMatch = z.match(/video(-?\d+)_(\d+)/);
      if (zMatch) {
        return { type: 'vk', url: `https://vkvideo.ru/video_ext.php?oid=${zMatch[1]}&id=${zMatch[2]}&hd=2&autoplay=1` };
      }
      // vkvideo.ru direct
      return { type: 'iframe', url: raw };
    }

    // Generic iframe fallback
    return { type: 'iframe', url: raw };
  } catch {
    return null;
  }
}

// ── Position badge ──────────────────────────────────────────────────────────
function PosBadge({ pos }: { pos: number }) {
  const colors: Record<number, string> = {
    1: 'bg-yellow-500 text-black',
    2: 'bg-gray-400 text-black',
    3: 'bg-amber-700 text-white',
  };
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold ${colors[pos] ?? 'bg-gray-700 text-gray-300'}`}>
      {pos}
    </span>
  );
}

// ── Race card ───────────────────────────────────────────────────────────────
function RaceCard({ race, isActive }: { race: RaceRow; isActive: boolean }) {
  const [open, setOpen] = useState(isActive);
  const active = race.horses.filter(h => !h.isScratched);
  const sorted = race.hasResults
    ? [...active].sort((a, b) => (a.finishPos ?? 99) - (b.finishPos ?? 99))
    : [...active].sort((a, b) => a.dorsal - b.dorsal);

  return (
    <div className={`rounded-2xl border transition-colors ${isActive ? 'border-yellow-700/60 bg-yellow-950/10' : 'border-gray-800 bg-gray-900'}`}>
      {/* header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm text-black"
          style={{ backgroundColor: GOLD }}
        >
          {race.raceNumber}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">
            Carrera {race.raceNumber}
            {race.scheduledTime && <span className="ml-2 text-xs text-gray-500 font-normal">{race.scheduledTime}</span>}
          </p>
          <p className="text-[11px] text-gray-500">
            {race.distance}m
            {race.games.length > 0 && <span className="ml-1">· {race.games.join(', ')}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {race.hasResults && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-950/50 border border-green-800/40 text-green-400">Resultados</span>}
          {isActive && !race.hasResults && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-950/50 border border-yellow-700/40 text-yellow-400 animate-pulse">En carrera</span>}
          <span className="text-gray-600 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-800 px-3 pb-3 pt-2 space-y-1">
          {/* column headers */}
          <div className="flex items-center gap-2 px-1 mb-1.5">
            <span className="w-5 text-[10px] text-gray-600 font-bold">#</span>
            <span className="flex-1 text-[10px] text-gray-600 font-bold uppercase">Ejemplar</span>
            <span className="w-16 text-right text-[10px] text-gray-600 font-bold">Jinete</span>
            {!race.hasResults && <span className="w-10 text-right text-[10px] text-gray-600 font-bold">Línea</span>}
            {race.hasResults && <span className="w-12 text-right text-[10px] text-gray-600 font-bold">Tiempo</span>}
          </div>

          {sorted.map(h => (
            <div key={h.dorsal} className={`flex items-center gap-2 px-1 py-1 rounded-lg ${h.finishPos === 1 ? 'bg-yellow-950/30' : ''}`}>
              <span className="w-5 shrink-0">
                {h.finishPos ? <PosBadge pos={h.finishPos} /> : (
                  <span className="text-[11px] font-bold text-gray-500">{h.dorsal}</span>
                )}
              </span>
              <span className={`flex-1 text-xs font-semibold truncate ${h.isScratched ? 'line-through text-gray-600' : 'text-gray-200'}`}>
                {h.name}
              </span>
              <span className="w-16 text-right text-[10px] text-gray-500 truncate shrink-0">{h.jockey.split(' ')[0]}</span>
              {!race.hasResults && (
                <span className="w-10 text-right text-[11px] font-bold shrink-0" style={{ color: h.odds !== null ? GOLD : '#4B5563' }}>
                  {h.odds !== null ? `${h.odds}` : '—'}
                </span>
              )}
              {race.hasResults && (
                <span className="w-12 text-right text-[10px] text-gray-400 shrink-0 font-mono">
                  {h.officialTime ?? '—'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function EnVivoClient() {
  const [meeting, setMeeting] = useState<MeetingInfo | null>(null);
  const [races, setRaces] = useState<RaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeRace, setActiveRace] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/en-vivo', { cache: 'no-store' });
      const d = await res.json();
      if (d.meeting) setMeeting(d.meeting);
      if (d.races) {
        setRaces(d.races);
        // Find active race
        const active = d.races.find((r: RaceRow) => r.status === 'active');
        if (active) setActiveRace(active.raceNumber);
      }
      setLastUpdate(new Date());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const embed = meeting?.streamUrl ? buildEmbedUrl(meeting.streamUrl) : null;

  const dt = meeting ? new Date(meeting.date) : null;
  const dateStr = dt ? dt.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* ── Header ── */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <Link href="/" className="text-[11px] text-gray-500 hover:text-yellow-500 transition-colors">← Desafío Hípico</Link>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <h1 className="text-xl font-black text-white">EN VIVO</h1>
            <span className="text-sm text-gray-400">· INH · {meeting?.trackName ?? 'La Rinconada'}</span>
          </div>
          {meeting && (
            <p className="text-xs text-gray-500 mt-0.5 capitalize">
              Reunión {meeting.meetingNumber} · {dateStr}
              {lastUpdate && (
                <span className="ml-2 text-gray-700">· actualizado {lastUpdate.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* ── Stream embed or placeholder ── */}
        {loading ? (
          <div className="w-full aspect-video rounded-2xl bg-gray-900 animate-pulse" />
        ) : embed ? (
          <div className="w-full">
            {(embed.type === 'youtube' || embed.type === 'vk' || embed.type === 'iframe') && (
              <div className="relative w-full rounded-2xl overflow-hidden bg-black" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src={embed.url}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                  allow="autoplay; encrypted-media; picture-in-picture"
                  title="Transmisión en vivo INH"
                />
              </div>
            )}
            {embed.type === 'telegram' && (
              <a
                href={embed.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center w-full aspect-video rounded-2xl bg-blue-950/30 border border-blue-800/40 hover:border-blue-600/60 transition-colors gap-3"
              >
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="24" fill="#229ED9"/>
                  <path d="M10.2 23.4l27-10.4c1.2-.5 2.3.3 1.9 2l-4.6 21.7c-.3 1.5-1.2 1.9-2.4 1.2l-6.6-4.9-3.2 3.1c-.4.4-.7.7-1.4.7l.5-6.8 12.5-11.3c.5-.5-.1-.8-.8-.3L14.7 27.3l-6.5-2c-1.4-.4-1.4-1.4.2-2z" fill="white"/>
                </svg>
                <p className="text-blue-300 font-bold text-sm">Ver transmisión en Telegram</p>
                <p className="text-blue-500 text-xs">Toca para abrir en Telegram</p>
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full aspect-video rounded-2xl bg-gray-900 border border-gray-800 gap-3 text-center px-6">
            <span className="text-4xl">📡</span>
            <p className="text-gray-400 font-semibold text-sm">La transmisión aún no está disponible</p>
            <p className="text-gray-600 text-xs leading-relaxed">
              El INH publica la transmisión los domingos poco antes del inicio de las carreras.<br/>
              Vuelve a revisar en unos minutos.
            </p>
            <button
              onClick={load}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-bold border border-gray-700 text-gray-400 hover:border-yellow-700 hover:text-yellow-400 transition-colors"
            >
              ↻ Verificar ahora
            </button>
          </div>
        )}

        {/* ── No meeting ── */}
        {!loading && !meeting && (
          <div className="text-center py-8 text-gray-600 text-sm">
            No hay reunión programada para hoy.
            <Link href="/retrospectos" className="block mt-2 text-yellow-600 hover:text-yellow-400">Ver historial de reuniones →</Link>
          </div>
        )}

        {/* ── Races banner ── */}
        {races.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Programa · {races.length} carreras</p>
              {lastUpdate && (
                <button onClick={load} className="text-[10px] text-gray-700 hover:text-yellow-600 transition-colors">↻ Actualizar</button>
              )}
            </div>
            {races.map(race => (
              <RaceCard
                key={race.raceNumber}
                race={race}
                isActive={activeRace === race.raceNumber}
              />
            ))}
          </div>
        )}

        {/* ── Links ── */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {meeting && (
            <Link
              href={`/revista/${meeting.id}`}
              className="py-3 rounded-2xl text-sm font-bold text-center border border-gray-700 text-gray-300 hover:border-yellow-700/50 hover:text-yellow-400 transition-colors bg-gray-900"
            >
              📋 Ver revista completa
            </Link>
          )}
          <Link
            href="/resultados"
            className="py-3 rounded-2xl text-sm font-bold text-center border border-gray-700 text-gray-300 hover:border-yellow-700/50 hover:text-yellow-400 transition-colors bg-gray-900"
          >
            🏆 Resultados
          </Link>
          <Link
            href="/traqueos"
            className="py-3 rounded-2xl text-sm font-bold text-center border border-gray-700 text-gray-300 hover:border-yellow-700/50 hover:text-yellow-400 transition-colors bg-gray-900"
          >
            ⏱ Traqueos
          </Link>
          <Link
            href="/retrospectos"
            className="py-3 rounded-2xl text-sm font-bold text-center border border-gray-700 text-gray-300 hover:border-yellow-700/50 hover:text-yellow-400 transition-colors bg-gray-900"
          >
            📚 Retrospectos
          </Link>
        </div>

        {/* ── Disclaimer ── */}
        <p className="text-[10px] text-gray-800 text-center leading-relaxed">
          Desafío Hípico no es responsable de la disponibilidad de la transmisión del INH.
          El stream es propiedad del Instituto Nacional de Hipismo (INH), Venezuela.
        </p>

      </div>
    </div>
  );
}
