'use client';

import { useState, useEffect, useRef } from 'react';

const GOLD = '#D4AF37';

interface Track { _id: string; name: string; }
interface PreviewRow {
  horseName: string;
  daysRest: number | null;
  distance: number | null;
  workoutType: string;
  splits: string;
  comment: string;
  jockeyName: string;
  trainerName: string;
}

type FileStatus = 'pending' | 'uploading' | 'done' | 'error';
interface FileItem { file: File; status: FileStatus; message: string; inserted: number; total: number; workoutDate: string; }

export default function AdminWorkoutsPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackId, setTrackId] = useState('');
  const [activeTab, setActiveTab] = useState<'bulk' | 'single'>('bulk');
  // bulk
  const [bulkFiles, setBulkFiles] = useState<FileItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const bulkRef = useRef<HTMLInputElement>(null);
  // single
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [previewDate, setPreviewDate] = useState('');
  const [previewCount, setPreviewCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ inserted: number; total: number; workoutDate: string } | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin/tracks')
      .then(r => r.json())
      .then(d => {
        setTracks(d.tracks ?? []);
        if (d.tracks?.length > 0) setTrackId(d.tracks[0]._id);
      })
      .catch(() => {});
  }, []);

  function handleBulkSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setBulkFiles(files.map(f => ({ file: f, status: 'pending', message: '', inserted: 0, total: 0, workoutDate: '' })));
  }

  async function handleBulkUpload() {
    if (!trackId || bulkFiles.length === 0) return;
    setBulkRunning(true);
    for (let i = 0; i < bulkFiles.length; i++) {
      setBulkFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f));
      try {
        const form = new FormData();
        form.append('file', bulkFiles[i].file);
        form.append('trackId', trackId);
        const res = await fetch('/api/admin/workouts/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) {
          setBulkFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', message: data.error ?? 'Error' } : f));
        } else {
          setBulkFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done', inserted: data.inserted, total: data.total, workoutDate: data.workoutDate, message: `${data.inserted}/${data.total}` } : f));
        }
      } catch {
        setBulkFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', message: 'Error de red' } : f));
      }
    }
    setBulkRunning(false);
  }

  async function handlePreview() {
    if (!file || !trackId) return;
    setError('');
    setPreview(null);
    setResult(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('trackId', trackId);
      form.append('preview', 'true');
      const res = await fetch('/api/admin/workouts/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al procesar'); return; }
      setPreview(data.preview ?? []);
      setPreviewDate(data.workoutDate ? new Date(data.workoutDate).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');
      setPreviewCount(data.count ?? 0);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!file || !trackId) return;
    setError('');
    setSaving(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('trackId', trackId);
      const res = await fetch('/api/admin/workouts/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return; }
      setResult(data);
      setPreview(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } finally {
      setSaving(false);
    }
  }

  const WORKOUT_LABELS: Record<string, string> = {
    EP: 'En Pelo', ES: 'En Silla', AP: 'Aparato', galopo: 'Galopo',
  };
  const bulkDone = bulkFiles.filter(f => f.status === 'done').length;
  const bulkErrors = bulkFiles.filter(f => f.status === 'error').length;
  const bulkTotalInserted = bulkFiles.reduce((acc, f) => acc + f.inserted, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900 px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-lg font-extrabold text-white">📋 Subir Trabajos de Entrenamiento</h1>
          <p className="text-xs text-gray-500 mt-0.5">PDFs de trabajos INH — ajustes y sábados</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">

        {/* Hipódromo */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
          <label className="block text-xs font-semibold text-gray-400 mb-1">Hipódromo</label>
          <select value={trackId} onChange={e => setTrackId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600">
            {tracks.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['bulk','single'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${activeTab === tab ? 'text-black border-yellow-600' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
              style={activeTab === tab ? { backgroundColor: GOLD } : {}}>
              {tab === 'bulk' ? '📦 Masiva (varios PDFs)' : '🔍 Un archivo con vista previa'}
            </button>
          ))}
        </div>

        {/* ── BULK ── */}
        {activeTab === 'bulk' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-3">
              <p className="text-xs text-gray-500">Selecciona todos los PDFs del año. Se subirán uno a uno con progreso individual.</p>
              <input ref={bulkRef} type="file" accept=".pdf" multiple onChange={handleBulkSelect}
                className="w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:text-black cursor-pointer" />
              {bulkFiles.length > 0 && (
                <button onClick={handleBulkUpload} disabled={bulkRunning || !trackId}
                  className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-40"
                  style={{ backgroundColor: GOLD }}>
                  {bulkRunning ? `Subiendo... (${bulkDone}/${bulkFiles.length})` : `⬆️ Subir ${bulkFiles.length} archivos`}
                </button>
              )}
            </div>
            {bulkFiles.length > 0 && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
                {bulkDone > 0 && (
                  <div className="px-4 py-2 border-b border-gray-800 bg-green-950/20 text-xs text-green-400 font-bold">
                    ✅ {bulkDone}/{bulkFiles.length} archivos · {bulkTotalInserted} trabajos importados
                    {bulkErrors > 0 && <span className="text-red-400 ml-2">· {bulkErrors} con error</span>}
                  </div>
                )}
                <div className="divide-y divide-gray-800/40 max-h-96 overflow-y-auto">
                  {bulkFiles.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="text-lg shrink-0">
                        {item.status === 'pending' && '⏳'}
                        {item.status === 'uploading' && <span className="inline-block w-4 h-4 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin" />}
                        {item.status === 'done' && '✅'}
                        {item.status === 'error' && '❌'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{item.file.name}</p>
                        {item.status === 'done' && <p className="text-[10px] text-green-400">{item.message} trabajos · {new Date(item.workoutDate).toLocaleDateString('es-VE', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</p>}
                        {item.status === 'error' && <p className="text-[10px] text-red-400">{item.message}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SINGLE con preview ── */}
        {activeTab === 'single' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Archivo PDF
                  <span className="ml-1 text-gray-600 font-normal">(ej: TRABAJOS SABADO 22 DE MARZO 2026.pdf)</span>
                </label>
                <input ref={fileRef} type="file" accept=".pdf"
                  onChange={e => { setFile(e.target.files?.[0] ?? null); setPreview(null); setResult(null); setError(''); }}
                  className="w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:text-black cursor-pointer" />
              </div>
              <button onClick={handlePreview} disabled={!file || !trackId || loading}
                className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-40"
                style={{ backgroundColor: GOLD }}>
                {loading ? 'Procesando...' : '🔍 Vista previa'}
              </button>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-800/40 bg-red-950/20 px-4 py-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {result && (
              <div className="rounded-2xl border border-green-700/40 bg-green-950/20 px-4 py-4 text-center space-y-1">
                <p className="text-lg">✅</p>
                <p className="text-sm font-bold text-green-300">¡Trabajos guardados!</p>
                <p className="text-xs text-green-400/70">
                  {result.inserted}/{result.total} trabajos · {new Date(result.workoutDate).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                </p>
              </div>
            )}

            {preview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">Vista previa</p>
                    <p className="text-xs text-gray-500 capitalize">{previewDate} · {previewCount} trabajos</p>
                  </div>
                  <button onClick={handleSave} disabled={saving}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-40"
                    style={{ backgroundColor: GOLD }}>
                    {saving ? 'Guardando...' : `✅ Importar ${previewCount}`}
                  </button>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
                  <div className="grid grid-cols-[1fr_4rem_3rem_1fr] gap-x-3 px-3 py-2 border-b border-gray-800 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    <span>Caballo</span><span className="text-center">Tipo</span><span className="text-center">Días</span><span>Tiempos</span>
                  </div>
                  <div className="divide-y divide-gray-800/40">
                    {preview.map((row, i) => (
                      <div key={i} className="grid grid-cols-[1fr_4rem_3rem_1fr] gap-x-3 px-3 py-2.5 items-start">
                        <div>
                          <p className="text-sm font-bold text-white truncate">{row.horseName}</p>
                          <p className="text-[10px] text-gray-600 truncate">{row.jockeyName} · {row.trainerName}</p>
                        </div>
                        <div className="text-center">
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            row.workoutType === 'EP' ? 'bg-blue-950/50 border-blue-700/40 text-blue-300' :
                            row.workoutType === 'ES' ? 'bg-purple-950/50 border-purple-700/40 text-purple-300' :
                            row.workoutType === 'AP' ? 'bg-orange-950/50 border-orange-700/40 text-orange-300' :
                            'bg-gray-800 border-gray-700 text-gray-400'
                          }`}>{WORKOUT_LABELS[row.workoutType] ?? row.workoutType}</span>
                          {row.distance && <p className="text-[9px] text-gray-600 mt-0.5">{row.distance}m</p>}
                        </div>
                        <div className="text-center">
                          {row.daysRest !== null
                            ? <span className={`inline-block text-[9px] font-bold px-1 py-0.5 rounded border ${
                                (row.daysRest ?? 99) <= 3 ? 'text-green-400 border-green-800/40 bg-green-950/30' :
                                (row.daysRest ?? 99) <= 7 ? 'text-yellow-400 border-yellow-800/40 bg-yellow-950/30' :
                                'text-gray-500 border-gray-700 bg-gray-800/30'}`}>{row.daysRest}D</span>
                            : <span className="text-gray-700 text-xs">—</span>}
                        </div>
                        <div>
                          {row.splits && <p className="text-[9px] font-mono text-yellow-500/70 leading-tight">{row.splits}</p>}
                          {row.comment && <p className="text-[9px] text-gray-500 italic leading-tight">{row.comment}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {previewCount > 10 && (
                    <div className="px-3 py-2 border-t border-gray-800 text-center">
                      <p className="text-xs text-gray-600">Mostrando 10 de {previewCount}. Al confirmar se importan todos.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instrucciones */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Instrucciones</p>
          <ul className="space-y-1.5 text-xs text-gray-600">
            <li>� El nombre del archivo debe incluir la fecha (ej: "TRABAJOS SABADO 22 DE MARZO 2026.pdf")</li>
            <li>🔄 Re-importar el mismo archivo actualiza sin duplicar</li>
            <li>🐴 Caballos nuevos se crean en la BD. Debutantes sin nombre se guardan tal como aparecen en el PDF.</li>
          </ul>
        </div>

      </main>
    </div>
  );
}
