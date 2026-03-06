'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { ProcessedDocument } from '@/services/pdfProcessor';

type WorkMode = 'program' | 'results';
type ProgramPreview = Omit<ProcessedDocument, 'rawText'> & { preview: boolean };
type IngestResult = {
  success: boolean;
  hash: string;
  trackId?: string;
  meetingId?: string;
  racesUpserted?: number;
  entriesUpserted?: number;
  warnings?: string[];
};

export default function AdminIngestPage() {
  const [workMode, setWorkMode] = useState<WorkMode>('program');
  const [programFile, setProgramFile] = useState<File | null>(null);
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/perfil" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm font-medium transition-colors shrink-0">
              <span className="text-base leading-none">←</span>
              <span className="hidden sm:inline">Panel</span>
            </Link>
            <span className="text-2xl">🏇</span>
            <div>
              <h1 className="text-xl font-bold text-white">Desafío Hípico</h1>
              <p className="text-xs text-gray-400">Panel de Administración · Ingestión INH</p>
            </div>
          </div>
          <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
            <ModeBtn active={workMode === 'program'} onClick={() => setWorkMode('program')} icon="📋" label="Programa" />
            <ModeBtn active={workMode === 'results'} onClick={() => setWorkMode('results')} icon="🏆" label="Resultados" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div style={{ display: workMode === 'program' ? undefined : 'none' }}>
          <ProgramTab file={programFile} onFileChange={setProgramFile} />
        </div>
        <div style={{ display: workMode === 'results' ? undefined : 'none' }}>
          <ResultsTab />
        </div>
      </main>
    </div>
  );
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${active ? 'bg-amber-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
      {icon} {label}
    </button>
  );
}

function ProgramTab({ file, onFileChange }: { file: File | null; onFileChange: (f: File | null) => void }) {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<ProgramPreview | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { onFileChange(dropped); setPreview(null); setResult(null); setError(''); }
  }, [onFileChange]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { onFileChange(f); setPreview(null); setResult(null); setError(''); }
  };

  async function callIngest(previewMode: boolean) {
    if (!file) { setError('Selecciona un archivo PDF primero.'); return; }
    setError(''); setLoading(true);
    setLoadingMsg(previewMode ? 'Extrayendo datos del PDF...' : 'Guardando en base de datos...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = previewMode ? '/api/admin/ingest?preview=true' : '/api/admin/ingest';
      const res = await fetch(url, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en el servidor');
      if (previewMode) { setPreview(data); } else { setResult(data); setPreview(null); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Error desconocido'); }
    finally { setLoading(false); setLoadingMsg(''); }
  }

  function reset() { onFileChange(null); setPreview(null); setResult(null); setError(''); if (inputRef.current) inputRef.current.value = ''; }
  const totalEntries = preview?.races.reduce((s, r) => s + r.entries.length, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white">Carga de Programa Oficial INH</h2>
        <p className="text-xs text-gray-500 mt-0.5">Sube el PDF de inscritos. El sistema extrae carreras, ejemplares, jockeys y entrenadores automáticamente.</p>
      </div>

      {!result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center h-52 rounded-2xl border-2 border-dashed cursor-pointer transition-all select-none ${dragging ? 'border-amber-400 bg-amber-950/20 scale-[1.01]' : file ? 'border-green-600 bg-green-950/10' : 'border-gray-700 bg-gray-900 hover:border-amber-600 hover:bg-amber-950/10'}`}
        >
          <input ref={inputRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileChange} />
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-amber-400 font-medium">{loadingMsg}</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center gap-2">
              <span className="text-5xl">📄</span>
              <p className="text-sm font-semibold text-green-400">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB · Haz clic para cambiar</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="text-5xl">⬆️</span>
              <p className="text-sm font-semibold text-gray-300">Arrastra el PDF aquí o haz clic para seleccionar</p>
              <p className="text-xs text-gray-600">Formato: Programa Oficial INH (.pdf)</p>
            </div>
          )}
        </div>
      )}

      {error && <div className="flex items-start gap-2 text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-xl px-4 py-3"><span>⚠️</span><span>{error}</span></div>}

      {!result && (
        <div className="flex flex-wrap gap-3">
          <Btn onClick={() => callIngest(true)} disabled={loading || !file} color="amber">🔍 Previsualizar Extracción</Btn>
          {preview && <Btn onClick={() => callIngest(false)} disabled={loading} color="green">✅ Confirmar e Importar</Btn>}
          {(file || preview) && <Btn onClick={reset} disabled={loading} color="gray">🔄 Limpiar</Btn>}
        </div>
      )}

      {result && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="bg-green-900/30 border-b border-green-800/50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-green-400">Importación Completada</p>
                <p className="text-xs text-gray-400">{file?.name} · hash: {result.hash}</p>
              </div>
            </div>
            <Btn onClick={reset} color="gray">📂 Nueva Carga</Btn>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-800">
            <SummaryCell icon="🏟️" label="Hipódromo" value={result.trackId ? 'Registrado' : '—'} sub={result.trackId?.slice(-8)} />
            <SummaryCell icon="📅" label="Reunión" value={result.meetingId ? 'Registrada' : '—'} sub={result.meetingId?.slice(-8)} />
            <SummaryCell icon="🏁" label="Carreras" value={String(result.racesUpserted ?? 0)} sub="importadas" highlight />
            <SummaryCell icon="🐎" label="Ejemplares" value={String(result.entriesUpserted ?? 0)} sub="importados" highlight />
          </div>
          {result.warnings && result.warnings.length > 0 && <div className="px-6 py-4 border-t border-gray-800"><WarningList warnings={result.warnings} /></div>}
        </div>
      )}

      {preview && !result && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">🔍 Previsualización — Datos Extraídos</h3>
              <span className="text-xs text-gray-600 font-mono">hash: {preview.hash}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Stat label="Hipódromo" value={preview.meeting.track.name} />
              <Stat label="Reunión N°" value={String(preview.meeting.meetingNumber || '—')} />
              <Stat label="Fecha" value={preview.meeting.date ? new Date(preview.meeting.date).toLocaleDateString('es-VE') : '—'} />
              <Stat label="Carreras" value={String(preview.races.length)} accent />
              <Stat label="Ejemplares" value={String(totalEntries)} accent />
            </div>
          </div>
          {preview.warnings.length > 0 && <WarningList warnings={preview.warnings} />}
          {preview.races.length === 0 ? (
            <div className="bg-gray-900 border border-amber-800/50 rounded-xl p-8 text-center">
              <p className="text-amber-400 font-medium">No se detectaron carreras</p>
              <p className="text-xs text-gray-500 mt-1">El PDF puede tener un formato diferente al esperado.</p>
            </div>
          ) : preview.races.map((rb) => <RacePreviewCard key={rb.race.raceNumber} rb={rb} />)}
        </div>
      )}
    </div>
  );
}

function RacePreviewCard({ rb }: { rb: ProcessedDocument['races'][0] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 bg-gray-800/60 hover:bg-gray-800 transition-colors border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="bg-amber-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">C{rb.race.raceNumber}</span>
          {rb.race.annualRaceNumber && <span className="text-xs text-gray-500">Anual #{rb.race.annualRaceNumber}</span>}
          <span className="text-sm font-semibold text-white">{rb.race.distance > 0 ? `${rb.race.distance} mts` : '— mts'}</span>
          {rb.race.scheduledTime && <span className="text-xs text-gray-400">🕐 {rb.race.scheduledTime}</span>}
          {rb.race.llamado != null && <span className="text-xs text-gray-500">Llamado {rb.race.llamado}</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-3 text-xs text-gray-400">
            {rb.race.prizePool.bs > 0 && <span>Bs. {rb.race.prizePool.bs.toLocaleString()}</span>}
            {rb.race.bonoPrimerCriador != null && <span className="text-gray-600">Bono: {rb.race.bonoPrimerCriador.toLocaleString()}</span>}
            <span className="text-gray-600">{rb.entries.length} ej.</span>
          </div>
          <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>
      {open && (
        <>
          {rb.race.conditions && (
            <div className="px-5 py-2 bg-gray-900 border-b border-gray-800/50">
              <p className="text-xs text-gray-400 italic">{rb.race.conditions}</p>
            </div>
          )}
          {rb.race.games.length > 0 && (
            <div className="px-5 py-2 bg-gray-900 border-b border-gray-800/50 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-600 uppercase">Juegos:</span>
              {rb.race.games.map(g => (
                <span key={g} className="text-xs bg-gray-800 text-amber-400 px-2 py-0.5 rounded font-medium">{g}</span>
              ))}
            </div>
          )}
          {rb.entries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-800 bg-gray-900/50">
                    <th className="px-3 py-2 text-center w-8">N°</th>
                    <th className="px-3 py-2 text-left">Ejemplar</th>
                    <th className="px-3 py-2 text-center">Medic.</th>
                    <th className="px-3 py-2 text-center">Kilos</th>
                    <th className="px-3 py-2 text-left">Jinete</th>
                    <th className="px-3 py-2 text-left hidden md:table-cell">Implementos</th>
                    <th className="px-3 py-2 text-left hidden md:table-cell">Entrenador</th>
                    <th className="px-3 py-2 text-center">P.P.</th>
                  </tr>
                </thead>
                <tbody>
                  {rb.entries.map((entry) => (
                    <tr key={entry.dorsalNumber} className="border-b border-gray-800/40 hover:bg-gray-800/30 transition-colors">
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-700 rounded text-xs font-bold">{entry.dorsalNumber}</span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-white">{entry.horse.name}</td>
                      <td className="px-3 py-2.5 text-center">
                        {entry.medication
                          ? <span className="text-xs bg-blue-950/60 text-blue-300 px-1.5 py-0.5 rounded font-mono">{entry.medication}</span>
                          : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-gray-300 font-mono text-xs">{entry.weightRaw ?? entry.weight}</td>
                      <td className="px-3 py-2.5 text-gray-200 text-xs">{entry.jockey.name}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs font-mono hidden md:table-cell">{entry.implements || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-400 text-xs hidden md:table-cell">{entry.trainer.name}</td>
                      <td className="px-3 py-2.5 text-center text-gray-400 text-xs font-mono">{entry.postPosition}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-gray-600 italic">No se extrajeron ejemplares para esta carrera.</p>
          )}
          {rb.failedLines && rb.failedLines.length > 0 && (
            <div className="px-5 py-3 border-t border-orange-900/40 bg-orange-950/10">
              <p className="text-xs font-semibold text-orange-400 mb-1.5">⚠️ {rb.failedLines.length} línea{rb.failedLines.length > 1 ? 's' : ''} no pudo parsearse:</p>
              <div className="space-y-1">
                {rb.failedLines.map((l, i) => (
                  <p key={i} className="text-xs font-mono text-orange-300/70 bg-gray-900 rounded px-2 py-1 break-all">{l}</p>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

interface FinishRow {
  dorsalNumber: number; horseName: string; finishPosition: number;
  distanceMargin: string; isDistanced: boolean; isScratched: boolean; scratchReason: string;
}
interface PayoutRow { combination: string; amount: string; }
interface PayoutsEdit {
  winner: PayoutRow[]; exacta: PayoutRow[]; trifecta: PayoutRow[];
  superfecta: PayoutRow[]; quinela: PayoutRow[]; dobleSeleccion: PayoutRow[];
}
const PAYOUT_LABELS: Record<string, string> = {
  winner: 'Ganador', exacta: 'Exacta', trifecta: 'Trifecta',
  superfecta: 'Superfecta', quinela: 'Quiniela', dobleSeleccion: 'Doble Selección',
};
function emptyPayouts(): PayoutsEdit {
  return { winner: [], exacta: [], trifecta: [], superfecta: [], quinela: [], dobleSeleccion: [] };
}

function ResultsTab() {
  const [meetings, setMeetings] = useState<{ _id: string; meetingNumber: number; date: string; trackId?: { name?: string } }[]>([]);
  const [meetingId, setMeetingId] = useState('');
  const [raceNumber, setRaceNumber] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedOk, setSavedOk] = useState(false);
  const [finishOrder, setFinishOrder] = useState<FinishRow[]>([]);
  const [officialTime, setOfficialTime] = useState('');
  const [payouts, setPayouts] = useState<PayoutsEdit>(emptyPayouts());
  const [extracted, setExtracted] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useState(() => {
    fetch('/api/meetings/recent?limit=20').then(r => r.json()).then(d => {
      const list = d.meetings ?? [];
      setMeetings(list);
      if (list.length > 0) setMeetingId(list[0]._id);
    });
  });

  function addImages(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    setImages(prev => [...prev, ...arr].slice(0, 3));
  }

  async function handleExtract() {
    if (!images.length) { setError('Sube al menos una imagen.'); return; }
    if (!meetingId || !raceNumber) { setError('Selecciona reunión y número de carrera.'); return; }
    setError(''); setExtracting(true); setExtracted(false); setSavedOk(false);
    try {
      const fd = new FormData();
      images.forEach(f => fd.append('images', f));
      const res = await fetch('/api/admin/results/extract', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error extrayendo resultados');
      const r = data.result;
      const rows: FinishRow[] = (r.finishOrder ?? []).map((e: any) => ({
        dorsalNumber: e.dorsalNumber ?? 0, horseName: e.horseName ?? '',
        finishPosition: e.finishPosition ?? 0, distanceMargin: e.distanceMargin ?? '',
        isDistanced: e.isDistanced ?? false, isScratched: e.isScratched ?? false, scratchReason: '',
      }));
      setFinishOrder(rows);
      setOfficialTime(r.officialTime ?? '');
      const p = emptyPayouts();
      for (const key of Object.keys(p) as (keyof PayoutsEdit)[]) {
        const src = r.payouts?.[key];
        if (Array.isArray(src)) p[key] = src.map((x: any) => ({ combination: String(x.combination ?? ''), amount: String(x.amount ?? '') }));
      }
      setPayouts(p);
      if (r.raceNumber && !raceNumber) setRaceNumber(String(r.raceNumber));
      setExtracted(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error desconocido'); }
    finally { setExtracting(false); }
  }

  function updateRow(idx: number, field: keyof FinishRow, value: string | boolean | number) {
    setFinishOrder(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }
  function updatePayout(type: keyof PayoutsEdit, idx: number, field: 'combination' | 'amount', value: string) {
    setPayouts(prev => ({ ...prev, [type]: prev[type].map((r, i) => i === idx ? { ...r, [field]: value } : r) }));
  }
  function addPayoutRow(type: keyof PayoutsEdit) {
    setPayouts(prev => ({ ...prev, [type]: [...prev[type], { combination: '', amount: '' }] }));
  }
  function removePayoutRow(type: keyof PayoutsEdit, idx: number) {
    setPayouts(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    if (!meetingId || !raceNumber || !finishOrder.length) return;
    setSaving(true); setError(''); setSavedOk(false);
    try {
      const payoutsPayload: Record<string, { combination: string; amount: number }[]> = {};
      for (const [key, rows] of Object.entries(payouts)) {
        const valid = (rows as PayoutRow[]).filter(r => r.combination && r.amount);
        if (valid.length) payoutsPayload[key] = valid.map((r: PayoutRow) => ({ combination: r.combination, amount: parseFloat(r.amount) }));
      }
      const res = await fetch('/api/admin/results/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId, raceNumber: parseInt(raceNumber), officialTime: officialTime || undefined,
          finishOrder: finishOrder.map(r => ({
            dorsalNumber: r.dorsalNumber, finishPosition: r.finishPosition,
            distanceMargin: r.distanceMargin || undefined, isDistanced: r.isDistanced,
            isScratched: r.isScratched, scratchReason: r.scratchReason || undefined,
          })),
          payouts: Object.keys(payoutsPayload).length ? payoutsPayload : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando');
      setSavedOk(true);
      setImages([]); setExtracted(false); setFinishOrder([]); setPayouts(emptyPayouts()); setOfficialTime('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Error desconocido'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white">Carga de Resultados Oficiales</h2>
        <p className="text-xs text-gray-500 mt-0.5">Sube las imágenes del INH. Gemini extrae los datos automáticamente para revisión y confirmación.</p>
      </div>

      {/* Step 1 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">1. Reunión y carrera</p>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-gray-500 mb-1 block">Reunión</label>
            <select value={meetingId} onChange={e => setMeetingId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500">
              {meetings.map(m => (
                <option key={m._id} value={m._id}>
                  R{m.meetingNumber} — {m.trackId?.name ?? 'Hipódromo'} — {new Date(m.date).toLocaleDateString('es-VE')}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="text-xs text-gray-500 mb-1 block">N° Carrera</label>
            <input type="number" min="1" max="15" value={raceNumber} onChange={e => setRaceNumber(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-500"
              placeholder="3" />
          </div>
        </div>
      </div>

      {/* Step 2 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">2. Imágenes (máx. 3)</p>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addImages(e.dataTransfer.files); }}
          onClick={() => imgInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? 'border-amber-500 bg-amber-950/20' : 'border-gray-700 hover:border-gray-500'}`}
        >
          <input ref={imgInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { if (e.target.files) addImages(e.target.files); }} />
          <p className="text-gray-400 text-sm">📷 Arrastra las imágenes aquí o haz clic</p>
          <p className="text-xs text-gray-600 mt-1">Orden de llegada · Dividendos · Foto finish</p>
        </div>
        {images.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {images.map((f, i) => (
              <div key={i} className="relative group">
                <img src={URL.createObjectURL(f)} alt={f.name} className="w-28 h-20 object-cover rounded-lg border border-gray-700" />
                <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
              </div>
            ))}
          </div>
        )}
        {error && <div className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-2">⚠️ {error}</div>}
        {savedOk && <div className="text-green-400 text-sm bg-green-950/40 border border-green-800 rounded-lg px-4 py-2">✅ Resultado guardado correctamente.</div>}
        <div className="flex gap-3">
          <Btn onClick={handleExtract} disabled={extracting || !images.length || !meetingId || !raceNumber} color="amber">
            {extracting ? <><span className="w-4 h-4 rounded-full border-2 border-amber-300 border-t-transparent animate-spin inline-block" /> Extrayendo...</> : '🤖 Extraer con IA'}
          </Btn>
          {extracted && <Btn onClick={() => { setExtracted(false); setFinishOrder([]); setPayouts(emptyPayouts()); setImages([]); setOfficialTime(''); setSavedOk(false); }} color="gray">🔄 Nueva carrera</Btn>}
        </div>
      </div>

      {/* Step 3: Editable table */}
      {extracted && finishOrder.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-800/60 border-b border-gray-700 flex items-center justify-between">
            <p className="text-sm font-bold text-amber-400">📋 Orden de llegada — C{raceNumber} (editable)</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Tiempo oficial:</span>
              <input value={officialTime} onChange={e => setOfficialTime(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-200 w-20 focus:outline-none focus:border-amber-500"
                placeholder="1:12.4" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-800 bg-gray-900/50">
                  <th className="px-3 py-2 text-center">Pos.</th>
                  <th className="px-3 py-2 text-center">Dorsal</th>
                  <th className="px-3 py-2 text-left">Ejemplar</th>
                  <th className="px-3 py-2 text-center">Cuerpos</th>
                  <th className="px-3 py-2 text-center" title="Distanciado">Dist.</th>
                  <th className="px-3 py-2 text-center" title="Retirado post-carrera">Ret.</th>
                  <th className="px-3 py-2 text-left">Motivo retiro</th>
                </tr>
              </thead>
              <tbody>
                {finishOrder.map((row, idx) => (
                  <tr key={idx} className={`border-b border-gray-800/40 ${row.isScratched ? 'opacity-50 bg-red-950/10' : row.isDistanced ? 'bg-orange-950/10' : ''}`}>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min="1" value={row.finishPosition}
                        onChange={e => updateRow(idx, 'finishPosition', parseInt(e.target.value) || 0)}
                        className="w-12 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-center text-white focus:outline-none focus:border-amber-500" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min="1" value={row.dorsalNumber}
                        onChange={e => updateRow(idx, 'dorsalNumber', parseInt(e.target.value) || 0)}
                        className="w-12 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-center text-gray-300 focus:outline-none" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={row.horseName} onChange={e => updateRow(idx, 'horseName', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-500" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input value={row.distanceMargin} onChange={e => updateRow(idx, 'distanceMargin', e.target.value)}
                        className="w-16 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-300 focus:outline-none" placeholder="1 cpo" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={row.isDistanced} onChange={e => updateRow(idx, 'isDistanced', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={row.isScratched} onChange={e => updateRow(idx, 'isScratched', e.target.checked)} className="w-4 h-4 accent-red-500" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={row.scratchReason} onChange={e => updateRow(idx, 'scratchReason', e.target.value)} disabled={!row.isScratched}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-400 focus:outline-none disabled:opacity-30" placeholder="peso, aparato..." />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payouts */}
          <div className="p-5 border-t border-gray-800">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dividendos Oficiales</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(payouts) as (keyof PayoutsEdit)[]).map(type => (
                <div key={type} className="bg-gray-800/50 rounded-lg overflow-hidden">
                  <div className="px-3 py-1.5 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase">{PAYOUT_LABELS[type]}</span>
                    <button onClick={() => addPayoutRow(type)} className="text-xs text-gray-500 hover:text-amber-400">+ añadir</button>
                  </div>
                  {payouts[type].length === 0
                    ? <p className="px-3 py-2 text-xs text-gray-600 italic">Sin dividendo</p>
                    : payouts[type].map((row, i) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-1 border-b border-gray-700/50 last:border-0">
                        <input value={row.combination} onChange={e => updatePayout(type, i, 'combination', e.target.value)}
                          className="flex-1 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-300 font-mono focus:outline-none" placeholder="5-3" />
                        <span className="text-xs text-gray-600">Bs.</span>
                        <input value={row.amount} onChange={e => updatePayout(type, i, 'amount', e.target.value)}
                          className="w-24 bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-green-400 font-mono focus:outline-none" placeholder="1500" />
                        <button onClick={() => removePayoutRow(type, i)} className="text-gray-600 hover:text-red-400 text-xs px-1">×</button>
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="px-5 py-4 border-t border-gray-800 flex gap-3">
            <Btn onClick={handleSave} disabled={saving || !finishOrder.length} color="green">
              {saving ? <><span className="w-4 h-4 rounded-full border-2 border-green-300 border-t-transparent animate-spin inline-block" /> Guardando...</> : '✅ Confirmar y Guardar'}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Shared UI ────────────────────────────────────────────────────────────────

function Btn({ onClick, disabled, color, children }: { onClick: () => void; disabled?: boolean; color: 'amber' | 'green' | 'gray'; children: React.ReactNode }) {
  const c = { amber: 'bg-amber-600 hover:bg-amber-500', green: 'bg-green-700 hover:bg-green-600', gray: 'bg-gray-700 hover:bg-gray-600' };
  return (
    <button onClick={onClick} disabled={disabled} className={`flex items-center gap-2 px-5 py-2.5 ${c[color]} disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors`}>
      {children}
    </button>
  );
}

function SummaryCell({ icon, label, value, sub, highlight }: { icon: string; label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className="px-6 py-5 text-center">
      <p className="text-2xl mb-1">{icon}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-amber-400' : 'text-white'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-600 font-mono mt-0.5">{sub}</p>}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 truncate ${accent ? 'text-amber-400' : 'text-white'}`}>{value || '—'}</p>
    </div>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  return (
    <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-4">
      <p className="text-xs font-semibold text-amber-400 mb-2">⚠️ Advertencias del procesador</p>
      <ul className="space-y-1">
        {warnings.map((w, i) => <li key={i} className="text-xs text-amber-300/80">· {w}</li>)}
      </ul>
    </div>
  );
}
