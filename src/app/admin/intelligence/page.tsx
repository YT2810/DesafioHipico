'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { KNOWN_SOURCES } from '@/lib/knownSources';

const GOLD = '#D4AF37';

type InputType = 'youtube' | 'social_text' | 'image_ocr';

interface ResolvedMark {
  preferenceOrder: number;
  rawName?: string;
  rawLabel?: string | null;
  resolvedHorseName: string | null;
  resolvedEntryId: string | null;
  dorsalNumber?: number;
  label: string | null;
  matchConfidence: number;
}

interface DbEntry {
  dorsal: number;
  horseName: string;
  entryId: string;
}

interface ResolvedForecast {
  raceNumber: number;
  hasOrder: boolean;
  expertName: string | null;
  raceId: string | null;
  marks: ResolvedMark[];
  dbEntries: DbEntry[];
}

interface ProcessResult {
  success: boolean;
  inputType: InputType;
  meetingDate: string | null;
  meetingNumber: number | null;
  meetingId: string | null;
  meetingLabel: string | null;
  forecasts: ResolvedForecast[];
  contentHash: string;
  alreadyIngested: boolean;
  rawTranscript: string | null;
  warning?: string | null;
}

interface Meeting {
  id: string;
  meetingNumber: number;
  date: string;
  trackName?: string;
}

interface ExpertOption {
  _id: string;
  name: string;
  platform: string;
  handle?: string;
  totalForecasts: number;
}

const PLATFORMS = ['YouTube', 'X', 'Instagram', 'Revista', 'Telegram', 'Otro'] as const;
type Platform = typeof PLATFORMS[number];

const LABEL_COLORS: Record<string, string> = {
  'Línea': 'bg-blue-900/60 text-blue-300 border-blue-700',
  'Casi Fijo': 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  'Súper Especial': 'bg-purple-900/60 text-purple-300 border-purple-700',
  'Buen Dividendo': 'bg-green-900/60 text-green-300 border-green-700',
  'Batacazo': 'bg-red-900/60 text-red-300 border-red-700',
};

const FORECAST_LABELS = ['Línea', 'Casi Fijo', 'Súper Especial', 'Buen Dividendo', 'Batacazo'];

const YOUTUBE_PROMPT = `Eres un extractor de pronósticos hípicos venezolanos. Analiza este video y extrae ÚNICAMENTE los caballos que el pronosticador recomienda jugar en cada carrera.

REGLAS:
- Solo incluye caballos que el pronosticador DA como selección
- Palabras de inclusión: "me gusta", "lo juego", "fijo", "línea", "lo acompaño", "trilogía", "fórmula", "calidad de lance", "la primera opción"
- Palabras de exclusión: "no me gusta", "lo descarto", "está difícil", "su enemigo", "rival"
- Si da una fórmula numérica (ej: "127") y menciona los nombres en orden, asigna los dorsales en ese orden
- Si no sabes el dorsal con certeza, omítelo y pon solo el nombre
- Si una carrera no tiene selección clara, omítela
- Incluye etiquetas verbatim si las menciona: "Fijo", "Línea", "Línea atrevida", "lo acompaño"

FORMATO DE SALIDA (una carrera por línea, sin explicaciones):
1C) [dorsal] [nombre] / [dorsal] [nombre]
2C) [dorsal] [nombre]
1V) [dorsal] [nombre] Línea / [dorsal] [nombre]
(donde C = carrera normal, V = válida del 5y6)

Ejemplo de salida:
1C) El Relámpago
3C) 1 Nuestra Victoria / 2 Mi Catira Emma / 7 La Dama
1V) 6 Celestia Línea atrevida

Empieza el análisis ahora. Solo devuelve el formato de salida, sin explicaciones.`;

function YouTubeManualPanel({ videoUrl }: { videoUrl: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(YOUTUBE_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-yellow-950/40 border border-yellow-700/50 rounded-xl px-4 py-4 space-y-3">
      <p className="text-sm font-bold text-yellow-400">📋 Este video no tiene transcripción automática</p>
      <p className="text-xs text-yellow-200">Usa Google AI Studio para analizarlo directamente (gratis):</p>
      <ol className="text-xs text-yellow-200 space-y-1.5 list-decimal list-inside">
        <li>Abre <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline">aistudio.google.com</a> con tu cuenta Google</li>
        <li>Nuevo chat → modelo <strong>Gemini 2.0 Flash</strong> o <strong>2.5 Flash</strong></li>
        <li>Clic en <strong>"+"</strong> → <strong>"YouTube URL"</strong> → pega el link del video</li>
        <li>Copia el prompt de abajo y envíalo</li>
        <li>Copia el resultado y pégalo aquí como texto</li>
      </ol>
      <div className="flex gap-2">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-red-400 hover:text-red-300 bg-red-950/40 border border-red-800/40 px-3 py-1.5 rounded-lg"
        >
          ▶ Abrir video
        </a>
        <button
          onClick={handleCopy}
          className="text-xs font-bold text-black px-3 py-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: copied ? '#22c55e' : '#D4AF37' }}
        >
          {copied ? '✓ Copiado' : '📋 Copiar prompt'}
        </button>
      </div>
      <details className="text-xs text-yellow-700">
        <summary className="cursor-pointer hover:text-yellow-500 select-none">Ver prompt completo</summary>
        <pre className="mt-2 whitespace-pre-wrap text-yellow-600 bg-black/20 rounded p-2 text-[10px] leading-relaxed">{YOUTUBE_PROMPT}</pre>
      </details>
    </div>
  );
}

export default function IntelligencePage() {
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState('');

  // Expert info
  const [expertName, setExpertName] = useState('');
  const [platform, setPlatform] = useState<Platform>('YouTube');
  const [handle, setHandle] = useState('');

  // Editable forecasts
  const [editableForecasts, setEditableForecasts] = useState<ResolvedForecast[]>([]);

  // Existing experts
  const [existingExperts, setExistingExperts] = useState<ExpertOption[]>([]);
  const [selectedExpertId, setSelectedExpertId] = useState<string>('__new__');

  const [sourceUrl, setSourceUrl] = useState('');

  // ── Scratch panel ──────────────────────────────────────────────────────────
  interface ScratchEntry { entryId: string; dorsal: number; horseName: string; isScratched: boolean; scratchedBy?: string | null; }
  const [scratchRaces, setScratchRaces] = useState<{ raceId: string; raceNumber: number }[]>([]);
  const [scratchRaceId, setScratchRaceId] = useState('');
  const [scratchEntries, setScratchEntries] = useState<ScratchEntry[]>([]);
  const [scratchOpen, setScratchOpen] = useState(false);
  const [scratchLoading, setScratchLoading] = useState(false);

  async function loadScratchRaces(meetingId: string) {
    if (!meetingId) return;
    const r = await fetch(`/api/meetings/${meetingId}/races`).then(r => r.json()).catch(() => ({ races: [] }));
    setScratchRaces((r.races ?? []).map((x: any) => ({ raceId: x.id, raceNumber: x.raceNumber })));
    setScratchRaceId('');
    setScratchEntries([]);
  }

  async function loadScratchEntries(raceId: string) {
    if (!raceId) return;
    setScratchLoading(true);
    const r = await fetch(`/api/admin/races/${raceId}/entries`).then(r => r.json()).catch(() => ({ entries: [] }));
    setScratchEntries(r.entries ?? []);
    setScratchLoading(false);
  }

  async function toggleScratch(entry: ScratchEntry) {
    const action = entry.isScratched ? 'restore' : 'scratch';
    const label = entry.isScratched ? 'restaurar' : 'RETIRAR';
    const confirmed = window.confirm(
      `⚠️ ¿Confirmas ${label} el ejemplar #${entry.dorsal} ${entry.horseName}?\n\nEsta acción quedará registrada con tu usuario.`
    );
    if (!confirmed) return;
    const res = await fetch(`/api/admin/races/${scratchRaceId}/scratch`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId: entry.entryId, action }),
    });
    if (res.ok) {
      setScratchEntries(prev => prev.map(e =>
        e.entryId === entry.entryId ? { ...e, isScratched: !e.isScratched } : e
      ));
    } else {
      alert('Error al actualizar el ejemplar.');
    }
  }

  // Publish state
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishError, setPublishError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load meetings and existing experts on mount
  useEffect(() => {
    fetch('/api/meetings/upcoming?limit=20')
      .then(r => r.json())
      .then(d => setMeetings(d.meetings ?? d ?? []))
      .catch(() => {});
    fetch('/api/admin/intelligence/experts')
      .then(r => r.json())
      .then(d => setExistingExperts(d.experts ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => { if (selectedMeetingId) loadScratchRaces(selectedMeetingId); }, [selectedMeetingId]);
  useEffect(() => { if (scratchRaceId) loadScratchEntries(scratchRaceId); }, [scratchRaceId]);

  const detectInputType = (val: string): InputType => {
    if (/youtube\.com|youtu\.be/.test(val)) return 'youtube';
    if (val.startsWith('data:image/')) return 'image_ocr';
    return 'social_text';
  };

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      // Compress image client-side to stay under payload limits
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setImagePreview(compressed);
        setInput(compressed);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleImageUpload(file);
  }, [handleImageUpload]);

  async function handleProcess() {
    if (!input.trim()) return;
    setProcessing(true);
    setError('');
    setResult(null);
    setPublished(false);
    setPublishError('');

    try {
      const res = await fetch('/api/admin/intelligence/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim(), meetingId: selectedMeetingId || undefined }),
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch {
        throw new Error(`Error del servidor (${res.status}): ${text.slice(0, 300) || '(respuesta vacía)'}`);
      }
      if (!res.ok) throw new Error(data.error ?? 'Error al procesar.');

      setResult(data);
      setEditableForecasts(data.forecasts);
      if (data.meetingId && !selectedMeetingId) setSelectedMeetingId(data.meetingId);

      const inputType = detectInputType(input);
      if (inputType === 'youtube') setPlatform('YouTube');
      else if (inputType === 'image_ocr') setPlatform('Revista');

      // Auto-fill expert from Gemini detection
      const detectedName = data.forecasts?.[0]?.expertName;
      if (detectedName) {
        const match = existingExperts.find(
          e => e.name.toLowerCase().trim() === detectedName.toLowerCase().trim()
        );
        if (match) {
          setSelectedExpertId(match._id);
          setExpertName(match.name);
          setPlatform(match.platform as Platform);
          setHandle(match.handle ?? '');
        } else {
          setSelectedExpertId('__new__');
          setExpertName(detectedName);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  }

  function updateMark(fcIdx: number, markIdx: number, field: keyof ResolvedMark, value: any) {
    setEditableForecasts(prev => prev.map((fc, fi) => fi !== fcIdx ? fc : {
      ...fc,
      marks: fc.marks.map((m, mi) => mi !== markIdx ? m : { ...m, [field]: value }),
    }));
  }

  function removeMark(fcIdx: number, markIdx: number) {
    setEditableForecasts(prev => prev.map((fc, fi) => fi !== fcIdx ? fc : {
      ...fc,
      marks: fc.marks.filter((_, mi) => mi !== markIdx).map((m, i) => ({ ...m, preferenceOrder: i + 1 })),
    }));
  }

  async function handlePublish() {
    if (!result || !expertName.trim()) {
      setPublishError('Ingresa el nombre del experto antes de publicar.');
      return;
    }
    if (!selectedMeetingId) {
      setPublishError('Selecciona la reunión antes de publicar.');
      return;
    }
    if (!sourceUrl.trim() && !input.trim().startsWith('http')) {
      const ok = window.confirm('⚠️ No ingresaste URL de fuente. Se publicará sin enlace de verificación. ¿Continuar de todas formas?');
      if (!ok) return;
    }

    setPublishing(true);
    setPublishError('');

    try {
      const res = await fetch('/api/admin/intelligence/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertName: expertName.trim(),
          platform,
          handle: handle.trim() || undefined,
          link: sourceUrl.trim() || (detectInputType(input) === 'youtube' ? input : undefined),
          isClaimable: platform !== 'Revista',
          meetingId: selectedMeetingId,
          sourceType: result.inputType,
          sourceUrl: sourceUrl.trim() || (detectInputType(input) === 'youtube' ? input : undefined),
          rawContent: (result.rawTranscript ?? input).slice(0, 500),
          contentHash: result.contentHash,
          forecasts: editableForecasts,
        }),
      });
      const pubText = await res.text();
      let data: any;
      try { data = JSON.parse(pubText); } catch {
        throw new Error(`Error del servidor (${res.status}): ${pubText.slice(0, 300) || '(respuesta vacía)'}`);
      }
      if (!res.ok) throw new Error(data.error ?? 'Error al publicar.');
      if (data.errors?.length > 0) {
        setPublishError(`Publicado parcialmente (${data.savedCount} carreras). Errores: ${data.errors.join(' | ')}`);
      }
      setPublished(data.savedCount > 0);
    } catch (e: any) {
      setPublishError(e.message);
    } finally {
      setPublishing(false);
    }
  }

  const inputType = detectInputType(input);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-5xl flex items-center gap-3">
          <Link href="/perfil" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm font-medium transition-colors shrink-0">
            <span className="text-base leading-none">←</span>
            <span className="hidden sm:inline">Panel</span>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white">🧠 Inteligencia Hípica</h1>
            <p className="text-xs text-gray-500">Ingesta de pronósticos externos con IA</p>
          </div>
          <Link href="/staff/fuentes" className="text-xs text-gray-400 hover:text-yellow-400 font-medium shrink-0 transition-colors">
            📋 Fuentes
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">

        {/* ── Step 1: Input ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">1. Fuente de contenido</h2>

          {/* Source URL */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">URL de la fuente (link del video, imagen, tweet, etc.)</label>
            <input
              type="text"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://x.com/... o https://youtube.com/... o https://instagram.com/..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
            />
          </div>

          {/* Meeting selector */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Reunión (opcional — la IA intentará detectarla)</label>
            <select
              value={selectedMeetingId}
              onChange={e => setSelectedMeetingId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
            >
              <option value="">— Detectar automáticamente —</option>
              {meetings.map(m => (
                <option key={m.id} value={m.id}>
                  Reunión {m.meetingNumber} · {new Date(m.date).toLocaleDateString('es-VE')}
                  {m.trackName ? ` · ${m.trackName}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Smart input */}
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="preview" className="max-h-64 rounded-xl object-contain border border-gray-700 w-full" />
              <button
                onClick={() => { setImagePreview(null); setInput(''); }}
                className="absolute top-2 right-2 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-400 hover:text-white"
              >
                ✕ Quitar
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="relative"
            >
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pega aquí el link de YouTube, el texto de X/Telegram, o arrastra una imagen de revista..."
                rows={5}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 resize-none"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {input && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    inputType === 'youtube' ? 'bg-red-900/50 text-red-300 border-red-700' :
                    inputType === 'image_ocr' ? 'bg-blue-900/50 text-blue-300 border-blue-700' :
                    'bg-gray-800 text-gray-400 border-gray-700'
                  }`}>
                    {inputType === 'youtube' ? '▶ YouTube' : inputType === 'image_ocr' ? '🖼 Imagen' : '📝 Texto'}
                  </span>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
                >
                  📎 Imagen
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
          />

          <button
            onClick={handleProcess}
            disabled={processing || !input.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: GOLD }}
          >
            {processing ? '⏳ Procesando con Gemini...' : '🧠 Analizar con IA'}
          </button>

          {error && !error.startsWith('YOUTUBE_NO_TRANSCRIPT:') && (
            <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {error?.startsWith('YOUTUBE_NO_TRANSCRIPT:') && (
            <YouTubeManualPanel videoUrl={error.replace('YOUTUBE_NO_TRANSCRIPT:', '')} />
          )}
        </section>

        {/* ── Step 2: Comparison table ── */}
        {result && !published && (
          <>
            {result.warning && (
              <div className="bg-yellow-950/40 border border-yellow-800/50 rounded-xl px-4 py-3 text-sm text-yellow-400">
                {result.warning}
              </div>
            )}
            {result.alreadyIngested && (
              <div className="bg-yellow-950/40 border border-yellow-800/50 rounded-xl px-4 py-3 text-sm text-yellow-400">
                ⚠️ Este contenido ya fue ingresado anteriormente. Si publicas, se actualizarán los pronósticos existentes.
              </div>
            )}

            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">2. Tabla de comparación</h2>
                {result.meetingLabel && (
                  <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                    📅 {result.meetingLabel}
                  </span>
                )}
              </div>

              {editableForecasts.map((fc, fcIdx) => {
                const totalMarks = fc.marks.length;
                const matchedMarks = fc.marks.filter(m => m.resolvedHorseName).length;
                const matchPct = totalMarks > 0 ? Math.round((matchedMarks / totalMarks) * 100) : 0;
                const matchColor = matchPct >= 70 ? 'text-green-400' : matchPct >= 40 ? 'text-yellow-400' : 'text-red-400';
                const matchBg = matchPct >= 70 ? 'bg-green-900/30 border-green-800/50' : matchPct >= 40 ? 'bg-yellow-900/30 border-yellow-800/50' : 'bg-red-900/30 border-red-800/50';
                return (
                <div key={fcIdx} className="border border-gray-700 rounded-xl overflow-hidden">
                  <div className="bg-gray-800 px-4 py-2 flex items-center justify-between gap-2 flex-wrap" title={fc.hasOrder ? 'El pronosticador indicó orden de preferencia' : 'Sin orden de preferencia explícito — son opciones equivalentes'}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">Carrera {fc.raceNumber}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${
                        fc.hasOrder ? 'text-blue-400 border-blue-800 bg-blue-950/40' : 'text-gray-500 border-gray-700'
                      }`}>
                        {fc.hasOrder ? 'con orden' : 'sin orden'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {fc.dbEntries.length > 0 ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${matchBg} ${matchColor}`}>
                          {matchPct >= 70 ? '✓' : matchPct >= 40 ? '~' : '✗'} {matchedMarks}/{totalMarks} coinciden ({matchPct}%)
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600 px-2 py-0.5 rounded-full border border-gray-700">Sin datos en DB para esta carrera</span>
                      )}
                      {fc.expertName && (
                        <span className="text-xs text-gray-400">por {fc.expertName}</span>
                      )}
                    </div>
                  </div>

                  {/* Comparison grid */}
                  <div className="divide-y divide-gray-800">
                    {/* Header */}
                    <div className="grid grid-cols-2 px-4 py-2 text-xs text-gray-500 font-medium">
                      <span>Lo que dijo el experto</span>
                      <span>Ejemplar en DB</span>
                    </div>

                    {fc.marks.map((mark, markIdx) => (
                      <div key={markIdx} className="grid grid-cols-2 gap-2 px-4 py-3 items-center">
                        {/* Left: raw extraction */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-gray-700 text-xs flex items-center justify-center font-bold text-gray-300">
                              {mark.preferenceOrder}
                            </span>
                            {mark.dorsalNumber && (
                              <span className="text-xs font-mono bg-gray-700 text-gray-200 rounded px-1.5 py-0.5">#{mark.dorsalNumber}</span>
                            )}
                            {mark.rawName && (
                              <span className="text-sm text-white font-medium">{mark.rawName}</span>
                            )}
                            {mark.rawLabel && (
                              <span className="text-xs text-purple-400 border border-purple-800 rounded px-1 py-0.5 leading-none font-mono" title="Etiqueta original del pronosticador">{mark.rawLabel}</span>
                            )}
                          </div>
                        </div>

                        {/* Right: resolved DB entry */}
                        <div className="flex items-center gap-2">
                          {mark.resolvedHorseName ? (
                            <>
                              <div className="flex-1">
                                <p className="text-sm text-white">{mark.resolvedHorseName}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className={`h-1.5 rounded-full ${
                                    mark.matchConfidence >= 0.9 ? 'bg-green-500' :
                                    mark.matchConfidence >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`} style={{ width: `${Math.round(mark.matchConfidence * 100)}%`, maxWidth: '80px' }} />
                                  <span className="text-xs text-gray-500">
                                    {Math.round(mark.matchConfidence * 100)}%
                                  </span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex-1">
                              {fc.dbEntries.length > 0 ? (
                                <select
                                  onChange={e => {
                                    const entry = fc.dbEntries.find(d => d.entryId === e.target.value);
                                    if (entry) {
                                      updateMark(fcIdx, markIdx, 'resolvedHorseName', entry.horseName);
                                      updateMark(fcIdx, markIdx, 'resolvedEntryId', entry.entryId);
                                      updateMark(fcIdx, markIdx, 'dorsalNumber', entry.dorsal);
                                      updateMark(fcIdx, markIdx, 'matchConfidence', 1.0);
                                    }
                                  }}
                                  className="w-full text-xs bg-gray-800 border border-red-700 rounded-lg px-2 py-1 text-gray-300 focus:outline-none"
                                  defaultValue=""
                                >
                                  <option value="">— Sin coincidencia —</option>
                                  {fc.dbEntries.map(e => (
                                    <option key={e.entryId} value={e.entryId}>
                                      #{e.dorsal} {e.horseName}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs text-gray-600">Sin datos en DB</span>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => removeMark(fcIdx, markIdx)}
                            className="text-gray-600 hover:text-red-400 text-xs transition-colors shrink-0"
                            title="Eliminar marca"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })}
            </section>

            {/* ── Step 3: Expert info + publish ── */}
            <section className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-white">3. Datos del experto y publicar</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Experto</label>
                  <select
                    value={selectedExpertId}
                    onChange={e => {
                      const id = e.target.value;
                      setSelectedExpertId(id);
                      if (id === '__new__') {
                        setExpertName('');
                        setHandle('');
                      } else {
                        const exp = existingExperts.find(x => x._id === id);
                        if (exp) {
                          setExpertName(exp.name);
                          setPlatform(exp.platform as Platform);
                          setHandle(exp.handle ?? '');
                        }
                      }
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                  >
                    <option value="__new__">➕ Nuevo experto</option>
                    {existingExperts.map(e => (
                      <option key={e._id} value={e._id}>
                        {e.name} · {e.platform} · {e.totalForecasts} pronósticos
                      </option>
                    ))}
                  </select>
                </div>
                {selectedExpertId === '__new__' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Nombre del experto *</label>
                  <input
                    value={expertName}
                    list="known-sources-list"
                    onChange={e => {
                      setExpertName(e.target.value);
                      const known = KNOWN_SOURCES.find(k => k.name.toLowerCase() === e.target.value.toLowerCase());
                      if (known) {
                        setPlatform(known.platform as Platform);
                        if (known.handle) setHandle(known.handle);
                        else if (known.link) setHandle(known.link);
                      }
                    }}
                    placeholder="Ej: Darío Piccinini"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
                  />
                  <datalist id="known-sources-list">
                    {KNOWN_SOURCES.map((k, i) => (
                      <option key={i} value={k.name}>{k.platform}{k.handle ? ` · @${k.handle}` : ''}</option>
                    ))}
                  </datalist>
                </div>
                )}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Plataforma</label>
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value as Platform)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-400 mb-1 block">Handle / usuario (opcional)</label>
                  <input
                    value={handle}
                    onChange={e => setHandle(e.target.value)}
                    placeholder="@usuario o nombre del canal"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
                  />
                </div>
              </div>

              {platform !== 'Revista' && (
                <p className="text-xs text-gray-500">
                  💡 Este perfil se creará como <strong className="text-gray-300">Perfil Fantasma</strong> — el experto puede reclamarlo contactándose con nosotros.
                </p>
              )}
              {platform === 'Revista' && (
                <p className="text-xs text-gray-500">
                  📰 Los perfiles de revistas no son reclamables por ser entidades editoriales.
                </p>
              )}

              {publishError && (
                <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400">
                  {publishError}
                </div>
              )}

              <button
                onClick={handlePublish}
                disabled={publishing || !expertName.trim() || !selectedMeetingId}
                className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: GOLD }}
              >
                {publishing ? '⏳ Publicando...' : '✅ Aprobar y Publicar'}
              </button>
            </section>
          </>
        )}

        {/* ── Scratch panel ── */}
        <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setScratchOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/40 transition-colors"
          >
            <span className="text-sm font-bold text-white flex items-center gap-2">
              🚫 <span>Gestión de Retirados</span>
              {scratchEntries.some(e => e.isScratched) && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-red-900/50 text-red-400 border border-red-800/50">
                  {scratchEntries.filter(e => e.isScratched).length} retirado{scratchEntries.filter(e => e.isScratched).length !== 1 ? 's' : ''}
                </span>
              )}
            </span>
            <span className="text-gray-600 text-xs">{scratchOpen ? '▲' : '▼'}</span>
          </button>

          {scratchOpen && (
            <div className="px-5 pb-5 space-y-3 border-t border-gray-800">
              <p className="text-xs text-gray-500 pt-3">
                Selecciona la carrera para ver los inscritos. Click en un ejemplar para marcarlo como retirado o restaurarlo.
              </p>

              {!selectedMeetingId ? (
                <p className="text-xs text-yellow-600">Selecciona primero una reunión en la sección de arriba.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {scratchRaces.map(r => (
                    <button
                      key={r.raceId}
                      onClick={() => setScratchRaceId(r.raceId)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                        scratchRaceId === r.raceId
                          ? 'bg-yellow-900/40 border-yellow-600 text-yellow-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      C{r.raceNumber}
                    </button>
                  ))}
                </div>
              )}

              {scratchRaceId && (
                scratchLoading ? (
                  <p className="text-xs text-gray-500">Cargando inscritos...</p>
                ) : scratchEntries.length === 0 ? (
                  <p className="text-xs text-gray-600">Sin inscritos registrados para esta carrera.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {scratchEntries.map(entry => (
                      <button
                        key={entry.entryId}
                        onClick={() => toggleScratch(entry)}
                        title={entry.isScratched && entry.scratchedBy ? `Retirado por ${entry.scratchedBy}` : ''}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                          entry.isScratched
                            ? 'bg-red-950/30 border-red-800/60 opacity-70'
                            : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded flex items-center justify-center text-xs font-extrabold shrink-0 ${
                          entry.isScratched ? 'bg-red-900/60 text-red-400' : 'bg-gray-700 text-white'
                        }`}>
                          {entry.dorsal}
                        </span>
                        <span className={`text-xs font-medium truncate flex-1 ${
                          entry.isScratched ? 'line-through text-gray-600' : 'text-gray-300'
                        }`}>
                          {entry.horseName}
                        </span>
                        {entry.isScratched && <span className="text-red-500 text-xs shrink-0">🚫</span>}
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* ── Success state ── */}
        {published && (
          <section className="bg-green-950/30 border border-green-800/50 rounded-2xl p-8 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <h2 className="text-lg font-bold text-white">Pronósticos publicados</h2>
            <p className="text-sm text-gray-400">
              Los pronósticos de <strong className="text-white">{expertName}</strong> han sido guardados y están disponibles.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  setResult(null); setInput(''); setImagePreview(null);
                  setExpertName(''); setHandle(''); setPublished(false);
                  setEditableForecasts([]);
                }}
                className="px-5 py-2 rounded-xl text-sm font-bold text-black"
                style={{ backgroundColor: GOLD }}
              >
                Ingresar otro
              </button>
              <Link href="/perfil" className="px-5 py-2 rounded-xl text-sm font-medium text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors">
                Ir al panel
              </Link>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
