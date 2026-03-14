'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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
  meetingId?: { _id: string; meetingNumber: number; date: string };
}

function fmtDuration(secs?: number) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MisAudiosPage() {
  const { data: session, status } = useSession();
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [revenueSharePct, setRevenueSharePct] = useState<number>(70);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [form, setForm] = useState({
    meetingId: '',
    title: '',
    description: '',
    durationSecs: '',
    fileUrl: '',
    priceGolds: '5',
    isPublished: false,
  });

  const roles: string[] = (session?.user as any)?.roles ?? [];
  const isHandicapper = roles.includes('handicapper');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/handicapper/mis-audios');
      const data = await res.json();
      setAudios(data.audios ?? []);
      if (data.revenueSharePct != null) setRevenueSharePct(data.revenueSharePct);
    } catch {
      setAudios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && isHandicapper) load();
    else if (status !== 'loading') setLoading(false);
  }, [status, isHandicapper, load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const res = await fetch('/api/handicapper/mis-audios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          durationSecs: form.durationSecs ? Number(form.durationSecs) : undefined,
          priceGolds: Number(form.priceGolds),
          meetingId: form.meetingId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setSaveSuccess('Audio publicado correctamente.');
      setShowForm(false);
      setForm({ meetingId: '', title: '', description: '', durationSecs: '', fileUrl: '', priceGolds: '5', isPublished: false });
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

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isHandicapper) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
        <div>
          <p className="text-4xl mb-4">🔒</p>
          <p className="text-gray-400 mb-4">Solo handicappers verificados pueden publicar audios</p>
          <Link href="/perfil" className="text-yellow-400 hover:underline text-sm">← Volver al perfil</Link>
        </div>
      </div>
    );
  }

  const platformPct = 100 - revenueSharePct;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-2xl flex items-center gap-3">
          <Link href="/perfil" className="text-gray-400 hover:text-white text-sm transition-colors">←</Link>
          <h1 className="text-base font-bold text-white flex-1">🎧 Mis Audios VIP</h1>
          <button
            onClick={() => { setShowForm(true); setSaveError(''); setSaveSuccess(''); }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-black"
            style={{ backgroundColor: GOLD }}
          >
            + Nuevo audio
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 space-y-4">

        {/* Revenue info banner */}
        <div className="bg-gray-900 border border-yellow-800/30 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl shrink-0">🪙</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-white">Tu comisión por audio vendido</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Recibes <span className="font-bold text-yellow-400">{revenueSharePct}%</span> · Plataforma retiene <span className="font-semibold text-gray-300">{platformPct}%</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-600">Acordado con el admin</p>
          </div>
        </div>

        {saveSuccess && (
          <div className="text-sm text-green-400 bg-green-950/40 border border-green-800/50 rounded-xl px-4 py-3 flex items-center gap-2">
            ✅ {saveSuccess}
            <button onClick={() => setSaveSuccess('')} className="ml-auto text-green-700">✕</button>
          </div>
        )}

        {/* Upload form */}
        {showForm && (
          <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-bold text-white">Nuevo audio VIP</p>
            <p className="text-xs text-gray-500">Los audios son contenido de pago. Precio mínimo: 1 Gold.</p>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Título <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ej: Análisis completo Reunión 45 — Válidas C7 a C11"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Descripción <span className="text-gray-700">(opcional)</span></label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                placeholder="¿Qué cubre este audio? ¿Carreras válidas, fijos, combinaciones?"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors resize-none" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">URL del archivo de audio <span className="text-red-500">*</span></label>
              <input value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
                placeholder="https://... (sube el archivo a drive, blob, etc.)"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
              <p className="text-xs text-gray-700 mt-1">Puedes usar Google Drive (link de descarga directa), Dropbox o cualquier CDN.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Precio en Golds <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={form.priceGolds} onChange={e => setForm(f => ({ ...f, priceGolds: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600 transition-colors" />
                {form.priceGolds && Number(form.priceGolds) >= 1 && (
                  <p className="text-[10px] text-green-500 mt-0.5">
                    Recibes: {Math.round(Number(form.priceGolds) * revenueSharePct) / 100} Golds por venta
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Duración (segundos)</label>
                <input type="number" min="0" value={form.durationSecs} onChange={e => setForm(f => ({ ...f, durationSecs: e.target.value }))}
                  placeholder="Ej: 480"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">ID Reunión <span className="text-gray-700">(opcional — vincula al día de carreras)</span></label>
              <input value={form.meetingId} onChange={e => setForm(f => ({ ...f, meetingId: e.target.value }))}
                placeholder="Puedes dejarlo en blanco"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPublished} onChange={e => setForm(f => ({ ...f, isPublished: e.target.checked }))}
                className="w-4 h-4 accent-yellow-500" />
              <span className="text-sm text-gray-300">Publicar inmediatamente</span>
            </label>

            {saveError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">⚠️ {saveError}</p>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); setSaveError(''); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={saving || !form.title.trim() || !form.fileUrl.trim() || Number(form.priceGolds) < 1}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-40"
                style={{ backgroundColor: GOLD }}>
                {saving ? 'Publicando...' : '🎧 Publicar audio'}
              </button>
            </div>
          </form>
        )}

        {/* Audio list */}
        {audios.length === 0 && !showForm ? (
          <div className="text-center py-16 text-gray-700">
            <p className="text-4xl mb-3">🎙️</p>
            <p className="text-sm font-semibold text-gray-500">Sin audios publicados aún</p>
            <p className="text-xs mt-2 max-w-xs mx-auto">Graba tu análisis de las carreras válidas y súbelo aquí. Tus seguidores lo comprarán directamente.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold text-black"
              style={{ backgroundColor: GOLD }}
            >
              + Subir mi primer audio
            </button>
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
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        audio.isPublished
                          ? 'text-green-400 bg-green-950/40 border-green-800/50'
                          : 'text-gray-500 bg-gray-800 border-gray-700'
                      }`}>
                        {audio.isPublished ? '● Publicado' : '○ Borrador'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className="font-bold" style={{ color: GOLD }}>🪙 {audio.priceGolds} Golds</span>
                      <span className="text-green-500">Recibes: {Math.round(audio.priceGolds * audio.revenueSharePct) / 100} Golds</span>
                      {audio.durationSecs && <span className="text-gray-600">{fmtDuration(audio.durationSecs)}</span>}
                      {audio.meetingId && <span className="text-gray-600">Reunión {audio.meetingId.meetingNumber}</span>}
                    </div>
                    {audio.description && (
                      <p className="text-xs text-gray-600 italic line-clamp-1">"{audio.description}"</p>
                    )}
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
                      {audio.isPublished ? 'Quitar' : 'Publicar'}
                    </button>
                    <button
                      onClick={() => handleDelete(audio._id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-400 bg-red-950/20 border border-red-800/30 hover:bg-red-950/40 transition-colors"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
