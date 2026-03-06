'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { RankingEntry } from '@/app/api/handicapper/ranking/route';

const GOLD = '#D4AF37';

type SortKey = 'e1' | 'e1_2' | 'e1_3' | 'eGeneral';

const COL_LABELS: Record<SortKey, string> = {
  e1: 'E1',
  e1_2: 'E1-2',
  e1_3: 'E1-3',
  eGeneral: 'E-Gral',
};

const COL_DESC: Record<SortKey, string> = {
  e1:       '% de veces que la 1ª marca fue el ganador',
  e1_2:     '% de veces que el ganador estuvo entre las 2 primeras marcas',
  e1_3:     '% de veces que el ganador estuvo entre las 3 primeras marcas',
  eGeneral: '% de veces que el ganador estuvo en alguna de las marcas',
};

function Medal({ pos }: { pos: number }) {
  if (pos === 1) return <span title="1er lugar">🥇</span>;
  if (pos === 2) return <span title="2do lugar">🥈</span>;
  if (pos === 3) return <span title="3er lugar">🥉</span>;
  return <span className="text-xs font-bold text-gray-500">#{pos}</span>;
}

function Bar({ value, max }: { value: number | null; max: number }) {
  if (value === null) return <span className="text-xs text-gray-700">—</span>;
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color = value >= 40 ? '#22c55e' : value >= 20 ? GOLD : '#6b7280';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-gray-800 overflow-hidden shrink-0">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold font-mono" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>('e1');
  const [minRaces, setMinRaces] = useState(5);

  useEffect(() => {
    fetch('/api/handicapper/ranking')
      .then(r => r.json())
      .then(d => {
        setRanking(d.ranking ?? []);
        setMinRaces(d.minRaces ?? 5);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Re-sort client-side when user changes column
  const sorted = [...ranking].sort((a, b) => {
    const av = a[sortBy] ?? -1;
    const bv = b[sortBy] ?? -1;
    if (bv !== av) return (bv as number) - (av as number);
    return b.eGeneral - a.eGeneral;
  });

  const maxVal: Record<SortKey, number> = {
    e1:       Math.max(1, ...sorted.map(r => r.e1 ?? 0)),
    e1_2:     Math.max(1, ...sorted.map(r => r.e1_2 ?? 0)),
    e1_3:     Math.max(1, ...sorted.map(r => r.e1_3 ?? 0)),
    eGeneral: Math.max(1, ...sorted.map(r => r.eGeneral)),
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-900 px-4 py-3 flex items-center gap-3">
        <Link href="/pronosticos" className="text-gray-500 hover:text-white transition-colors text-sm">← Pronósticos</Link>
        <span className="text-gray-800">/</span>
        <span className="text-sm font-semibold text-gray-300">Ranking de Handicappers</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-white">🏆 Ranking</h1>
          <p className="text-sm text-gray-500 mt-1">
            Efectividad histórica calculada sobre resultados oficiales INH.
            Solo se incluyen handicappers con al menos <span className="text-yellow-400 font-bold">{minRaces} carreras</span> evaluadas.
          </p>
        </div>

        {/* Sort tabs */}
        <div className="flex gap-1 p-1 bg-gray-900 rounded-xl border border-gray-800">
          {(Object.keys(COL_LABELS) as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              title={COL_DESC[key]}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                sortBy === key
                  ? 'bg-yellow-500 text-black'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              {COL_LABELS[key]}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 -mt-2 px-1">{COL_DESC[sortBy]}</p>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-20 animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-700">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-sm">Sin datos suficientes aún</p>
            <p className="text-xs mt-1">Se requieren al menos {minRaces} carreras evaluadas por handicapper</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((entry, idx) => (
              <Link key={entry.id} href={`/handicapper/${entry.id}`} className="block group">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3.5 flex items-center gap-3 hover:border-yellow-800/50 transition-colors">
                  {/* Position */}
                  <div className="w-8 shrink-0 flex justify-center">
                    <Medal pos={idx + 1} />
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-extrabold"
                    style={{ backgroundColor: 'rgba(212,175,55,0.12)', color: GOLD, border: '1.5px solid rgba(212,175,55,0.2)' }}
                  >
                    {entry.pseudonym[0].toUpperCase()}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors truncate">
                        {entry.pseudonym}
                      </span>
                      {entry.isGhost && (
                        <span className="text-xs text-blue-400 shrink-0" title="Procesado con IA">🤖</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {entry.totalRaces} carreras · {entry.orderedRaces > 0 ? `${entry.orderedRaces} con orden` : 'sin orden de preferencia'}
                    </p>
                  </div>

                  {/* Active metric + secondary */}
                  <div className="shrink-0 text-right space-y-1.5">
                    <Bar value={entry[sortBy] as number | null} max={maxVal[sortBy]} />
                    {sortBy !== 'eGeneral' && (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-gray-700">Gral</span>
                        <span className="text-xs font-mono text-gray-500">{entry.eGeneral}%</span>
                      </div>
                    )}
                  </div>

                  <span className="text-gray-700 text-xs shrink-0">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Legend */}
        {!loading && sorted.length > 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-4 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Glosario</p>
            {(Object.entries(COL_LABELS) as [SortKey, string][]).map(([k, label]) => (
              <div key={k} className="flex gap-2 text-xs">
                <span className="font-bold text-yellow-400 w-10 shrink-0">{label}</span>
                <span className="text-gray-500">{COL_DESC[k]}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
