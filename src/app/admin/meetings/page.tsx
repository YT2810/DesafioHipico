'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface MeetingRow {
  _id: string;
  meetingNumber: number;
  date: string;
  trackName: string;
  raceCount: number;
  summaryVideoUrl?: string | null;
  streamUrl?: string | null;
}

export default function AdminMeetingsPage() {
  const { data: session, status } = useSession();
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [videoInputs, setVideoInputs] = useState<Record<string, string>>({});
  const [streamInputs, setStreamInputs] = useState<Record<string, string>>({});
  const [savingStream, setSavingStream] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; msg: string }>>({}); 
  const [streamFeedback, setStreamFeedback] = useState<Record<string, { ok: boolean; msg: string }>>({}); 

  const roles: string[] = (session?.user as any)?.roles ?? [];
  const canAccess = roles.some(r => ['admin', 'staff'].includes(r));

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/meetings/recent?limit=20')
      .then(r => r.json())
      .then(d => {
        const rows: MeetingRow[] = d.meetings ?? [];
        setMeetings(rows);
        const inputs: Record<string, string> = {};
        const sInputs: Record<string, string> = {};
        rows.forEach(m => {
          inputs[m._id] = m.summaryVideoUrl ?? '';
          sInputs[m._id] = m.streamUrl ?? '';
        });
        setVideoInputs(inputs);
        setStreamInputs(sInputs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  async function saveStream(meetingId: string) {
    setSavingStream(meetingId);
    setStreamFeedback(prev => ({ ...prev, [meetingId]: { ok: false, msg: '' } }));
    try {
      const res = await fetch(`/api/admin/meetings/${meetingId}/stream`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streamUrl: streamInputs[meetingId] || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Error');
      setStreamFeedback(prev => ({ ...prev, [meetingId]: { ok: true, msg: '✓ Guardado' } }));
      setMeetings(prev => prev.map(m => m._id === meetingId ? { ...m, streamUrl: d.streamUrl } : m));
    } catch (e: any) {
      setStreamFeedback(prev => ({ ...prev, [meetingId]: { ok: false, msg: e.message } }));
    } finally {
      setSavingStream(null);
    }
  }

  async function saveVideo(meetingId: string) {
    setSaving(meetingId);
    setFeedback(prev => ({ ...prev, [meetingId]: { ok: false, msg: '' } }));
    try {
      const res = await fetch(`/api/admin/meetings/${meetingId}/video`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl: videoInputs[meetingId] || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Error');
      setFeedback(prev => ({ ...prev, [meetingId]: { ok: true, msg: '✓ Guardado' } }));
      setMeetings(prev => prev.map(m => m._id === meetingId ? { ...m, summaryVideoUrl: d.summaryVideoUrl } : m));
    } catch (e: any) {
      setFeedback(prev => ({ ...prev, [meetingId]: { ok: false, msg: e.message } }));
    } finally {
      setSaving(null);
    }
  }

  if (status === 'loading') return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">Cargando...</div>;
  if (!canAccess) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400 text-sm">Sin acceso.</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-20 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/perfil" className="text-xs text-gray-400 hover:text-white">← Volver</Link>
          <h1 className="text-sm font-extrabold text-white">Video Resumen — Reuniones</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl px-4 py-3 space-y-1">
          <p className="text-xs text-blue-300 leading-relaxed">
            <strong>Stream en vivo:</strong> Pega la URL de YouTube, Telegram o VK del domingo. Se muestra en <span className="font-mono">/en-vivo</span>.<br/>
            <strong>Video resumen:</strong> Solo YouTube (<span className="font-mono">youtube.com/watch?v=ID</span> o <span className="font-mono">youtu.be/ID</span>). Se muestra en Resultados.
          </p>
        </div>

        {loading && (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-900 animate-pulse"/>)}
          </div>
        )}

        {meetings.map(m => {
          const d = new Date(m.date);
          const dateStr = d.toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
          const fb = feedback[m._id];
          const hasVideo = !!m.summaryVideoUrl;

          const sfb = streamFeedback[m._id];
          const hasStream = !!m.streamUrl;

          return (
            <div key={m._id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
              {/* Meeting info */}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{m.trackName} — Reunión #{m.meetingNumber}</p>
                  <p className="text-[11px] text-gray-500 capitalize">{dateStr} · {m.raceCount} carreras</p>
                </div>
                <div className="flex gap-1">
                  {hasStream && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950/50 border border-red-800/50 text-red-400 shrink-0">📡 En vivo</span>}
                  {hasVideo && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/50 border border-blue-800/50 text-blue-400 shrink-0">▶ Video</span>}
                </div>
              </div>

              {/* Stream URL input */}
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">📡 Stream en vivo (YouTube / Telegram / VK)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={streamInputs[m._id] ?? ''}
                    onChange={e => setStreamInputs(prev => ({ ...prev, [m._id]: e.target.value }))}
                    placeholder="https://youtube.com/live/... o t.me/... o vk.com/video..."
                    className="flex-1 text-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-600 transition-colors"
                  />
                  <button
                    onClick={() => saveStream(m._id)}
                    disabled={savingStream === m._id}
                    className="shrink-0 text-xs px-4 py-2 rounded-lg font-bold bg-red-700 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
                  >
                    {savingStream === m._id ? '...' : 'Guardar'}
                  </button>
                </div>
                {sfb?.msg && <p className={`text-[11px] font-semibold ${sfb.ok ? 'text-green-400' : 'text-red-400'}`}>{sfb.msg}</p>}
              </div>

              {/* Video resumen URL input */}
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">▶ Video resumen (solo YouTube)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={videoInputs[m._id] ?? ''}
                    onChange={e => setVideoInputs(prev => ({ ...prev, [m._id]: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=... o https://youtu.be/..."
                    className="flex-1 text-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors"
                  />
                  <button
                    onClick={() => saveVideo(m._id)}
                    disabled={saving === m._id}
                    className="shrink-0 text-xs px-4 py-2 rounded-lg font-bold bg-yellow-600 hover:bg-yellow-500 text-black disabled:opacity-50 transition-colors"
                  >
                    {saving === m._id ? '...' : 'Guardar'}
                  </button>
                </div>
                {fb?.msg && <p className={`text-[11px] font-semibold ${fb.ok ? 'text-green-400' : 'text-red-400'}`}>{fb.msg}</p>}
              </div>
            </div>
          );
        })}

        {!loading && meetings.length === 0 && (
          <p className="text-sm text-gray-600 text-center py-10">No hay reuniones recientes.</p>
        )}
      </main>
    </div>
  );
}
