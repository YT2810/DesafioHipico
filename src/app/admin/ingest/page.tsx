'use client';

import { useState, useCallback, useRef } from 'react';
import type { ProcessedDocument } from '@/services/pdfProcessor';
import type { ImageResultDocument } from '@/services/dataIngestion';

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
        </>
      )}
    </div>
  );
}

function ResultsTab() {
  const [jsonText, setJsonText] = useState('');
  const [parsed, setParsed] = useState<ImageResultDocument | null>(null);
  const [error, setError] = useState('');

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonText(await file.text());
    setParsed(null);
  }

  function handleParse() {
    setError(''); setParsed(null);
    try {
      const doc = JSON.parse(jsonText) as ImageResultDocument;
      if (!doc.races) throw new Error('El JSON no tiene el campo "races".');
      setParsed(doc);
    } catch (e) { setError(e instanceof Error ? e.message : 'JSON inválido'); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white">Carga de Resultados Oficiales</h2>
        <p className="text-xs text-gray-500 mt-0.5">Próximamente: carga de foto finish y dividendos. Por ahora acepta JSON estructurado.</p>
      </div>
      <section className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg cursor-pointer text-sm text-gray-300 transition-colors">
            📁 Cargar JSON
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>
          <span className="text-xs text-gray-600">o pega el JSON directamente</span>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => { setJsonText(e.target.value); setParsed(null); }}
          placeholder={'{ "meetingNumber": 8, "trackName": "LA RINCONADA", "date": "2026-02-15", "races": [...] }'}
          className="w-full h-44 bg-gray-950 border border-gray-700 rounded-xl p-3 text-sm font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500 resize-none"
        />
        {error && <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-2"><span>⚠️</span>{error}</div>}
        <div className="flex gap-3">
          <Btn onClick={handleParse} disabled={!jsonText.trim()} color="amber">🔍 Previsualizar Resultados</Btn>
          {parsed && <Btn onClick={() => { setJsonText(''); setParsed(null); }} color="gray">🔄 Limpiar</Btn>}
        </div>
      </section>
      {parsed && <ResultsPreviewPanel doc={parsed} />}
    </div>
  );
}

function ResultsPreviewPanel({ doc }: { doc: ImageResultDocument }) {
  const LABELS: Record<string, string> = {
    winner: 'Ganador', exacta: 'Exacta', trifecta: 'Trifecta',
    superfecta: 'Superfecta', quinela: 'Quiniela', dobleSeleccion: 'Doble Selección',
  };
  return (
    <section className="space-y-4">
      <h3 className="text-base font-bold text-amber-400">🏆 Resultados — Previsualización</h3>
      {doc.races.map((race) => (
        <div key={race.raceNumber} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-gray-800/60 border-b border-gray-700">
            <span className="bg-amber-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">C{race.raceNumber}</span>
            {race.officialTime && <span className="text-xs text-gray-400">⏱ {race.officialTime}</span>}
          </div>
          {race.entries.length > 0 && (
            <div className="overflow-x-auto border-b border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                    <th className="px-4 py-2 text-left">Pos.</th>
                    <th className="px-4 py-2 text-left">Dorsal</th>
                    <th className="px-4 py-2 text-left">Tiempo</th>
                    <th className="px-4 py-2 text-left">Cuerpos</th>
                    <th className="px-4 py-2 text-right">Dividendo</th>
                  </tr>
                </thead>
                <tbody>
                  {[...race.entries]
                    .sort((a, b) => (a.isScratched ? 1 : 0) - (b.isScratched ? 1 : 0) || (a.finishPosition ?? 99) - (b.finishPosition ?? 99))
                    .map((entry) => (
                      <tr key={entry.dorsalNumber} className={`border-b border-gray-800/50 ${entry.isScratched ? 'opacity-40' : 'hover:bg-gray-800/30'} transition-colors`}>
                        <td className="px-4 py-2.5">
                          {entry.isScratched
                            ? <span className="text-xs font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded">RET</span>
                            : <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${entry.finishPosition === 1 ? 'bg-amber-500 text-black' : entry.finishPosition === 2 ? 'bg-gray-400 text-black' : entry.finishPosition === 3 ? 'bg-amber-800 text-white' : 'bg-gray-700 text-white'}`}>{entry.finishPosition ?? '—'}</span>}
                        </td>
                        <td className="px-4 py-2.5 font-bold text-white">{entry.dorsalNumber}</td>
                        <td className="px-4 py-2.5 text-gray-300 font-mono text-xs">{entry.officialTime || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{entry.distanceMargin || '—'}</td>
                        <td className="px-4 py-2.5 text-right text-amber-400 font-mono text-xs">{entry.finalOdds != null ? `${entry.finalOdds}x` : '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          {race.payouts && Object.keys(race.payouts).length > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dividendos Oficiales</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(race.payouts).map(([type, rows]) =>
                  rows && rows.length > 0 ? (
                    <div key={type} className="bg-gray-800/50 rounded-lg overflow-hidden">
                      <div className="px-3 py-1.5 bg-gray-800 border-b border-gray-700">
                        <span className="text-xs font-bold text-amber-400 uppercase">{LABELS[type] ?? type}</span>
                      </div>
                      <table className="w-full text-xs">
                        <tbody>
                          {rows.map((row, i) => (
                            <tr key={i} className="border-b border-gray-700/50 last:border-0">
                              <td className="px-3 py-1.5 text-gray-300 font-mono">{row.combination}</td>
                              <td className="px-3 py-1.5 text-right text-green-400 font-bold font-mono">Bs. {row.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </section>
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
