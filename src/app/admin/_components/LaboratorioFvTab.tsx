'use client';

import { useEffect, useState, useMemo } from 'react';
import KpiCard from './KpiCard';
import type {
  FvLabAnalytics,
  FvRaceAuditItem,
} from '@/services/fvAccuracyService';

const GOLD = '#D4AF37';

type AuditFilter = 'all' | 'batacazo' | 'fav50_lost' | 'fav40_lost' | 'duo_win' | 'tri_win';

export default function LaboratorioFvTab() {
  const [track, setTrack] = useState<'rinconada' | 'valencia'>('rinconada');
  const [data, setData] = useState<FvLabAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [thresholdMode, setThresholdMode] = useState<'cumulative' | 'band'>('cumulative');
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('all');
  const [fieldFilter, setFieldFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/stats/fv-lab?track=${track}`)
      .then(r => r.json())
      .then((res: FvLabAnalytics) => {
        if (!cancelled) setData(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [track]);

  const filteredThresholds = useMemo(
    () => (data?.thresholds ?? []).filter(t => t.mode === thresholdMode),
    [data, thresholdMode]
  );

  const duoRules = useMemo(
    () => (data?.comboRules ?? []).filter(c => c.group === 'duo'),
    [data]
  );

  const triRules = useMemo(
    () => (data?.comboRules ?? []).filter(c => c.group === 'trilogia'),
    [data]
  );

  const filteredRaces = useMemo(() => {
    const list = data?.racesAudit ?? [];
    return list.filter((r: FvRaceAuditItem) => {
      if (fieldFilter !== 'all') {
        if (fieldFilter === 11 && r.fieldSize < 11) return false;
        if (fieldFilter !== 11 && r.fieldSize !== fieldFilter) return false;
      }
      if (auditFilter === 'batacazo') return r.winner.fvRank === null;
      if (auditFilter === 'fav50_lost') return (r.topHorses[0]?.fvPct ?? 0) >= 50 && r.winner.fvRank !== 1;
      if (auditFilter === 'fav40_lost') return (r.topHorses[0]?.fvPct ?? 0) >= 40 && r.winner.fvRank !== 1;
      if (auditFilter === 'duo_win') return r.winner.fvRank === 1 || r.winner.fvRank === 2;
      if (auditFilter === 'tri_win') return r.winner.fvRank === 1 || r.winner.fvRank === 2 || r.winner.fvRank === 3;
      return true;
    });
  }, [data, auditFilter, fieldFilter]);

  const top3WinCount = useMemo(() => {
    if (!data?.byPosition) return 0;
    return data.byPosition
      .filter(p => p.position <= 3)
      .reduce((acc, p) => acc + p.wins, 0);
  }, [data]);

  const top3WinPct = useMemo(() => {
    if (!data?.totalRaces) return 0;
    return Math.round((top3WinCount / data.totalRaces) * 1000) / 10;
  }, [data, top3WinCount]);

  return (
    <div className="space-y-6">
      {/* Header + Track Selector */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <span>🧪</span>
            <span>Laboratorio Factor de Victoria</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-950/60 border border-green-700/50 text-green-400">
              Solo Lectura
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Análisis profundo de efectividad, caídas de favoritos, tamaño de lote, candados, trilogías y detección de patrones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTrack('rinconada')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              track === 'rinconada'
                ? 'bg-yellow-500 text-black border-yellow-500'
                : 'bg-gray-950 text-gray-400 border-gray-800 hover:border-gray-600'
            }`}
          >
            🏇 La Rinconada
          </button>
          <button
            type="button"
            onClick={() => setTrack('valencia')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              track === 'valencia'
                ? 'bg-blue-500 text-black border-blue-500'
                : 'bg-gray-950 text-gray-400 border-gray-800 hover:border-gray-600'
            }`}
          >
            🏁 Valencia
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-sm text-gray-400">
          Calculando estadísticas históricas de {track === 'rinconada' ? 'La Rinconada' : 'Valencia'}…
        </div>
      )}

      {!loading && data && data.totalRaces === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-sm text-gray-500">
          No hay carreras cerradas con resultados y pronósticos para este hipódromo todavía.
        </div>
      )}

      {!loading && data && data.totalRaces > 0 && (
        <>
          {/* 0. DETECTOR AUTOMÁTICO DE PATRONES */}
          {data.insights.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-yellow-950/20 border border-yellow-700/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-1.5">
                  <span>🧠</span>
                  <span>Hallazgos y Patrones Detectados en {data.trackName}</span>
                </h3>
                <span className="text-xs text-gray-500">{data.totalRaces} carreras analizadas</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.insights.map((ins, idx) => (
                  <div key={idx} className="bg-gray-950/80 border border-gray-800 rounded-xl p-3.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{ins.title}</span>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-yellow-500/15 text-yellow-300 border border-yellow-600/30">
                        {ins.metric}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{ins.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CUADRO BASE: Acierto General por Posición FV (movido desde Pronósticos) */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">0. Resumen General — Acierto por Posición del FV</h3>
              <p className="text-xs text-gray-500">
                Efectividad histórica de cada puesto del ranking Factor de Victoria (1º al 5º) y frecuencia de Batacazos.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Carreras evaluadas" value={data.totalRaces} color={GOLD} />
              <KpiCard
                label="Acierto 1º Favorito FV"
                value={`${data.byPosition[0]?.pct ?? 0}%`}
                sub={`${data.byPosition[0]?.wins ?? 0} de ${data.byPosition[0]?.total ?? 0}`}
                color="#22c55e"
              />
              <KpiCard
                label="Ganador en Top 3 FV"
                value={`${top3WinPct}%`}
                sub={`${top3WinCount} de ${data.totalRaces} carreras`}
                color="#38bdf8"
              />
              <KpiCard
                label="Batacazos (Fuera Top 5)"
                value={data.batacazos}
                sub={`${data.batacazoPct}% del total`}
                color="#ef4444"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-800">
                  <tr>
                    <th className="pb-2 font-medium">Posición FV</th>
                    <th className="pb-2 font-medium">Carreras evaluadas</th>
                    <th className="pb-2 font-medium">Victorias</th>
                    <th className="pb-2 font-medium">% Acierto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byPosition.map(row => (
                    <tr key={row.position} className="border-b border-gray-800/50 last:border-0">
                      <td className="py-2.5 text-white font-semibold">{row.position}º Favorito FV</td>
                      <td className="py-2.5 text-gray-400">{row.total}</td>
                      <td className="py-2.5 text-gray-300 font-semibold">{row.wins}</td>
                      <td className="py-2.5">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold"
                          style={{
                            backgroundColor: row.pct >= 35 ? 'rgba(34,197,94,0.15)' : row.pct >= 20 ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)',
                            color: row.pct >= 35 ? '#4ade80' : row.pct >= 20 ? GOLD : '#9ca3af',
                          }}
                        >
                          {row.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 1. EFECTIVIDAD POR UMBRAL (+40, +50, +60) + CON QUIÉN PIERDEN */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  1. Efectividad por Umbral (+40%, +50%, +60%) y Con Quién Pierden los Favoritos
                </h3>
                <p className="text-xs text-gray-500">
                  Mide cuántas veces gana un ejemplar según su % de FV y, cuando cae derrotado, qué posición del FV termina ganando la carrera.
                </p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setThresholdMode('cumulative')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    thresholdMode === 'cumulative'
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-600/50'
                      : 'bg-gray-950 text-gray-500 border-gray-800'
                  }`}
                >
                  Acumulado (+40 / +50 / +60)
                </button>
                <button
                  type="button"
                  onClick={() => setThresholdMode('band')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    thresholdMode === 'band'
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-600/50'
                      : 'bg-gray-950 text-gray-500 border-gray-800'
                  }`}
                >
                  Por Banda Exacta
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-800">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Umbral FV</th>
                    <th className="pb-2 px-2 font-medium text-center">Ejemplares</th>
                    <th className="pb-2 px-2 font-medium text-center">Ganaron</th>
                    <th className="pb-2 px-2 font-medium text-center">% Victoria</th>
                    <th className="pb-2 px-2 font-medium text-center border-l border-gray-800">Perdieron</th>
                    <th className="pb-2 px-2 font-medium text-center text-sky-400">Ganó 2º FV</th>
                    <th className="pb-2 px-2 font-medium text-center text-indigo-400">Ganó 3º FV</th>
                    <th className="pb-2 px-2 font-medium text-center text-purple-400">Ganó 4º FV</th>
                    <th className="pb-2 px-2 font-medium text-center text-pink-400">Ganó 5º FV</th>
                    <th className="pb-2 pl-2 font-medium text-center text-red-400">Fue Batacazo</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredThresholds.map(row => (
                    <tr key={row.label} className="border-b border-gray-800/50 last:border-0">
                      <td className="py-3 pr-3 font-bold text-white whitespace-nowrap">{row.label}</td>
                      <td className="py-3 px-2 text-center text-gray-300">{row.totalCandidates}</td>
                      <td className="py-3 px-2 text-center text-green-400 font-bold">{row.wins}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-md font-extrabold bg-green-950/60 text-green-300 border border-green-700/40">
                          {row.winPct}%
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-400 border-l border-gray-800 font-semibold">
                        {row.losses}
                      </td>
                      <td className="py-3 px-2 text-center text-gray-300">
                        {row.whenLost.wonBy2nd}{' '}
                        <span className="text-[11px] text-gray-500">({row.whenLost.wonBy2ndPct}%)</span>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-300">
                        {row.whenLost.wonBy3rd}{' '}
                        <span className="text-[11px] text-gray-500">({row.whenLost.wonBy3rdPct}%)</span>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-300">
                        {row.whenLost.wonBy4th}{' '}
                        <span className="text-[11px] text-gray-500">({row.whenLost.wonBy4thPct}%)</span>
                      </td>
                      <td className="py-3 px-2 text-center text-gray-300">
                        {row.whenLost.wonBy5th}{' '}
                        <span className="text-[11px] text-gray-500">({row.whenLost.wonBy5thPct}%)</span>
                      </td>
                      <td className="py-3 pl-2 text-center text-red-400 font-semibold">
                        {row.whenLost.wonByBatacazo}{' '}
                        <span className="text-[11px] text-red-400/70">({row.whenLost.wonByBatacazoPct}%)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. MATRIZ POR TAMAÑO DE LOTE (CANTIDAD DE EJEMPLARES QUE CORRIERON) + CONCENTRACIÓN DE BATACAZOS */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                2. Matriz por Cantidad de Ejemplares en Pista (2 a 11+) y Concentración de Batacazos
              </h3>
              <p className="text-xs text-gray-500">
                Desglose exacto de qué puesto del FV gana según cuántos caballos corrieron (descontando retirados), y en qué tamaño de lote se concentra el total de batacazos.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-800">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Tamaño del lote</th>
                    <th className="pb-2 px-2 font-medium text-center">Carreras</th>
                    <th className="pb-2 px-2 font-medium text-center text-green-400">1º FV</th>
                    <th className="pb-2 px-2 font-medium text-center text-sky-400">2º FV</th>
                    <th className="pb-2 px-2 font-medium text-center text-indigo-400">3º FV</th>
                    <th className="pb-2 px-2 font-medium text-center text-purple-400">4º FV</th>
                    <th className="pb-2 px-2 font-medium text-center text-pink-400">5º FV</th>
                    <th className="pb-2 px-2 font-medium text-center text-red-400">Batacazo (Fuera Top 5)</th>
                    <th className="pb-2 pl-2 font-medium text-center border-l border-gray-800 text-orange-400">
                      % del Total de Batacazos ({data.batacazos})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.byFieldSize.map(row => (
                    <tr key={row.fieldSizeKey} className="border-b border-gray-800/50 last:border-0">
                      <td className="py-2.5 pr-3 font-bold text-white whitespace-nowrap">{row.fieldSizeLabel}</td>
                      <td className="py-2.5 px-2 text-center text-gray-300 font-semibold">{row.totalRaces}</td>
                      <td className="py-2.5 px-2 text-center text-gray-200">
                        {row.posWins.pos1} <span className="text-[11px] text-gray-500">({row.posPcts.pos1}%)</span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-200">
                        {row.posWins.pos2} <span className="text-[11px] text-gray-500">({row.posPcts.pos2}%)</span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-200">
                        {row.posWins.pos3} <span className="text-[11px] text-gray-500">({row.posPcts.pos3}%)</span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-200">
                        {row.posWins.pos4} <span className="text-[11px] text-gray-500">({row.posPcts.pos4}%)</span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-gray-200">
                        {row.posWins.pos5} <span className="text-[11px] text-gray-500">({row.posPcts.pos5}%)</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-red-400">
                        {row.posWins.batacazo}{' '}
                        <span className="text-[11px] text-red-400/70">({row.posPcts.batacazo}%)</span>
                      </td>
                      <td className="py-2.5 pl-2 text-center border-l border-gray-800">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-xs font-extrabold ${
                            row.shareOfAllBatacazosPct >= 25
                              ? 'bg-orange-950/70 text-orange-300 border border-orange-700/50'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {row.shareOfAllBatacazosPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. SIMULADOR DE CANDADOS (DÚOS 1º+2º) Y TRILOGÍAS (1º+2º+3º) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dúos / Candados */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-white">🔒 3A. Reglas de Candado (Dúo 1º + 2º FV)</h3>
                <p className="text-xs text-gray-500">
                  ¿Cuándo jugar solo 2 caballos asegura la carrera para 5y6 o Pool de 4?
                </p>
              </div>
              <div className="space-y-2.5">
                {duoRules.map(rule => (
                  <div key={rule.id} className="bg-gray-950/70 border border-gray-800 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-white">{rule.label}</p>
                        <p className="text-[11px] text-gray-500">{rule.description}</p>
                      </div>
                      <span
                        className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-extrabold"
                        style={{
                          backgroundColor: rule.accuracyPct >= 65 ? 'rgba(34,197,94,0.18)' : 'rgba(212,175,55,0.15)',
                          color: rule.accuracyPct >= 65 ? '#4ade80' : GOLD,
                        }}
                      >
                        {rule.accuracyPct}% acierto
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1 border-t border-gray-800/60">
                      <span>
                        Ocurrió en <strong className="text-white">{rule.matchingRaces}</strong> carreras ({rule.frequencyPct}%)
                      </span>
                      <span>·</span>
                      <span>
                        Ganó el Dúo: <strong className="text-green-400">{rule.winsInGroup}</strong> veces (1º: {rule.breakdownWins.pos1} · 2º: {rule.breakdownWins.pos2})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trilogías */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-white">🔱 3B. Reglas de Trilogía (1º + 2º + 3º FV)</h3>
                <p className="text-xs text-gray-500">
                  ¿Cuándo blindar la carrera con los 3 primeros del FV?
                </p>
              </div>
              <div className="space-y-2.5">
                {triRules.map(rule => (
                  <div key={rule.id} className="bg-gray-950/70 border border-gray-800 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-white">{rule.label}</p>
                        <p className="text-[11px] text-gray-500">{rule.description}</p>
                      </div>
                      <span
                        className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-extrabold"
                        style={{
                          backgroundColor: rule.accuracyPct >= 75 ? 'rgba(34,197,94,0.18)' : 'rgba(56,189,248,0.15)',
                          color: rule.accuracyPct >= 75 ? '#4ade80' : '#38bdf8',
                        }}
                      >
                        {rule.accuracyPct}% acierto
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1 border-t border-gray-800/60">
                      <span>
                        Ocurrió en <strong className="text-white">{rule.matchingRaces}</strong> carreras ({rule.frequencyPct}%)
                      </span>
                      <span>·</span>
                      <span>
                        Ganó la Trilogía: <strong className="text-sky-400">{rule.winsInGroup}</strong> (1º: {rule.breakdownWins.pos1} · 2º: {rule.breakdownWins.pos2} · 3º: {rule.breakdownWins.pos3})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. EXPLORADOR Y AUDITORÍA DE CARRERAS (SECCIÓN D) */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  4. Explorador de Carreras y Buscador de Patrones ({filteredRaces.length} carreras)
                </h3>
                <p className="text-xs text-gray-500">
                  Filtra por tipo de desenlace y cantidad de ejemplares para inspeccionar los porcentajes exactos de cada carrera.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={auditFilter}
                  onChange={e => setAuditFilter(e.target.value as AuditFilter)}
                  className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-yellow-600"
                >
                  <option value="all">Todas las carreras ({data.racesAudit.length})</option>
                  <option value="batacazo">🔥 Solo Batacazos (Ganó fuera Top 5)</option>
                  <option value="fav50_lost">⚠️ Favorito +50% FV que perdió</option>
                  <option value="fav40_lost">⚠️ Favorito +40% FV que perdió</option>
                  <option value="duo_win">🔒 Ganó el 1º o 2º FV</option>
                  <option value="tri_win">🔱 Ganó el 1º, 2º o 3º FV</option>
                </select>

                <select
                  value={fieldFilter}
                  onChange={e => setFieldFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-yellow-600"
                >
                  <option value="all">Todos los tamaños de lote</option>
                  {data.byFieldSize.map(fs => (
                    <option key={fs.fieldSizeKey} value={fs.fieldSizeKey}>
                      Lote de {fs.fieldSizeLabel} ({fs.totalRaces})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-gray-500 uppercase border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
                  <tr>
                    <th className="py-2 pr-2 font-medium">Reunión / Carrera</th>
                    <th className="py-2 px-2 font-medium text-center">Ejemplares</th>
                    <th className="py-2 px-2 font-medium">1º FV</th>
                    <th className="py-2 px-2 font-medium">2º FV</th>
                    <th className="py-2 px-2 font-medium">3º FV</th>
                    <th className="py-2 px-2 font-medium text-center">Suma 1+2 / 1+2+3</th>
                    <th className="py-2 pl-2 font-medium">Ganador Oficial</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRaces.map(r => {
                    const h1 = r.topHorses[0];
                    const h2 = r.topHorses[1];
                    const h3 = r.topHorses[2];
                    const isBatacazo = r.winner.fvRank === null;
                    return (
                      <tr key={r.raceId} className="border-b border-gray-800/40 hover:bg-gray-800/30">
                        <td className="py-2.5 pr-2 whitespace-nowrap">
                          <span className="font-bold text-white">R{r.meetingNumber} · C{r.raceNumber}</span>
                          <span className="block text-[10px] text-gray-500">{r.date} · {r.distance}m</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-gray-300">
                          {r.fieldSize}
                        </td>
                        <td className="py-2.5 px-2">
                          {h1 ? (
                            <div>
                              <span className="font-semibold text-gray-200">
                                #{h1.dorsalNumber ?? '?'} {h1.horseName}
                              </span>
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-300 font-bold">
                                {h1.fvPct}%
                              </span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-2">
                          {h2 ? (
                            <div>
                              <span className="text-gray-300">
                                #{h2.dorsalNumber ?? '?'} {h2.horseName}
                              </span>
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 font-semibold">
                                {h2.fvPct}%
                              </span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-2">
                          {h3 ? (
                            <div>
                              <span className="text-gray-400">
                                #{h3.dorsalNumber ?? '?'} {h3.horseName}
                              </span>
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                                {h3.fvPct}%
                              </span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span className="text-gray-300 font-semibold">{r.sumTop2Pct}%</span>
                          <span className="text-gray-600 mx-1">/</span>
                          <span className="text-sky-400 font-semibold">{r.sumTop3Pct}%</span>
                        </td>
                        <td className="py-2.5 pl-2 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md font-extrabold ${
                                r.winner.fvRank === 1
                                  ? 'bg-green-950/70 text-green-400 border border-green-700/50'
                                  : isBatacazo
                                  ? 'bg-red-950/70 text-red-400 border border-red-700/50'
                                  : 'bg-sky-950/70 text-sky-300 border border-sky-700/50'
                              }`}
                            >
                              {isBatacazo ? '🔥 BATACAZO' : `${r.winner.fvRank}º FV`}
                            </span>
                            <span className="font-semibold text-white">
                              #{r.winner.dorsalNumber ?? '?'} {r.winner.horseName}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
