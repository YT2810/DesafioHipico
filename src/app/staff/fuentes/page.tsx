'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { KNOWN_SOURCES } from '@/lib/knownSources';

const GOLD = '#D4AF37';

interface SourceStatus {
  _id: string;
  name: string;
  platform: string;
  handle: string | null;
  link: string | null;
  isVerified: boolean;
  isGhost: boolean;
  totalForecasts: number;
  lastPublishedAt: string | null;
  hasForecastForMeeting: boolean;
  forecastCountForMeeting: number;
}

interface Meeting {
  _id: string;
  meetingNumber: number;
  date: string;
  trackName: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'bg-red-900/40 text-red-300 border-red-700',
  media: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  baja: 'bg-gray-800 text-gray-400 border-gray-700',
};

export default function SourcesPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    fetch('/api/meetings/upcoming?limit=10')
      .then(r => r.json())
      .then(d => {
        const list = d.meetings ?? [];
        setMeetings(list);
        if (list.length > 0) setSelectedMeetingId(list[0]._id);
      });
  }, []);

  useEffect(() => {
    if (!selectedMeetingId) return;
    setLoading(true);
    fetch(`/api/admin/sources?meetingId=${selectedMeetingId}`)
      .then(r => r.json())
      .then(d => setSources(d.sources ?? []))
      .finally(() => setLoading(false));
  }, [selectedMeetingId]);

  // DB sources sorted: uploaded first, then pending
  const uploadedSources = sources.filter(s => s.hasForecastForMeeting);
  const pendingSources  = sources.filter(s => !s.hasForecastForMeeting);

  // Known sources NOT yet in DB at all
  function matchesKnown(s: SourceStatus, k: (typeof KNOWN_SOURCES)[0]): boolean {
    const sName = s.name.toLowerCase();
    const allNames = [k.name, ...(k.aliases ?? [])].map(n => n.toLowerCase());
    if (allNames.some(n => sName === n || sName.includes(n) || n.includes(sName))) return true;
    if (k.handle && s.handle?.toLowerCase() === k.handle.toLowerCase()) return true;
    if (k.link && s.link && s.link.toLowerCase().includes(k.link.toLowerCase().replace('https://www.youtube.com/@', ''))) return true;
    return false;
  }
  const neverIngestedKnown = KNOWN_SOURCES.filter(k => !sources.some(s => matchesKnown(s, k)));

  const selectedMeeting = meetings.find(m => m._id === selectedMeetingId);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/intelligence" className="text-xs text-gray-500 hover:text-gray-300">← Ingestor IA</Link>
          <h1 className="text-xl font-bold text-white mt-1">Catálogo de Fuentes</h1>
          <p className="text-xs text-gray-500 mt-0.5">Estado de ingesta por reunión</p>
        </div>
        <Link
          href="/admin/intelligence"
          className="text-xs font-bold text-black px-4 py-2 rounded-xl"
          style={{ backgroundColor: GOLD }}
        >
          + Ingestar
        </Link>
      </div>

      {/* Meeting selector */}
      <div className="space-y-1">
        <label className="text-xs text-gray-500 uppercase tracking-wide">Reunión</label>
        <select
          value={selectedMeetingId}
          onChange={e => setSelectedMeetingId(e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
        >
          {meetings.map(m => (
            <option key={m._id} value={m._id}>
              {m.trackName} · Reunión {m.meetingNumber} · {new Date(m.date).toLocaleDateString('es-VE')}
            </option>
          ))}
        </select>
      </div>

      {/* Stats bar */}
      {selectedMeeting && !loading && (
        <div className="flex gap-3 text-xs">
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
            <div className="text-2xl font-bold text-green-400">{uploadedSources.length}</div>
            <div className="text-gray-500 mt-0.5">subidas hoy</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
            <div className="text-2xl font-bold text-yellow-400">{pendingSources.length}</div>
            <div className="text-gray-500 mt-0.5">en DB, sin subir hoy</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
            <div className="text-2xl font-bold text-gray-500">{neverIngestedKnown.length}</div>
            <div className="text-gray-500 mt-0.5">nunca ingestadas</div>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-gray-600 text-sm">Cargando...</div>}

      {/* ── Section 1: Uploaded for this meeting ── */}
      {!loading && uploadedSources.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-green-500 uppercase tracking-wide">✅ Subidas esta reunión ({uploadedSources.length})</h2>
          {uploadedSources.map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3 border bg-green-950/25 border-green-700/50">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">✅</span>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-white">{s.name}</span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500">{s.platform}</span>
                    {s.handle && <span className="text-xs text-sky-400">@{s.handle}</span>}
                  </div>
                </div>
              </div>
              <span className="text-sm font-bold text-green-400 shrink-0">{s.forecastCountForMeeting} C</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Section 2: In DB but no forecast for this meeting ── */}
      {!loading && pendingSources.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-yellow-600 uppercase tracking-wide mt-2">🟡 En DB — sin pronóstico hoy ({pendingSources.length})</h2>
          {pendingSources.map((s, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3 border bg-yellow-950/10 border-yellow-800/30">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base">🟡</span>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-white">{s.name}</span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500">{s.platform}</span>
                    {s.handle && <span className="text-xs text-sky-400">@{s.handle}</span>}
                    <span className="text-xs text-gray-600">{s.totalForecasts} pronóst. totales</span>
                  </div>
                </div>
              </div>
              <Link href="/admin/intelligence" className="text-xs font-bold text-black px-3 py-1.5 rounded-lg shrink-0" style={{ backgroundColor: GOLD }}>
                Subir
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── Section 3: Known sources never ingested at all ── */}
      {!loading && neverIngestedKnown.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-2">⚪ Nunca ingestadas ({neverIngestedKnown.length})</h2>
          {neverIngestedKnown.map((k, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3 border bg-gray-900 border-gray-800">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base">⚪</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white">{k.name}</span>
                    <span className={`text-xs border rounded px-1.5 py-0.5 leading-none shrink-0 ${PRIORITY_COLORS[k.priority]}`}>{k.priority}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {k.handle && <a href={`https://x.com/${k.handle}`} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:underline">𝕏 @{k.handle}</a>}
                    {k.link && <a href={k.link} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:underline">▶ YouTube</a>}
                    {k.note && <span className="text-xs text-gray-600 italic">{k.note}</span>}
                  </div>
                </div>
              </div>
              <Link href="/admin/intelligence" className="text-xs font-bold text-black px-3 py-1.5 rounded-lg shrink-0" style={{ backgroundColor: GOLD }}>
                Subir
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
