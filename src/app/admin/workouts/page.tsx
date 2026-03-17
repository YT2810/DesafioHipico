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

export default function AdminWorkoutsPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackId, setTrackId] = useState('');
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900 px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-lg font-extrabold text-white">📋 Subir Trabajos de Entrenamiento</h1>
          <p className="text-xs text-gray-500 mt-0.5">PDFs de trabajos INH — martes, miércoles, sábado</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">

        {/* Selección de hipódromo y archivo */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Hipódromo</label>
            <select
              value={trackId}
              onChange={e => setTrackId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600">
              {tracks.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Archivo PDF de trabajos
              <span className="ml-1 text-gray-600 font-normal">(ej: TRABAJOS SABADO 22 DE MARZO 2026.pdf)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              onChange={e => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setResult(null);
                setError('');
              }}
              className="w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:text-black cursor-pointer"
              style={{ '--file-bg': GOLD } as any}
            />
            <p className="text-[10px] text-gray-700 mt-1">
              El nombre del archivo debe contener la fecha (ej: "14 DE MARZO 2026") para extraer la fecha automáticamente.
            </p>
          </div>

          <button
            onClick={handlePreview}
            disabled={!file || !trackId || loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{ backgroundColor: GOLD }}>
            {loading ? 'Procesando...' : '🔍 Vista previa (primeros 10 registros)'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-800/40 bg-red-950/20 px-4 py-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Resultado guardado */}
        {result && (
          <div className="rounded-2xl border border-green-700/40 bg-green-950/20 px-4 py-4 text-center space-y-1">
            <p className="text-lg">✅</p>
            <p className="text-sm font-bold text-green-300">¡Trabajos guardados correctamente!</p>
            <p className="text-xs text-green-400/70">
              {result.inserted} de {result.total} trabajos procesados ·{' '}
              {new Date(result.workoutDate).toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Los trabajos ya están disponibles en la Revista de todas las reuniones de esta semana.
            </p>
          </div>
        )}

        {/* Vista previa */}
        {preview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Vista previa</p>
                <p className="text-xs text-gray-500 capitalize">{previewDate} · {previewCount} trabajos encontrados</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: GOLD }}>
                {saving ? 'Guardando...' : `✅ Confirmar e importar ${previewCount} trabajos`}
              </button>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
              <div className="grid grid-cols-[1fr_4rem_3rem_1fr] gap-x-3 px-3 py-2 border-b border-gray-800 text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                <span>Caballo</span>
                <span className="text-center">Tipo</span>
                <span className="text-center">Días</span>
                <span>Tiempos / Comentario</span>
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
                      }`}>
                        {WORKOUT_LABELS[row.workoutType] ?? row.workoutType}
                      </span>
                      {row.distance && <p className="text-[9px] text-gray-600 mt-0.5">{row.distance}m</p>}
                    </div>
                    <div className="text-center">
                      {row.daysRest !== null ? (
                        <span className={`inline-block text-[9px] font-bold px-1 py-0.5 rounded border ${
                          (row.daysRest ?? 99) <= 3 ? 'text-green-400 border-green-800/40 bg-green-950/30' :
                          (row.daysRest ?? 99) <= 7 ? 'text-yellow-400 border-yellow-800/40 bg-yellow-950/30' :
                          'text-gray-500 border-gray-700 bg-gray-800/30'
                        }`}>
                          {row.daysRest}D
                        </span>
                      ) : <span className="text-gray-700 text-xs">—</span>}
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
                  <p className="text-xs text-gray-600">Mostrando 10 de {previewCount} trabajos. Al confirmar se importan todos.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instrucciones */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Instrucciones</p>
          <ul className="space-y-1.5 text-xs text-gray-600">
            <li>📅 <strong className="text-gray-500">Martes y miércoles:</strong> Ajustes (trabajos entre semana)</li>
            <li>📅 <strong className="text-gray-500">Sábado:</strong> Trabajos del sábado (caballos que podrían correr la próxima semana)</li>
            <li>📄 <strong className="text-gray-500">Nombre del archivo:</strong> Debe incluir la fecha completa para extracción automática (ej: "TRABAJOS SABADO 22 DE MARZO 2026.pdf")</li>
            <li>🔄 <strong className="text-gray-500">Re-importar:</strong> Si subes el mismo archivo dos veces, los datos se actualizan sin duplicar</li>
            <li>🐴 <strong className="text-gray-500">Caballos sin nombre:</strong> Aparecen como se escriben en el PDF. Se linkean automáticamente si el nombre coincide exactamente con la base de datos.</li>
          </ul>
        </div>

      </main>
    </div>
  );
}
