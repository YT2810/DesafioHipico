'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';

interface AudioItem {
  _id: string;
  title: string;
  description?: string;
  durationSecs?: number;
  priceGolds: number;
  revenueSharePct: number;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  fileUrl: string;
  handicapperId: { _id: string; pseudonym: string };
  meetingId?: { meetingNumber: number; date: string };
}

function fmtDuration(secs?: number) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AdminAudiosPage() {
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    handicapperId: '',
    meetingId: '',
    title: '',
    description: '',
    durationSecs: '',
    fileUrl: '',
    priceGolds: '0',
    revenueSharePct: '70',
    isPublished: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audios');
      const data = await res.json();
      setAudios(data.audios ?? []);
    } catch {
      setAudios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const res = await fetch('/api/admin/audios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          durationSecs: form.durationSecs ? Number(form.durationSecs) : undefined,
          priceGolds: Number(form.priceGolds),
          revenueSharePct: Number(form.revenueSharePct),
          meetingId: form.meetingId || undefined,
          handicapperId: form.handicapperId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setSaveSuccess('Audio creado correctamente.');
      setShowForm(false);
      setForm({ handicapperId: '', meetingId: '', title: '', description: '', durationSecs: '', fileUrl: '', priceGolds: '0', revenueSharePct: '70', isPublished: false });
      load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(audio: AudioItem) {
    try {
      await fetch(`/api/admin/audios/${audio._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !audio.isPublished }),
      });
      load();
    } catch { /* noop */ }
  }

  async function handleDelete(audioId: string) {
    if (!window.confirm('¿Eliminar este audio permanentemente?')) return;
    await fetch(`/api/admin/audios/${audioId}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <Link href="/perfil" className="text-gray-400 hover:text-white text-sm">←</Link>
          <h1 className="text-base font-bold text-white flex-1">🎧 Gestión de Audios</h1>
          <button onClick={load} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors">↻</button>
          <button
            onClick={() => { setShowForm(true); setSaveError(''); setSaveSuccess(''); }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-black"
            style={{ backgroundColor: GOLD }}
          >
            + Nuevo
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 space-y-4">

        {saveSuccess && (
          <div className="text-sm text-green-400 bg-green-950/40 border border-green-800/50 rounded-xl px-4 py-3 flex items-center gap-2">
            ✅ {saveSuccess}
            <button onClick={() => setSaveSuccess('')} className="ml-auto text-green-700">✕</button>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-white">Nuevo audio</p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">ID Handicapper <span className="text-gray-700">(opcional si rol handicapper)</span></label>
                <input value={form.handicapperId} onChange={e => setForm(f => ({ ...f, handicapperId: e.target.value }))}
                  placeholder="ObjectId del perfil"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">ID Reunión <span className="text-gray-700">(opcional)</span></label>
                <input value={form.meetingId} onChange={e => setForm(f => ({ ...f, meetingId: e.target.value }))}
                  placeholder="ObjectId de la reunión"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Título <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Análisis Reunión 45 La Rinconada"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Descripción</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                placeholder="Breve descripción del contenido..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 resize-none" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">URL del archivo <span className="text-red-500">*</span></label>
              <input value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
                placeholder="https://... (Vercel Blob, S3, etc.)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Duración (seg)</label>
                <input type="number" min="0" value={form.durationSecs} onChange={e => setForm(f => ({ ...f, durationSecs: e.target.value }))}
                  placeholder="Ej: 420"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Precio (Golds)</label>
                <input type="number" min="0" value={form.priceGolds} onChange={e => setForm(f => ({ ...f, priceGolds: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">% Handicapper</label>
                <input type="number" min="0" max="100" value={form.revenueSharePct} onChange={e => setForm(f => ({ ...f, revenueSharePct: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600" />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
                className="w-4 h-4 accent-yellow-500" />
              <span className="text-sm text-gray-300">Publicar inmediatamente</span>
            </label>

            {saveError && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">⚠️ {saveError}</p>}

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving || !form.title.trim() || !form.fileUrl.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-40"
                style={{ backgroundColor: GOLD }}>
                {saving ? 'Guardando...' : 'Guardar audio'}
              </button>
            </div>
          </form>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-900 animate-pulse" />)}
          </div>
        ) : audios.length === 0 ? (
          <div className="text-center py-16 text-gray-700">
            <p className="text-4xl mb-3">🎧</p>
            <p className="text-sm">No hay audios aún. Crea el primero.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {audios.map(audio => (
              <div key={audio._id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-xl shrink-0">🎧</div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">{audio.title}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${audio.isPublished ? 'text-green-400 bg-green-950/40 border-green-800/50' : 'text-gray-500 bg-gray-800 border-gray-700'}`}>
                        {audio.isPublished ? '● Publicado' : '○ Borrador'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {audio.handicapperId?.pseudonym ?? '—'}
                      {audio.meetingId && ` · Reunión ${audio.meetingId.meetingNumber}`}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                      <span style={{ color: GOLD }}>🪙 {audio.priceGolds} Golds</span>
                      <span>{audio.revenueSharePct}% → handicapper</span>
                      {audio.durationSecs && <span>{fmtDuration(audio.durationSecs)}</span>}
                      <span>{new Date(audio.createdAt).toLocaleDateString('es-VE')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      onClick={() => togglePublish(audio)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        audio.isPublished
                          ? 'text-yellow-400 bg-yellow-950/30 border border-yellow-800/50 hover:bg-yellow-950/50'
                          : 'text-green-400 bg-green-950/30 border border-green-800/50 hover:bg-green-950/50'
                      }`}
                    >
                      {audio.isPublished ? 'Despublicar' : 'Publicar'}
                    </button>
                    <button
                      onClick={() => handleDelete(audio._id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-400 bg-red-950/20 border border-red-800/30 hover:bg-red-950/40 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                {audio.description && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-gray-600 italic">"{audio.description}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
