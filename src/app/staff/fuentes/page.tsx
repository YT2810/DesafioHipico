'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { KNOWN_SOURCES } from '@/lib/knownSources';

const GOLD = '#D4AF37';
const PLATFORMS = ['YouTube', 'X', 'Instagram', 'Telegram', 'Revista', 'Otro'];

interface SourceStatus {
  _id: string;
  name: string;
  platform: string;
  handle: string | null;
  link: string | null;
  youtubeChannelUrl: string | null;
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

interface EditState { name: string; platform: string; handle: string; link: string; youtubeChannelUrl: string; }

interface SourceCardProps {
  s: SourceStatus;
  editing: boolean;
  editState: EditState;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onChange: (s: EditState) => void;
  saving: boolean;
  saveError: string;
  rightSlot: React.ReactNode;
}

function SourceCard({ s, editing, editState, onEdit, onCancel, onSave, onChange, saving, saveError, rightSlot }: SourceCardProps) {
  const borderCls = s.hasForecastForMeeting ? 'bg-green-950/25 border-green-700/50' : 'bg-yellow-950/10 border-yellow-800/30';
  const icon = s.hasForecastForMeeting ? '✅' : '🟡';

  if (editing) {
    return (
      <div className="rounded-xl px-4 py-3 border border-yellow-600/60 bg-yellow-950/20 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase">Nombre</label>
            <input value={editState.name} onChange={e => onChange({ ...editState, name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-600" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase">Plataforma</label>
            <select value={editState.platform} onChange={e => onChange({ ...editState, platform: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-yellow-600">
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase">Handle (sin @)</label>
            <input value={editState.handle} onChange={e => onChange({ ...editState, handle: e.target.value })}
              placeholder="nombredelcanal"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 uppercase">URL canal YouTube</label>
            <input value={editState.youtubeChannelUrl} onChange={e => onChange({ ...editState, youtubeChannelUrl: e.target.value })}
              placeholder="https://www.youtube.com/@canal"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600" />
            <p className="text-[10px] text-gray-600">Solo el canal, NO un video específico</p>
          </div>
        </div>
        {saveError && <p className="text-xs text-red-400">{saveError}</p>}
        <div className="flex gap-2">
          <button onClick={onSave} disabled={saving}
            className="text-xs font-bold text-black px-4 py-1.5 rounded-lg disabled:opacity-50"
            style={{ backgroundColor: GOLD }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={onCancel} className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${borderCls}`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-base shrink-0">{icon}</span>
        <div className="min-w-0">
          <span className="text-sm font-semibold text-white">{s.name}</span>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-500">{s.platform}</span>
            {s.handle && <span className="text-xs text-sky-400">@{s.handle}</span>}
            {s.youtubeChannelUrl
              ? <a href={s.youtubeChannelUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:text-green-400 truncate max-w-[160px]">{s.youtubeChannelUrl.replace('https://www.youtube.com/', '')}</a>
              : s.platform === 'YouTube' && <span className="text-xs text-red-500/70 italic">Sin URL de canal</span>}
            {!s.hasForecastForMeeting && s.totalForecasts > 0 && <span className="text-xs text-gray-600">{s.totalForecasts} pronóst. totales</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={onEdit} className="text-xs text-gray-500 hover:text-yellow-400 transition-colors px-2 py-1 rounded-lg border border-gray-700/50 hover:border-yellow-700/50">
          ✏️
        </button>
        {rightSlot}
      </div>
    </div>
  );
}

export default function SourcesPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', platform: '', handle: '', link: '', youtubeChannelUrl: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    // Fetch recent meetings (past + upcoming) sorted newest first
    fetch('/api/meetings/recent?limit=20')
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

  function startEdit(s: SourceStatus) {
    setEditingId(s._id);
    setEditState({ name: s.name, platform: s.platform, handle: s.handle ?? '', link: s.link ?? '', youtubeChannelUrl: s.youtubeChannelUrl ?? '' });
    setSaveError('');
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/admin/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: id, ...editState }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error ?? 'Error al guardar'); return; }
      setSources(prev => prev.map(s => s._id === id
        ? { ...s, name: data.source.name, platform: data.source.platform, handle: data.source.handle, link: data.source.link, youtubeChannelUrl: data.source.youtubeChannelUrl }
        : s
      ));
      setEditingId(null);
    } catch { setSaveError('Error de red'); }
    finally { setSaving(false); }
  }

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
            <div className="text-gray-500 mt-0.5">con pronósticos</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex-1 text-center">
            <div className="text-2xl font-bold text-yellow-400">{pendingSources.length}</div>
            <div className="text-gray-500 mt-0.5">en DB, sin subir</div>
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
          <h2 className="text-xs font-bold text-green-500 uppercase tracking-wide">✅ Con pronósticos esta reunión ({uploadedSources.length})</h2>
          {uploadedSources.map((s) => (
            <SourceCard key={s._id} s={s}
              editing={editingId === s._id} editState={editState}
              onEdit={() => startEdit(s)}
              onCancel={() => setEditingId(null)}
              onSave={() => saveEdit(s._id)}
              onChange={setEditState}
              saving={saving} saveError={saveError}
              rightSlot={<span className="text-sm font-bold text-green-400 shrink-0">{s.forecastCountForMeeting} C</span>}
            />
          ))}
        </div>
      )}

      {/* ── Section 2: In DB but no forecast for this meeting ── */}
      {!loading && pendingSources.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-yellow-600 uppercase tracking-wide mt-2">🟡 En DB — sin pronóstico esta reunión ({pendingSources.length})</h2>
          {pendingSources.map((s) => (
            <SourceCard key={s._id} s={s}
              editing={editingId === s._id} editState={editState}
              onEdit={() => startEdit(s)}
              onCancel={() => setEditingId(null)}
              onSave={() => saveEdit(s._id)}
              onChange={setEditState}
              saving={saving} saveError={saveError}
              rightSlot={
                <Link href="/admin/intelligence" className="text-xs font-bold text-black px-3 py-1.5 rounded-lg shrink-0" style={{ backgroundColor: GOLD }}>Subir</Link>
              }
            />
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
