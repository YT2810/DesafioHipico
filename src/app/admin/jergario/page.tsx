'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const INTENTS = [
  'consensus_pick', 'top_picks_all', 'pack_5y6', 'best_workout', 'workouts_all',
  'horse_detail', 'eliminated', 'race_program', 'full_program',
  'betting', 'race_analysis', 'jockey_trainer', 'track_conditions', 'general_hipismo', 'slang',
  'greeting', 'off_topic', 'unknown',
] as const;

type JargonEntry = {
  _id: string;
  phrase: string;
  intent: string;
  keywords: string[];
  description: string;
  example?: string;
  synonyms: string[];
  source: string;
  public: boolean;
  hitCount: number;
};

export default function AdminJergarioPage() {
  const [entries, setEntries] = useState<JargonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [intentFilter, setIntentFilter] = useState('');

  // Extracción de texto
  const [pastedText, setPastedText] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<any | null>(null);

  // Manual add
  const [showAdd, setShowAdd] = useState(false);
  const [newPhrase, setNewPhrase] = useState('');
  const [newIntent, setNewIntent] = useState<string>('consensus_pick');
  const [newKeywords, setNewKeywords] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSynonyms, setNewSynonyms] = useState('');

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/jergario');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries ?? []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleExtractText = async () => {
    if (!pastedText.trim() || pastedText.trim().length < 20) return;
    setExtracting(true);
    setExtractResult(null);
    try {
      const res = await fetch('/api/admin/jergario/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pastedText, sourceName: sourceName || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setExtractResult(data);
        loadEntries();
      } else {
        const err = await res.json();
        setExtractResult({ error: err.error });
      }
    } catch {}
    setExtracting(false);
  };

  const handleManualAdd = async () => {
    if (!newPhrase || !newDescription) return;
    try {
      const res = await fetch('/api/admin/jergario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: newPhrase,
          intent: newIntent,
          keywords: newKeywords.split(',').map(k => k.trim()).filter(Boolean),
          description: newDescription,
          synonyms: newSynonyms.split(',').map(s => s.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setNewPhrase(''); setNewDescription(''); setNewKeywords(''); setNewSynonyms('');
        setShowAdd(false);
        loadEntries();
      }
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta entrada?')) return;
    try {
      await fetch('/api/admin/jergario', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      loadEntries();
    } catch {}
  };

  const togglePublic = async (id: string, current: boolean) => {
    try {
      await fetch('/api/admin/jergario', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, public: !current }),
      });
      loadEntries();
    } catch {}
  };

  const filtered = entries.filter(e => {
    const matchText = !filter || e.phrase.includes(filter.toLowerCase()) || e.description.toLowerCase().includes(filter.toLowerCase());
    const matchIntent = !intentFilter || e.intent === intentFilter;
    return matchText && matchIntent;
  });

  const stats = {
    total: entries.length,
    bySource: entries.reduce((acc, e) => { acc[e.source] = (acc[e.source] ?? 0) + 1; return acc; }, {} as Record<string, number>),
    byIntent: entries.reduce((acc, e) => { acc[e.intent] = (acc[e.intent] ?? 0) + 1; return acc; }, {} as Record<string, number>),
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/perfil" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm font-medium transition-colors">
              <span className="text-base leading-none">←</span>
              <span>Panel</span>
            </Link>
            <span className="text-2xl">📖</span>
            <div>
              <h1 className="text-xl font-bold text-white">Jergario Hípico</h1>
              <p className="text-xs text-gray-400">Diccionario de jerga · {stats.total} entradas</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium transition-colors">
            + Agregar manual
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Seed" value={stats.bySource.seed ?? 0} />
          <StatCard label="YouTube" value={stats.bySource.youtube ?? 0} />
          <StatCard label="Manual" value={(stats.bySource.manual ?? 0) + (stats.bySource.user_log ?? 0)} />
        </div>

        {/* Extraer jerga de texto */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <span className="text-amber-500">📝</span> Extraer jerga de texto
          </h2>
          <p className="text-sm text-gray-400 mb-3">
            Pega una transcripción de YouTube, análisis de pronosticador o cualquier texto hípico. 
            La IA detecta la jerga automáticamente e ignora nombres de caballos con typos.
          </p>
          <div className="flex gap-3 mb-3">
            <input
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder="Fuente (ej: Bob Lovera, Certeza Hípica, Guardi...)"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <textarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            placeholder="Pega aquí la transcripción o texto del pronosticador..."
            className="w-full h-40 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 placeholder-gray-600 resize-y focus:outline-none focus:border-amber-500"
          />
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleExtractText}
              disabled={extracting || pastedText.trim().length < 20}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
            >
              {extracting ? 'Analizando...' : 'Extraer jerga'}
            </button>
            <span className="text-xs text-gray-500">{pastedText.length} chars · ~$0.02 por análisis</span>
          </div>

          {extractResult && (
            <div className="mt-4">
              {extractResult.error ? (
                <div className="text-xs px-3 py-2 rounded bg-red-900/30 text-red-300">❌ {extractResult.error}</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-bold text-green-300">
                    ✅ {extractResult.totalCreated} nuevas entradas · {extractResult.textLength} chars · Fuente: {extractResult.sourceName}
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {extractResult.details?.map((d: string, i: number) => (
                      <div key={i} className={`text-xs px-2 py-1 rounded ${d.startsWith('✅') ? 'bg-green-900/30 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Manual Add Form */}
        {showAdd && (
          <div className="bg-gray-900 border border-amber-800/50 rounded-xl p-5 space-y-3">
            <h2 className="text-lg font-bold">Agregar entrada manual</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={newPhrase} onChange={e => setNewPhrase(e.target.value)} placeholder="Frase (ej: clavito)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
              <select value={newIntent} onChange={e => setNewIntent(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
                {INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <input value={newKeywords} onChange={e => setNewKeywords(e.target.value)} placeholder="Keywords (separadas por coma)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
              <input value={newSynonyms} onChange={e => setNewSynonyms(e.target.value)} placeholder="Sinónimos (separados por coma)" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Descripción (aparece en /diccionario-hipico)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm h-20 resize-y focus:outline-none focus:border-amber-500" />
            <button onClick={handleManualAdd} disabled={!newPhrase || !newDescription} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 rounded-lg text-sm font-medium transition-colors">
              Guardar
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Buscar frase o descripción..."
            className="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
          />
          <select value={intentFilter} onChange={e => setIntentFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500">
            <option value="">Todas las intenciones</option>
            {INTENTS.map(i => <option key={i} value={i}>{i} ({stats.byIntent[i] ?? 0})</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-800">
                  <th className="pb-2 pl-3">Frase</th>
                  <th className="pb-2">Intención</th>
                  <th className="pb-2">Keywords</th>
                  <th className="pb-2">Descripción</th>
                  <th className="pb-2">Fuente</th>
                  <th className="pb-2 text-center">Hits</th>
                  <th className="pb-2 text-center">Público</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e._id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                    <td className="py-2 pl-3 font-medium text-amber-400">{e.phrase}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded-full bg-gray-800 text-xs">{e.intent}</span>
                    </td>
                    <td className="py-2 text-xs text-gray-400 max-w-[200px] truncate">{e.keywords.join(', ')}</td>
                    <td className="py-2 text-xs text-gray-300 max-w-[300px] truncate">{e.description}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        e.source === 'seed' ? 'bg-blue-900/40 text-blue-300' :
                        e.source === 'youtube' ? 'bg-red-900/40 text-red-300' :
                        e.source === 'user_log' ? 'bg-green-900/40 text-green-300' :
                        'bg-gray-800 text-gray-400'
                      }`}>{e.source}</span>
                    </td>
                    <td className="py-2 text-center text-xs">{e.hitCount}</td>
                    <td className="py-2 text-center">
                      <button onClick={() => togglePublic(e._id, e.public)} className={`w-5 h-5 rounded ${e.public ? 'bg-green-600' : 'bg-gray-700'}`} title={e.public ? 'Público' : 'Oculto'} />
                    </td>
                    <td className="py-2">
                      <button onClick={() => handleDelete(e._id)} className="text-red-500 hover:text-red-400 text-xs">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                {filter || intentFilter ? 'Sin resultados para este filtro' : 'No hay entradas aún'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
      <div className="text-2xl font-bold text-amber-400">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
