'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Meeting { id: string; meetingNumber: number; date: string; trackName?: string; }
interface YouTubeSource { _id: string; name: string; handle: string | null; link: string | null; youtubeChannelUrl: string | null; hasForecastForMeeting: boolean; forecastCountForMeeting: number; }
type DiffStatus = 'match' | 'similar' | 'missing' | 'extra';
interface DiffMark { preferenceOrder: number; horseName: string; dorsalNumber?: number; label?: string; rawLabel?: string; status: DiffStatus; matchedWith?: string; confidence: number; }
interface RaceDiff { raceNumber: number; raceId: string | null; dbMarks: DiffMark[]; extractedMarks: DiffMark[]; matchScore: number; hasDbData: boolean; }
interface VideoResult { videoId: string; title: string; videoUrl: string; publishedAt: string; transcriptAvailable: boolean; expertNames: string[]; diffs: RaceDiff[]; globalMatchScore: number; racesExtracted: number; llmError?: string; }
interface ShadowResult { success: boolean; channelId?: string; meetingLabel: string; videos: VideoResult[]; overallMatchScore: number | null; message?: string; }
interface AccumEntry { sourceId: string; channelLabel: string; channelUrl: string; result: ShadowResult; }

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
          {video.llmError && <p className="text-[10px] text-red-400 mt-1 break-all">{video.llmError}</p>}
        </div>
        <div className="shrink-0 text-center min-w-[56px]">
          {!video.transcriptAvailable
            ? <span className="text-xs text-red-500/80 bg-gray-800 px-2 py-1 rounded-lg block text-center">{video.llmError ? 'Error LLM' : 'Sin transcripción'}</span>
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
          {entry.result.message && <p className="text-xs text-yellow-500 mt-0.5">{entry.result.message}</p>}
        </div>
        {avg != null && <p className={`text-lg font-bold ${scoreColor(avg)} shrink-0`}>{avg}%</p>}
        <button onClick={() => setOpen(o => !o)} className="text-xs text-gray-400 hover:text-white shrink-0">{open ? '▲' : '▼'}</button>
        <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-400 shrink-0">✕</button>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-800 pt-3">
          {entry.result.videos.length === 0
            ? <p className="text-xs text-gray-500 italic">{entry.result.message ?? 'Sin videos encontrados para esta jornada.'}</p>
            : entry.result.videos.map(v => <VideoCard key={v.videoId} video={v} />)}
        </div>
      )}
    </div>
  );
}

export default function ShadowPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [ytSources, setYtSources] = useState<YouTubeSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [channelUrl, setChannelUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accumulated, setAccumulated] = useState<AccumEntry[]>([]);

  // Load meetings
  useEffect(() => {
    fetch('/api/meetings/upcoming?limit=10')
      .then(r => r.json())
      .then(data => {
        const list: Meeting[] = (data.meetings ?? []).map((m: any) => ({
          id: m._id ?? m.id, meetingNumber: m.meetingNumber, date: m.date,
          trackName: m.trackName,
        }));
        setMeetings(list);
        if (list.length > 0) setSelectedMeetingId(list[0].id);
      }).catch(() => {});
  }, []);

  // Load YouTube sources for selected meeting
  useEffect(() => {
    if (!selectedMeetingId) return;
    setLoadingSources(true);
    fetch(`/api/admin/sources?meetingId=${selectedMeetingId}`)
      .then(r => r.json())
      .then(data => {
        const all: YouTubeSource[] = (data.sources ?? [])
          .filter((s: any) => s.platform === 'YouTube' && s.youtubeChannelUrl)
          .map((s: any) => ({
            _id: s._id,
            name: s.name,
            handle: s.handle,
            link: s.link,
            youtubeChannelUrl: s.youtubeChannelUrl,
            hasForecastForMeeting: s.hasForecastForMeeting,
            forecastCountForMeeting: s.forecastCountForMeeting,
          }));
        // Sort: with forecasts first (for testing today), then without
        all.sort((a, b) => (b.hasForecastForMeeting ? 1 : 0) - (a.hasForecastForMeeting ? 1 : 0));
        setYtSources(all);
        setChannelUrl('');
      })
      .catch(() => {})
      .finally(() => setLoadingSources(false));
  }, [selectedMeetingId]);

  const withForecasts = ytSources.filter(s => s.hasForecastForMeeting);
  const withoutForecasts = ytSources.filter(s => !s.hasForecastForMeeting);

  async function handleRun(url: string, label: string, sourceId: string) {
    if (!selectedMeetingId || !url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/intelligence/shadow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: selectedMeetingId, channelUrl: url.trim(), expertSourceId: sourceId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? data.message ?? 'Error desconocido'); return; }
      setAccumulated(prev => [{ sourceId, channelLabel: label, channelUrl: url, result: data }, ...prev]);
    } catch (e: any) {
      setError(e.message ?? 'Error de red');
    } finally {
      setLoading(false);
    }
  }

  async function handleManualRun() {
    if (!channelUrl.trim()) return;
    await handleRun(channelUrl.trim(), channelUrl.trim(), '');
  }

  const alreadyRun = new Set(accumulated.map(a => a.sourceId));
  const allScored = accumulated.flatMap(a => a.result.videos.flatMap(v => v.diffs.filter(d => d.hasDbData)));
  const globalAvg = allScored.length > 0 ? Math.round(allScored.reduce((s, d) => s + d.matchScore, 0) / allScored.length) : null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/admin/intelligence" className="text-gray-400 hover:text-white text-sm">← Inteligencia</Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">Shadow Mode — Validación automática</h1>
            <p className="text-xs text-gray-500">Solo lectura · No escribe en DB</p>
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
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="text-green-400">✓ OK — exacto</span>
          <span className="text-yellow-400">≈ SIM — mismo caballo, nombre diferente</span>
          <span className="text-red-400">✗ FALTA — en DB, no extraído</span>
          <span className="text-blue-400">+ EXTRA — extraído, no en DB</span>
        </div>

        {/* Meeting selector */}
        <div className="bg-gray-900 border border-gray-700/50 rounded-2xl p-5 space-y-4">
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

          {/* Sources with forecasts this meeting — for testing */}
          {loadingSources
            ? <p className="text-xs text-gray-500">Cargando canales…</p>
            : withForecasts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-green-500 uppercase tracking-wide">
                  ✅ Con pronósticos esta reunión — para validar hoy ({withForecasts.length})
                </p>
                <p className="text-[11px] text-gray-600">Estos tienen data en DB para comparar. Úsalos para medir la fiabilidad del sistema.</p>
                <div className="space-y-1.5">
                  {withForecasts.map(s => {
                    const done = alreadyRun.has(s._id);
                    return (
                      <div key={s._id} className="flex items-center gap-3 bg-gray-800/50 rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{s.name}</p>
                          <p className="text-[11px] text-gray-500 truncate">{s.youtubeChannelUrl}</p>
                        </div>
                        <span className="text-xs text-green-400 shrink-0">{s.forecastCountForMeeting} C</span>
                        <button
                          onClick={() => handleRun(s.youtubeChannelUrl!, s.name, s._id)}
                          disabled={loading || done}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          style={{ backgroundColor: done ? '#374151' : '#D4AF37', color: done ? '#9CA3AF' : '#000' }}>
                          {done ? '✓ Listo' : loading ? '…' : 'Analizar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Sources without forecasts this meeting */}
          {!loadingSources && withoutForecasts.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-yellow-600 uppercase tracking-wide">
                🟡 Sin pronósticos esta reunión — producción futura ({withoutForecasts.length})
              </p>
              <p className="text-[11px] text-gray-600">No hay data en DB para comparar. Útil para ver qué extrae, pero sin score de match.</p>
              <div className="space-y-1.5">
                {withoutForecasts.map(s => {
                  const done = alreadyRun.has(s._id);
                  return (
                    <div key={s._id} className="flex items-center gap-3 bg-gray-800/30 rounded-xl px-3 py-2 border border-gray-700/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-300 truncate">{s.name}</p>
                        <p className="text-[11px] text-gray-600 truncate">{s.youtubeChannelUrl}</p>
                      </div>
                      <button
                        onClick={() => handleRun(s.youtubeChannelUrl!, s.name, s._id)}
                        disabled={loading || done}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-40 disabled:cursor-not-allowed bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
                        {done ? '✓ Listo' : loading ? '…' : 'Ver extracción'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manual URL input */}
          <div className="border-t border-gray-800 pt-4 space-y-2">
            <p className="text-xs text-gray-500">O ingresa una URL manualmente (canal sin URL correcta en DB):</p>
            <div className="flex gap-2">
              <input value={channelUrl} onChange={e => setChannelUrl(e.target.value)}
                placeholder="https://www.youtube.com/@canal"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600" />
              <button onClick={handleManualRun} disabled={loading || !channelUrl.trim()}
                className="px-4 py-2 rounded-xl font-bold text-sm text-black disabled:opacity-50"
                style={{ backgroundColor: '#D4AF37' }}>
                {loading ? '…' : 'Analizar'}
              </button>
            </div>
          </div>

          {!loadingSources && ytSources.length === 0 && (
            <div className="text-xs text-yellow-600 bg-yellow-950/30 border border-yellow-800/40 rounded-xl px-3 py-2">
              No hay fuentes YouTube con URL cargada en DB para esta reunión.
              <Link href="/staff/fuentes" className="ml-2 underline hover:text-yellow-400">Corregir en /staff/fuentes →</Link>
            </div>
          )}

          {error && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">{error}</p>}
          {loading && <p className="text-xs text-gray-400 animate-pulse">Analizando… puede tardar 30-60s por video</p>}
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
            <p className="text-4xl mb-3">��</p>
            <p className="text-sm">Selecciona una jornada y haz clic en "Analizar" en cualquier canal</p>
            <p className="text-xs mt-1">Los canales ✅ tienen data en DB para comparar — empieza por ellos</p>
          </div>
        )}
      </main>
    </div>
  );
}
