'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Meeting { id: string; meetingNumber: number; date: string; trackName?: string; }
type DiffStatus = 'match' | 'similar' | 'missing' | 'extra';
interface DiffMark { preferenceOrder: number; horseName: string; dorsalNumber?: number; label?: string; rawLabel?: string; status: DiffStatus; matchedWith?: string; confidence: number; }
interface RaceDiff { raceNumber: number; raceId: string | null; dbMarks: DiffMark[]; extractedMarks: DiffMark[]; matchScore: number; hasDbData: boolean; }
interface VideoResult { videoId: string; title: string; videoUrl: string; publishedAt: string; transcriptAvailable: boolean; expertNames: string[]; diffs: RaceDiff[]; globalMatchScore: number; racesExtracted: number; }
interface ShadowResult { success: boolean; channelId?: string; meetingLabel: string; videos: VideoResult[]; overallMatchScore: number | null; message?: string; }
interface AccumEntry { channelUrl: string; channelLabel: string; result: ShadowResult; }

const KNOWN_CHANNELS = [
  { name: 'Guardi', url: 'https://www.youtube.com/@guardi19' },
  { name: 'Javier Flores', url: 'https://www.youtube.com/@JavierFlores-f4x1o' },
  { name: 'Braulio Inciarte', url: 'https://www.youtube.com/@BraulioInciarteTV' },
  { name: 'Omar/Jaime Aponte', url: 'https://www.youtube.com/@HipismosAlGalope2' },
  { name: 'Pirela Espina', url: 'https://www.youtube.com/@LeoPirelaVip' },
  { name: 'Enio Valbuena', url: 'https://www.youtube.com/@ValbuenaEnioLaRinconada1' },
  { name: 'Bob Lovera', url: 'https://www.youtube.com/@BobLoveraTVOficial' },
  { name: 'Rasevi', url: 'https://www.youtube.com/@raseviarrollador5015' },
  { name: 'Científico Hípico', url: 'https://www.youtube.com/@ecancro' },
  { name: 'Línea Brava', url: 'https://www.youtube.com/@lineabrava8346' },
  { name: 'Certeza Hípica', url: 'https://www.youtube.com/@certezahipicasports' },
  { name: 'Uruguayo Rinconada', url: 'https://www.youtube.com/@URUGUAYOENLARINCONADA2' },
  { name: 'Cordialito', url: 'https://www.youtube.com/@Cordialitola' },
  { name: 'Darío Piccinini', url: 'https://www.youtube.com/@dariopiccinini' },
  { name: 'Marcos Ysea', url: 'https://www.youtube.com/@Marcosysea2' },
  { name: 'DimensiónHípica', url: 'https://www.youtube.com/@dimensionhipicatv' },
  { name: 'Alfredo Iglesias', url: 'https://www.youtube.com/@cosasdeiglesiastv' },
];

function scoreColor(s: number) { return s >= 85 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : 'text-red-400'; }
function scoreBorder(s: number) { return s >= 85 ? 'border-green-700/40' : s >= 60 ? 'border-yellow-700/40' : 'border-red-700/40'; }

function StatusBadge({ status }: { status: DiffStatus }) {
  const map: Record<DiffStatus, [string, string]> = {
    match:   ['text-green-400 bg-green-900/40', '✓ OK'],
    similar: ['text-yellow-400 bg-yellow-900/40', '≈ SIM'],
    missing: ['text-red-400 bg-red-900/40', '✗ FALTA'],
    extra:   ['text-blue-400 bg-blue-900/40', '+ EXTRA'],
  };
  const [cls, label] = map[status];
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${cls}`}>{label}</span>;
}

function RaceDiffRow({ diff }: { diff: RaceDiff }) {
  const [open, setOpen] = useState(!diff.hasDbData || diff.matchScore < 90);
  return (
    <div className="border border-gray-700/40 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-2 bg-gray-800/50 hover:bg-gray-800 transition-colors text-left">
        <span className="text-xs font-bold text-gray-400 w-16 shrink-0">C{diff.raceNumber}</span>
        {diff.hasDbData
          ? <span className={`text-sm font-bold ${scoreColor(diff.matchScore)}`}>{diff.matchScore}%</span>
          : <span className="text-xs text-blue-400 italic">Sin data en DB</span>}
        <span className="ml-auto text-gray-600 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="grid grid-cols-2 divide-x divide-gray-700/40 text-xs">
          <div className="px-3 py-3 space-y-1.5">
            <p className="text-[10px] font-bold text-gray-600 uppercase mb-2">DB (manual)</p>
            {diff.dbMarks.length === 0
              ? <p className="text-gray-600 italic">Sin pronóstico</p>
              : diff.dbMarks.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 min-w-0">
                  <span className="text-gray-600 w-5 shrink-0">{m.preferenceOrder}°</span>
                  {m.dorsalNumber != null && <span className="text-gray-500 w-5 shrink-0">{m.dorsalNumber}</span>}
                  <span className="text-gray-200 flex-1 truncate">{m.horseName}</span>
                  {m.label && <span className="text-yellow-400 shrink-0">{m.label}</span>}
                  <StatusBadge status={m.status} />
                </div>
              ))}
          </div>
          <div className="px-3 py-3 space-y-1.5">
            <p className="text-[10px] font-bold text-gray-600 uppercase mb-2">Auto (extraído)</p>
            {diff.extractedMarks.length === 0
              ? <p className="text-gray-600 italic">No detectado</p>
              : diff.extractedMarks.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 min-w-0">
                  <span className="text-gray-600 w-5 shrink-0">{m.preferenceOrder}°</span>
                  {m.dorsalNumber != null && <span className="text-gray-500 w-5 shrink-0">{m.dorsalNumber}</span>}
                  <span className="text-gray-200 flex-1 truncate">{m.horseName}</span>
                  {m.rawLabel && <span className="text-yellow-400 shrink-0">{m.rawLabel}</span>}
                  <StatusBadge status={m.status} />
                  {m.status === 'similar' && m.matchedWith && (
                    <span className="text-gray-500 truncate hidden sm:block text-[10px]">≈{m.matchedWith}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VideoCard({ video }: { video: VideoResult }) {
  const [expanded, setExpanded] = useState(video.transcriptAvailable && video.globalMatchScore < 90);
  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden ${scoreBorder(video.globalMatchScore)}`}>
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <a href={video.videoUrl} target="_blank" rel="noopener noreferrer"
            className="text-sm font-semibold text-white hover:text-yellow-300 transition-colors line-clamp-2 block">
            ▶ {video.title}
          </a>
          <p className="text-xs text-gray-500 mt-1">
            {new Date(video.publishedAt).toLocaleDateString('es-VE', { weekday:'short', day:'numeric', month:'short' })}
            {video.expertNames.length > 0 && <span className="ml-2 text-blue-400">· {video.expertNames.join(', ')}</span>}
          </p>
        </div>
        <div className="shrink-0 text-center min-w-[56px]">
          {!video.transcriptAvailable
            ? <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg block">Sin transcripción</span>
            : <>
                <p className={`text-xl font-bold ${scoreColor(video.globalMatchScore)}`}>{video.globalMatchScore}%</p>
                <p className="text-[10px] text-gray-600">{video.racesExtracted} carreras</p>
              </>}
        </div>
      </div>
      {video.transcriptAvailable && video.diffs.length > 0 && (
        <>
          <div className="px-4 pb-2 border-t border-gray-800 pt-2 flex items-center gap-3">
            <div className="flex gap-3 text-[11px]">
              <span className="text-green-400">{video.diffs.filter(d => d.matchScore >= 85).length} ✓</span>
              <span className="text-yellow-400">{video.diffs.filter(d => d.matchScore >= 60 && d.matchScore < 85).length} ~</span>
              <span className="text-red-400">{video.diffs.filter(d => d.matchScore < 60 && d.hasDbData).length} ✗</span>
              <span className="text-blue-400">{video.diffs.filter(d => !d.hasDbData).length} nuevo</span>
            </div>
            <button onClick={() => setExpanded(e => !e)}
              className="ml-auto text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
              {expanded ? 'Ocultar ▲' : 'Ver diff ▼'}
            </button>
          </div>
          {expanded && (
            <div className="px-4 pb-4 space-y-2">
              {video.diffs.map(d => <RaceDiffRow key={d.raceNumber} diff={d} />)}
            </div>
          )}
        </>
      )}
      {video.transcriptAvailable && video.racesExtracted === 0 && (
        <p className="px-4 pb-3 text-xs text-gray-500">Transcripción disponible pero sin pronósticos detectados.</p>
      )}
    </div>
  );
}

function AccumCard({ entry, onRemove }: { entry: AccumEntry; onRemove: () => void }) {
  const [open, setOpen] = useState(false);
  const scored = entry.result.videos.flatMap(v => v.diffs.filter(d => d.hasDbData));
  const avg = scored.length > 0 ? Math.round(scored.reduce((s, d) => s + d.matchScore, 0) / scored.length) : null;
  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden ${avg != null ? scoreBorder(avg) : 'border-gray-700/40'}`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{entry.channelLabel}</p>
          <p className="text-xs text-gray-500">{entry.result.videos.length} videos · {entry.result.meetingLabel}</p>
        </div>
        {avg != null && <p className={`text-lg font-bold ${scoreColor(avg)} shrink-0`}>{avg}%</p>}
        <button onClick={() => setOpen(o => !o)} className="text-xs text-gray-400 hover:text-white shrink-0">{open ? '▲' : '▼'}</button>
        <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-400 shrink-0">✕</button>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-800 pt-3">
          {entry.result.videos.map(v => <VideoCard key={v.videoId} video={v} />)}
        </div>
      )}
    </div>
  );
}

export default function ShadowPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [channelUrl, setChannelUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accumulated, setAccumulated] = useState<AccumEntry[]>([]);

  useEffect(() => {
    fetch('/api/meetings/upcoming?limit=10')
      .then(r => r.json())
      .then(data => {
        const list: Meeting[] = (data.meetings ?? data ?? []).map((m: any) => ({
          id: m._id ?? m.id, meetingNumber: m.meetingNumber, date: m.date,
          trackName: m.trackName ?? m.track?.name, status: m.status,
        }));
        setMeetings(list);
        if (list.length > 0) setSelectedMeetingId(list[0].id);
      }).catch(() => {});
  }, []);

  async function handleRun() {
    if (!selectedMeetingId || !channelUrl.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/intelligence/shadow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: selectedMeetingId, channelUrl: channelUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error ?? data.message ?? 'Error desconocido'); return; }
      const label = KNOWN_CHANNELS.find(c => c.url === channelUrl.trim())?.name ?? channelUrl.trim();
      setAccumulated(prev => [{ channelUrl: channelUrl.trim(), channelLabel: label, result: data }, ...prev]);
    } catch (e: any) {
      setError(e.message ?? 'Error de red');
    } finally {
      setLoading(false);
    }
  }

  const allScored = accumulated.flatMap(a => a.result.videos.flatMap(v => v.diffs.filter(d => d.hasDbData)));
  const globalAvg = allScored.length > 0 ? Math.round(allScored.reduce((s, d) => s + d.matchScore, 0) / allScored.length) : null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/admin/intelligence" className="text-gray-400 hover:text-white text-sm">← Inteligencia</Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">Shadow Mode — Validación automática</h1>
            <p className="text-xs text-gray-500">Solo lectura · No escribe en DB · Admin only</p>
          </div>
          {globalAvg != null && (
            <div className="text-right">
              <p className={`text-2xl font-bold ${scoreColor(globalAvg)}`}>{globalAvg}%</p>
              <p className="text-[10px] text-gray-500">promedio global</p>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="text-green-400">✓ OK — coincide exacto</span>
          <span className="text-yellow-400">≈ SIM — similar (mismo caballo, nombre diferente)</span>
          <span className="text-red-400">✗ FALTA — en DB pero no extraído</span>
          <span className="text-blue-400">+ EXTRA — extraído pero no en DB</span>
        </div>

        {/* Input panel */}
        <div className="bg-gray-900 border border-gray-700/50 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Nuevo análisis</h2>

          <div className="space-y-1">
            <label className="text-xs text-gray-400">Jornada</label>
            <select value={selectedMeetingId} onChange={e => setSelectedMeetingId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white">
              {meetings.map(m => (
                <option key={m.id} value={m.id}>
                  Reunión {m.meetingNumber} · {new Date(m.date).toLocaleDateString('es-VE')} {m.trackName ? `· ${m.trackName}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400">Canal YouTube</label>
            <div className="flex gap-2">
              <input value={channelUrl} onChange={e => setChannelUrl(e.target.value)}
                placeholder="https://www.youtube.com/@canal"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600" />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {KNOWN_CHANNELS.map(c => (
                <button key={c.url} onClick={() => setChannelUrl(c.url)}
                  className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${channelUrl === c.url ? 'bg-yellow-600/30 border-yellow-600 text-yellow-300' : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">{error}</p>}

          <button onClick={handleRun} disabled={loading || !selectedMeetingId || !channelUrl.trim()}
            className="w-full py-2.5 rounded-xl font-bold text-sm text-black disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            style={{ backgroundColor: '#D4AF37' }}>
            {loading ? 'Analizando... (puede tardar 30-60s)' : '🔍 Analizar canal'}
          </button>
          <p className="text-[11px] text-gray-600 text-center">No se escribirá nada en la base de datos</p>
        </div>

        {/* Accumulated results */}
        {accumulated.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">{accumulated.length} canal(es) analizados</h2>
              <button onClick={() => setAccumulated([])} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Limpiar todo</button>
            </div>
            {accumulated.map((entry, i) => (
              <AccumCard key={i} entry={entry} onRemove={() => setAccumulated(prev => prev.filter((_, j) => j !== i))} />
            ))}
          </div>
        )}

        {accumulated.length === 0 && !loading && (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">🔬</p>
            <p className="text-sm">Selecciona una jornada y un canal para comenzar la validación</p>
            <p className="text-xs mt-1">Puedes analizar múltiples canales y se acumularán aquí</p>
          </div>
        )}
      </main>
    </div>
  );
}
