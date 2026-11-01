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
  const [year, setYear] = useState<number | 'all'>(2026);
  const [data, setData] = useState<FvLabAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [thresholdMode, setThresholdMode] = useState<'cumulative' | 'band'>('cumulative');
  const [ticketProfile, setTicketProfile] = useState<'economico' | 'medio' | 'blindado' | 'premium'>('premium');
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('all');
  const [fieldFilter, setFieldFilter] = useState<number | 'all'>('all');
  const [distanceFilter, setDistanceFilter] = useState<number | 'all'>('all');
  const [cazadorMeetingId, setCazadorMeetingId] = useState<string>('upcoming');
  const [cazadorVariant, setCazadorVariant] = useState<
    'cazador_fv' | 'quitar_1fv' | 'top5_abierto' | 'bomba_todos'
  >('cazador_fv');
  // Map key: `${validaNumber}` -> array of horse keys (`#${dorsal}_${horseName}`)
  const [customSelectedByValida, setCustomSelectedByValida] = useState<Record<number, string[]>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/stats/fv-lab?track=${track}&year=${year}`)
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
  }, [track, year]);

  const activeCazadorMeeting = useMemo(() => {
    if (!data) return null;
    if (cazadorMeetingId !== 'upcoming') {
      const found = data.fiveAndSixBacktest?.meetings.find(m => m.meetingId === cazadorMeetingId);
      if (found) return found;
    }
    if (data.upcomingFiveAndSix) {
      // Check if this upcoming meeting is already in backtest meetings (has payouts)
      const inBt = data.fiveAndSixBacktest?.meetings.find(
        m => m.meetingId === data.upcomingFiveAndSix?.meetingId
      );
      if (inBt) return inBt;
      return {
        meetingId: data.upcomingFiveAndSix.meetingId,
        meetingNumber: data.upcomingFiveAndSix.meetingNumber,
        date: data.upcomingFiveAndSix.date,
        year: 2026,
        factorBs: !data.upcomingFiveAndSix.date ? 50
          : data.upcomingFiveAndSix.date <= '2026-09-03' ? 20
          : data.upcomingFiveAndSix.date <= '2026-10-30' ? 35 : 50,
        payout6Bs: 0,
        payout5Bs: 0,
        hasSuperFijo: data.upcomingFiveAndSix.hasSuperFijo,
        combinationsEco: data.upcomingFiveAndSix.combinationsEco,
        combinationsMed: data.upcomingFiveAndSix.combinationsMed,
        combinationsBlindado: data.upcomingFiveAndSix.combinationsBlindado,
        combinationsPremium: data.upcomingFiveAndSix.combinationsPremium,
        combinationsCazador: data.upcomingFiveAndSix.combinationsCazador,
        costBsEco: data.upcomingFiveAndSix.costBsEco,
        costBsMed: data.upcomingFiveAndSix.costBsMed,
        costBsBlindado: data.upcomingFiveAndSix.costBsBlindado,
        costBsPremium: data.upcomingFiveAndSix.costBsPremium,
        costBsCazador: data.upcomingFiveAndSix.costBsCazador,
        prizeBsEco: 0,
        prizeBsMed: 0,
        prizeBsBlindado: 0,
        prizeBsPremium: 0,
        prizeBsCazador: 0,
        hitsEco: 0,
        hitsMed: 0,
        hitsBlindado: 0,
        hitsPremium: 0,
        hitsCazador: 0,
        validas: data.upcomingFiveAndSix.validas,
      };
    }
    return data.fiveAndSixBacktest?.meetings[0] ?? null;
  }, [data, cazadorMeetingId]);

  const horseIdKey = (h: { dorsalNumber?: number; horseName: string }) =>
    `${h.dorsalNumber ?? '?'}_${h.horseName.toUpperCase().trim()}`;

  // Apply preset variant whenever meeting or variant changes
  useEffect(() => {
    if (!activeCazadorMeeting) return;
    const nextMap: Record<number, string[]> = {};
    const validas = activeCazadorMeeting.validas;

    // Find bomb race index for 'bomba_todos'
    let bombValidaNum = validas[validas.length - 1]?.validaNumber ?? 6;
    for (const v of validas) {
      if (v.vacioType === 'vacio_explosion' || v.countCazador >= 6) {
        bombValidaNum = v.validaNumber;
      }
    }

    for (const v of validas) {
      const allH = v.allFvHorses?.length ? v.allFvHorses : v.picksPremium;
      const fvOnly = allH.filter(h => h.pos > 0);
      if (cazadorVariant === 'cazador_fv') {
        nextMap[v.validaNumber] = v.picksCazador.map(horseIdKey);
      } else if (cazadorVariant === 'quitar_1fv') {
        // Quita el 1º FV únicamente en las válidas marcadas con la alerta canDropFirstFv
        if (v.canDropFirstFv && fvOnly.length >= 3) {
          const withoutFirst = v.picksCazador.filter(p => p.pos !== 1);
          nextMap[v.validaNumber] = (withoutFirst.length >= 2 ? withoutFirst : fvOnly.slice(1, 5)).map(
            horseIdKey
          );
        } else {
          nextMap[v.validaNumber] = v.picksCazador.map(horseIdKey);
        }
      } else if (cazadorVariant === 'top5_abierto') {
        // Variante B: Top 5 FV Abierto (para jornadas donde los 6 ganadores están en el Top 4/5 FV sin súper fijo)
        const p1 = fvOnly[0]?.fvPct ?? 0;
        const p4 = fvOnly[3]?.fvPct ?? 0;
        const p5 = fvOnly[4]?.fvPct ?? 0;
        const take =
          v.safetyRank === 1 && p1 >= 54
            ? 1
            : v.safetyRank === 1
            ? 2
            : p5 >= 6.5
            ? 5
            : p4 >= 10
            ? 4
            : 3;
        nextMap[v.validaNumber] = fvOnly.slice(0, Math.min(take, fvOnly.length)).map(horseIdKey);
      } else {
        // Variante C: Bomba con TODOS (incluyendo 0% FV / Corazonadas) en la válida trampa + candados/trilogías
        if (v.validaNumber === bombValidaNum) {
          nextMap[v.validaNumber] = allH.map(horseIdKey);
        } else {
          const take = v.safetyRank === 1 ? 1 : v.safetyRank <= 3 ? 2 : 3;
          nextMap[v.validaNumber] = fvOnly.slice(0, Math.min(take, fvOnly.length)).map(horseIdKey);
        }
      }
    }
    setCustomSelectedByValida(nextMap);
  }, [activeCazadorMeeting, cazadorVariant]);

  const toggleCustomHorse = (validaNumber: number, key: string) => {
    setCustomSelectedByValida(prev => {
      const current = prev[validaNumber] ?? [];
      const exists = current.includes(key);
      if (exists && current.length <= 1) return prev; // keep at least 1 horse per valida
      return {
        ...prev,
        [validaNumber]: exists ? current.filter(k => k !== key) : [...current, key],
      };
    });
  };

  const setValidaQuickPreset = (
    v: NonNullable<typeof activeCazadorMeeting>['validas'][number],
    mode: 'top2' | 'top3' | 'sin_1fv' | 'top5' | 'all_fv' | 'all_lote'
  ) => {
    const allH = v.allFvHorses?.length ? v.allFvHorses : v.picksPremium;
    const fvOnly = allH.filter(h => h.pos > 0);
    let picked = allH;
    if (mode === 'top2') picked = fvOnly.slice(0, 2);
    else if (mode === 'top3') picked = fvOnly.slice(0, 3);
    else if (mode === 'sin_1fv') picked = fvOnly.length >= 3 ? fvOnly.slice(1, 5) : fvOnly;
    else if (mode === 'top5') picked = fvOnly.slice(0, 5);
    else if (mode === 'all_fv') picked = fvOnly;
    setCustomSelectedByValida(prev => ({
      ...prev,
      [v.validaNumber]: picked.map(horseIdKey),
    }));
  };

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
      if (distanceFilter !== 'all' && r.distance !== distanceFilter) {
        return false;
      }
      if (auditFilter === 'batacazo') return r.winner.fvRank === null;
      if (auditFilter === 'fav50_lost') return (r.topHorses[0]?.fvPct ?? 0) >= 50 && r.winner.fvRank !== 1;
      if (auditFilter === 'fav40_lost') return (r.topHorses[0]?.fvPct ?? 0) >= 40 && r.winner.fvRank !== 1;
      if (auditFilter === 'duo_win') return r.winner.fvRank === 1 || r.winner.fvRank === 2;
      if (auditFilter === 'tri_win') return r.winner.fvRank === 1 || r.winner.fvRank === 2 || r.winner.fvRank === 3;
      return true;
    });
  }, [data, auditFilter, fieldFilter, distanceFilter]);

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

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-yellow-400 focus:outline-none focus:border-yellow-500"
          >
            {(data?.availableYears?.length ? data.availableYears : [2026]).map(y => (
              <option key={y} value={y}>
                📅 Temporada {y}
              </option>
            ))}
            <option value="all">📅 Histórico Completo</option>
          </select>

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

          {/* 2B. MATRIZ DINÁMICA POR DISTANCIA (AUTO-DETECTADA 1100m..3200m+) */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">
                2B. Matriz por Distancia Corrida (Auto-detectada: 1.100m a 3.200m+)
              </h3>
              <p className="text-xs text-gray-500">
                Incluye automáticamente todas las distancias corridas hasta hoy y agregará cualquier distancia nueva en cuanto tenga resultados.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-800">
                  <tr>
                    <th className="pb-2 pr-3 font-medium">Distancia</th>
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
                  {(data.byDistance ?? []).map(row => (
                    <tr key={row.distance} className="border-b border-gray-800/50 last:border-0">
                      <td className="py-2.5 pr-3 font-bold text-white whitespace-nowrap">{row.distanceLabel}</td>
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

          {/* 2C y 2D. MATRICES POR CATEGORÍA / LLAMADO DEL LOTE Y POR EDAD */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 2C. Por Categoría / Llamado */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  2C. Efectividad y Batacazos por Categoría / Llamado del Lote
                </h3>
                <p className="text-xs text-gray-500">
                  Compara Perdedores, Reclamo, Ganadores de 1, 2, 3–4, 5+ y Clásicos (separa 6º–8º FV vs. 0% Sin FV).
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800 text-[10px] uppercase">
                      <th className="pb-2 pr-2">Llamado / Lote</th>
                      <th className="pb-2 px-1.5 text-center">Carr.</th>
                      <th className="pb-2 px-1.5 text-center text-green-400">1º FV</th>
                      <th className="pb-2 px-1.5 text-center text-sky-400">2º FV</th>
                      <th className="pb-2 px-1.5 text-center text-indigo-400">3º FV</th>
                      <th className="pb-2 px-1.5 text-center text-purple-400">4º–5º</th>
                      <th className="pb-2 px-1.5 text-center text-amber-400">6º–8º FV</th>
                      <th className="pb-2 pl-1.5 text-center text-red-400">0% Sin FV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.byCategory ?? []).map(row => (
                      <tr key={row.label} className="border-b border-gray-800/50 last:border-0">
                        <td className="py-2 pr-2 font-bold text-white whitespace-nowrap">{row.label}</td>
                        <td className="py-2 px-1.5 text-center text-gray-400 font-semibold">{row.totalRaces}</td>
                        <td className="py-2 px-1.5 text-center text-gray-200">
                          {row.posWins.pos1} <span className="text-[10px] text-gray-500">({row.posPcts.pos1}%)</span>
                        </td>
                        <td className="py-2 px-1.5 text-center text-gray-200">
                          {row.posWins.pos2} <span className="text-[10px] text-gray-500">({row.posPcts.pos2}%)</span>
                        </td>
                        <td className="py-2 px-1.5 text-center text-gray-200">
                          {row.posWins.pos3} <span className="text-[10px] text-gray-500">({row.posPcts.pos3}%)</span>
                        </td>
                        <td className="py-2 px-1.5 text-center text-purple-300">
                          {row.posWins.pos4 + row.posWins.pos5}{' '}
                          <span className="text-[10px] text-gray-500">
                            ({(row.posPcts.pos4 + row.posPcts.pos5).toFixed(1)}%)
                          </span>
                        </td>
                        <td className="py-2 px-1.5 text-center font-semibold text-amber-300">
                          {row.posWins.pos6To8}{' '}
                          <span className="text-[10px] text-amber-400/70">({row.posPcts.pos6To8}%)</span>
                        </td>
                        <td className="py-2 pl-1.5 text-center font-bold text-red-400">
                          {row.posWins.noFv} <span className="text-[10px] text-red-400/70">({row.posPcts.noFv}%)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2D. Por Edad del Lote */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  2D. Efectividad y Batacazos por Edad del Lote (2a, 3a, 3–4a, 4a, 4+, 5+, 6+)
                </h3>
                <p className="text-xs text-gray-500">
                  Muestra cómo cambia la nobleza del favorito según la edad o cruce de edades del llamado.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800 text-[10px] uppercase">
                      <th className="pb-2 pr-2">Edad del Lote</th>
                      <th className="pb-2 px-1.5 text-center">Carr.</th>
                      <th className="pb-2 px-1.5 text-center text-green-400">1º FV</th>
                      <th className="pb-2 px-1.5 text-center text-sky-400">2º FV</th>
                      <th className="pb-2 px-1.5 text-center text-indigo-400">3º FV</th>
                      <th className="pb-2 px-1.5 text-center text-purple-400">4º–5º</th>
                      <th className="pb-2 px-1.5 text-center text-amber-400">6º–8º FV</th>
                      <th className="pb-2 pl-1.5 text-center text-red-400">0% Sin FV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.byAgeGroup ?? []).map(row => (
                      <tr key={row.label} className="border-b border-gray-800/50 last:border-0">
                        <td className="py-2 pr-2 font-bold text-white whitespace-nowrap">{row.label}</td>
                        <td className="py-2 px-1.5 text-center text-gray-400 font-semibold">{row.totalRaces}</td>
                        <td className="py-2 px-1.5 text-center text-gray-200">
                          {row.posWins.pos1} <span className="text-[10px] text-gray-500">({row.posPcts.pos1}%)</span>
                        </td>
                        <td className="py-2 px-1.5 text-center text-gray-200">
                          {row.posWins.pos2} <span className="text-[10px] text-gray-500">({row.posPcts.pos2}%)</span>
                        </td>
                        <td className="py-2 px-1.5 text-center text-gray-200">
                          {row.posWins.pos3} <span className="text-[10px] text-gray-500">({row.posPcts.pos3}%)</span>
                        </td>
                        <td className="py-2 px-1.5 text-center text-purple-300">
                          {row.posWins.pos4 + row.posWins.pos5}{' '}
                          <span className="text-[10px] text-gray-500">
                            ({(row.posPcts.pos4 + row.posPcts.pos5).toFixed(1)}%)
                          </span>
                        </td>
                        <td className="py-2 px-1.5 text-center font-semibold text-amber-300">
                          {row.posWins.pos6To8}{' '}
                          <span className="text-[10px] text-amber-400/70">({row.posPcts.pos6To8}%)</span>
                        </td>
                        <td className="py-2 pl-1.5 text-center font-bold text-red-400">
                          {row.posWins.noFv} <span className="text-[10px] text-red-400/70">({row.posPcts.noFv}%)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 3. MOTOR DE REGLAS ESTRATÉGICAS PARA ARMAR 5Y6 Y POOL DE 4 */}
          {(data.prescriptionRules ?? []).length > 0 && (
            <div className="bg-gray-900 border border-yellow-700/40 rounded-2xl p-4 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                  <span>🎯</span>
                  <span>3. Recetario Matemático para Armar 5y6 y Pool de 4 (FV + Lote + Distancia)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Reglas cruzadas validadas contra el historial real para decidir cuándo jugar Línea, Candado (2), Trilogía (3) o Multiplicar (4+).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.prescriptionRules.map(pr => (
                  <div key={pr.id} className="bg-gray-950/80 border border-gray-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-yellow-500/15 text-yellow-300 border border-yellow-600/30">
                        {pr.actionBadge}
                      </span>
                      <span className="text-xs font-extrabold text-green-400">
                        {pr.successPct}% ({pr.successCount}/{pr.matchingRaces}) · {pr.targetOutcomeLabel}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white">{pr.title}</p>
                    <p className="text-[11px] text-gray-400">
                      <strong className="text-gray-300">Condición:</strong> {pr.conditionText}
                    </p>
                    <p className="text-[11px] text-yellow-200/90 bg-yellow-950/20 border border-yellow-800/30 rounded-lg px-2.5 py-1.5">
                      💡 <strong>Acción 5y6:</strong> {pr.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3B. SIMULADOR DE CANDADOS (DÚOS 1º+2º) Y TRILOGÍAS (1º+2º+3º) */}
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

          {/* 3C. GENERADOR DE 5 Y 6 RECOMENDADO + BACKTESTING ANUAL DE TODAS LAS REUNIONES */}
          {data.upcomingFiveAndSix && (
            <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-green-950/20 border border-green-700/40 rounded-2xl p-4 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-extrabold text-white">
                      🏆 5 y 6 Recomendado por Algoritmo FV — Reunión {data.upcomingFiveAndSix.meetingNumber} ({data.upcomingFiveAndSix.date})
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        data.upcomingFiveAndSix.isHistoricalPreview
                          ? 'bg-gray-800 text-gray-300 border-gray-700'
                          : 'bg-green-950/80 text-green-300 border-green-700/60'
                      }`}
                    >
                      {data.upcomingFiveAndSix.isHistoricalPreview ? 'Última reunión corrida' : '🟢 Reunión activa / Por correr'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-950/60 text-yellow-300 border border-yellow-700/50">
                      {data.upcomingFiveAndSix.hasSuperFijo
                        ? '📌 Con Súper Fijo + Comodín TODOS en Blindado'
                        : '🛡️ Jornada Sin Súper Fijo (Medio y Blindado van SIN LÍNEA)'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Calculado con Factor Oficial Bs. 50 vigente · Refuerza el "2º Fijo" (trampa histórica), juega Sin Línea cuando no hay fijo dominante y activa TODOS en la válida trampa.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTicketProfile('economico')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      ticketProfile === 'economico'
                        ? 'bg-yellow-500 text-black border-yellow-500'
                        : 'bg-gray-950 text-gray-400 border-gray-800'
                    }`}
                  >
                    1. Económico ({data.upcomingFiveAndSix.combinationsEco} comb. · Bs. {data.upcomingFiveAndSix.costBsEco.toLocaleString('es-VE')})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketProfile('medio')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      ticketProfile === 'medio'
                        ? 'bg-sky-400 text-black border-sky-400'
                        : 'bg-gray-950 text-gray-400 border-gray-800'
                    }`}
                  >
                    2. Medio ({data.upcomingFiveAndSix.combinationsMed} comb. · Bs. {data.upcomingFiveAndSix.costBsMed.toLocaleString('es-VE')})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketProfile('blindado')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      ticketProfile === 'blindado'
                        ? 'bg-green-500 text-black border-green-500'
                        : 'bg-gray-950 text-gray-400 border-gray-800'
                    }`}
                  >
                    3. Blindado ({data.upcomingFiveAndSix.combinationsBlindado} comb. · Bs. {data.upcomingFiveAndSix.costBsBlindado.toLocaleString('es-VE')})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketProfile('premium')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      ticketProfile === 'premium'
                        ? 'bg-purple-400 text-black border-purple-400'
                        : 'bg-gray-950 text-gray-400 border-gray-800'
                    }`}
                  >
                    👑 4. Premium ({data.upcomingFiveAndSix.combinationsPremium} comb. · Bs. {data.upcomingFiveAndSix.costBsPremium.toLocaleString('es-VE')})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.upcomingFiveAndSix.validas.map(v => {
                  const picks =
                    ticketProfile === 'economico'
                      ? v.picksEco
                      : ticketProfile === 'medio'
                      ? v.picksMed
                      : ticketProfile === 'blindado'
                      ? v.picksBlindado
                      : v.picksPremium;
                  const hit =
                    ticketProfile === 'economico'
                      ? v.hitEco
                      : ticketProfile === 'medio'
                      ? v.hitMed
                      : ticketProfile === 'blindado'
                      ? v.hitBlindado
                      : v.hitPremium;
                  const badge =
                    ticketProfile === 'economico'
                      ? v.badgeEco
                      : ticketProfile === 'medio'
                      ? v.badgeMed
                      : ticketProfile === 'blindado'
                      ? v.badgeBli
                      : v.badgePre;
                  return (
                    <div key={v.validaNumber} className="bg-gray-950/90 border border-gray-800 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-yellow-400">
                          {v.validaNumber}ª Válida · C{v.raceNumber} ({v.distance}m · {v.fieldSize} ej.)
                        </span>
                        {hit !== undefined && (
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                              hit ? 'bg-green-950 text-green-400 border border-green-700/50' : 'bg-red-950 text-red-400 border border-red-700/50'
                            }`}
                          >
                            {hit ? '✅ ACERTADA' : '❌ FALLÓ'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-sky-300 bg-sky-950/40 border border-sky-800/40 rounded px-2 py-1">
                        {badge} — <span className="font-normal text-gray-300">{v.reasonText}</span>
                      </div>
                      <div className="space-y-1">
                        {picks.map(p => (
                          <div key={p.pos} className="flex items-center justify-between text-xs bg-gray-900/90 rounded-lg px-2.5 py-1.5">
                            <span className="font-semibold text-white truncate">
                              #{p.dorsalNumber ?? '?'} {p.horseName}
                            </span>
                            <span className="text-[11px] font-bold text-yellow-300 shrink-0 ml-2">
                              {p.pos}º FV ({p.fvPct}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3D. BACKTESTING HISTÓRICO ANUAL DE TODOS LOS 5 Y 6 + AUDITORÍA DE DIVIDENDOS */}
          {data.fiveAndSixBacktest && data.fiveAndSixBacktest.totalMeetings > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    📊 3D. Verificador Anual y Rentabilidad de 5 y 6 ({data.fiveAndSixBacktest.totalMeetings} reuniones · Factor Bs. 20 hasta 03/09, Bs. 35 hasta 30/10 y Bs. 50 desde 31/10)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Compara cuadros con 6 aciertos, inversión acumulada, premios cobrados (con 6 + múltiplos de 5) y ganancia neta por metodología.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                  label={`1. Económico (~${data.fiveAndSixBacktest.economico.avgCombinations} comb.)`}
                  value={`${data.fiveAndSixBacktest.economico.hits6} con 6 (${data.fiveAndSixBacktest.economico.pct6}%)`}
                  sub={`+${data.fiveAndSixBacktest.economico.hits5} con 5 · Cobró Bs. ${data.fiveAndSixBacktest.economico.totalWonBs.toLocaleString('es-VE')} · Neto: Bs. ${data.fiveAndSixBacktest.economico.netProfitBs.toLocaleString('es-VE')}`}
                  color={GOLD}
                />
                <KpiCard
                  label={`2. Medio (~${data.fiveAndSixBacktest.medio.avgCombinations} comb.)`}
                  value={`${data.fiveAndSixBacktest.medio.hits6} con 6 (${data.fiveAndSixBacktest.medio.pct6}%)`}
                  sub={`+${data.fiveAndSixBacktest.medio.hits5} con 5 · Cobró Bs. ${data.fiveAndSixBacktest.medio.totalWonBs.toLocaleString('es-VE')} · Neto: Bs. ${data.fiveAndSixBacktest.medio.netProfitBs.toLocaleString('es-VE')}`}
                  color="#38bdf8"
                />
                <KpiCard
                  label={`3. Blindado (~${data.fiveAndSixBacktest.blindado.avgCombinations} comb.)`}
                  value={`${data.fiveAndSixBacktest.blindado.hits6} con 6 (${data.fiveAndSixBacktest.blindado.pct6}%)`}
                  sub={`+${data.fiveAndSixBacktest.blindado.hits5} con 5 · Cobró Bs. ${data.fiveAndSixBacktest.blindado.totalWonBs.toLocaleString('es-VE')} · Neto: Bs. ${data.fiveAndSixBacktest.blindado.netProfitBs.toLocaleString('es-VE')}`}
                  color="#22c55e"
                />
                <KpiCard
                  label={`👑 4. Premium (~${data.fiveAndSixBacktest.premium.avgCombinations} comb.)`}
                  value={`${data.fiveAndSixBacktest.premium.hits6} con 6 (${data.fiveAndSixBacktest.premium.pct6}%)`}
                  sub={`+${data.fiveAndSixBacktest.premium.hits5} con 5 · Cobró Bs. ${data.fiveAndSixBacktest.premium.totalWonBs.toLocaleString('es-VE')} · Neto: Bs. ${data.fiveAndSixBacktest.premium.netProfitBs.toLocaleString('es-VE')}`}
                  color="#c084fc"
                />
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-gray-500 uppercase border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Reunión / Fecha</th>
                      <th className="py-2 px-2 font-medium text-right">Dividendo Oficial (6 / 5)</th>
                      <th className="py-2 px-2 font-medium text-center">1. Económico</th>
                      <th className="py-2 px-2 font-medium text-center">2. Medio</th>
                      <th className="py-2 px-2 font-medium text-center">3. Blindado</th>
                      <th className="py-2 px-2 font-medium text-center text-purple-300">👑 4. Premium</th>
                      <th className="py-2 pl-2 font-medium text-right">Detalle 6 Válidas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fiveAndSixBacktest.meetings.map(m => {
                      const isOpen = expandedMeetingId === m.meetingId;
                      return (
                        <>
                          <tr key={m.meetingId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="py-2.5 pr-3 font-bold text-white whitespace-nowrap">
                              R{m.meetingNumber} <span className="text-gray-500 font-normal">· {m.date}</span>
                              <span className="block text-[10px] text-gray-600 font-normal">Factor Bs. {m.factorBs}</span>
                            </td>
                            <td className="py-2.5 px-2 text-right whitespace-nowrap">
                              <span className="font-bold text-yellow-400">
                                {m.payout6Bs > 0 ? `Bs. ${Math.round(m.payout6Bs).toLocaleString('es-VE')}` : '—'}
                              </span>
                              <span className="block text-[10px] text-gray-500">
                                5ac: {m.payout5Bs > 0 ? `Bs. ${Math.round(m.payout5Bs).toLocaleString('es-VE')}` : '—'}
                              </span>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md font-extrabold ${
                                  m.hitsEco === 6
                                    ? 'bg-green-950 text-green-300 border border-green-600'
                                    : m.hitsEco === 5
                                    ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-700/50'
                                    : 'bg-gray-800 text-gray-400'
                                }`}
                              >
                                {m.hitsEco}/6 {m.hitsEco === 6 ? '🏆' : m.hitsEco === 5 ? '🎯' : ''}
                              </span>
                              <span className="block text-[10px] text-gray-500 mt-0.5">{m.combinationsEco}c</span>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md font-extrabold ${
                                  m.hitsMed === 6
                                    ? 'bg-green-950 text-green-300 border border-green-600'
                                    : m.hitsMed === 5
                                    ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-700/50'
                                    : 'bg-gray-800 text-gray-400'
                                }`}
                              >
                                {m.hitsMed}/6 {m.hitsMed === 6 ? '🏆' : m.hitsMed === 5 ? '🎯' : ''}
                              </span>
                              <span className="block text-[10px] text-gray-500 mt-0.5">{m.combinationsMed}c</span>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md font-extrabold ${
                                  m.hitsBlindado === 6
                                    ? 'bg-green-950 text-green-300 border border-green-600'
                                    : m.hitsBlindado === 5
                                    ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-700/50'
                                    : 'bg-gray-800 text-gray-400'
                                }`}
                              >
                                {m.hitsBlindado}/6 {m.hitsBlindado === 6 ? '🏆' : m.hitsBlindado === 5 ? '🎯' : ''}
                              </span>
                              <span className="block text-[10px] text-gray-500 mt-0.5">{m.combinationsBlindado}c</span>
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md font-extrabold ${
                                  m.hitsPremium === 6
                                    ? 'bg-purple-950 text-purple-200 border border-purple-500'
                                    : m.hitsPremium === 5
                                    ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-700/50'
                                    : 'bg-gray-800 text-gray-400'
                                }`}
                              >
                                {m.hitsPremium}/6 {m.hitsPremium === 6 ? '👑' : m.hitsPremium === 5 ? '🎯' : ''}
                              </span>
                              <span className="block text-[10px] text-gray-500 mt-0.5">
                                {m.combinationsPremium}c
                                {m.prizeBsPremium > 0 ? ` · +Bs.${Math.round(m.prizeBsPremium).toLocaleString('es-VE')}` : ''}
                              </span>
                            </td>
                            <td className="py-2.5 pl-2 text-right">
                              <button
                                type="button"
                                onClick={() => setExpandedMeetingId(isOpen ? null : m.meetingId)}
                                className="text-xs font-bold text-yellow-400 hover:text-yellow-300"
                              >
                                {isOpen ? 'Ocultar ▲' : 'Ver 6 válidas ▼'}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr key={`${m.meetingId}-detail`} className="bg-gray-950/90 border-b border-gray-800">
                              <td colSpan={7} className="p-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {m.validas.map(v => (
                                    <div key={v.validaNumber} className="bg-gray-900 border border-gray-800 rounded-lg p-2.5 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-white">
                                          {v.validaNumber}ª Válida (C{v.raceNumber} · {v.distance}m · {v.fieldSize} ej.)
                                        </span>
                                        <span className="text-[11px] font-bold text-gray-300">
                                          Eco:{v.hitEco ? '✅' : '❌'} · Med:{v.hitMed ? '✅' : '❌'} · Bli:{v.hitBlindado ? '✅' : '❌'} · Pre:{v.hitPremium ? '✅' : '❌'}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-sky-300">
                                        Caballos por nivel: Eco({v.countEco}) · Med({v.countMed}) · Bli({v.countBli}) · 👑Pre({v.countPre})
                                      </p>
                                      <p className="text-[11px] text-gray-300">
                                        <strong>Selección Premium:</strong>{' '}
                                        {v.picksPremium.map(p => `#${p.dorsalNumber ?? '?'} (${p.fvPct}%)`).join(', ')}
                                      </p>
                                      {v.winner && (
                                        <p className="text-[11px] text-yellow-300">
                                          <strong>Ganó:</strong> #{v.winner.dorsalNumber ?? '?'} {v.winner.horseName} (
                                          {v.winner.fullFvRank
                                            ? `${v.winner.fullFvRank}º del FV · ${v.winner.fvPct}%`
                                            : '🔥 0% Sin marcas en FV'})
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3E. SECCIÓN PRIVADA ADMIN: ARMADOR INTERACTIVO DE VARIANTES Y CAZA-BATACAZOS */}
          {activeCazadorMeeting && data.fiveAndSixBacktest && (() => {
            const countsCustom = activeCazadorMeeting.validas.map(
              v => (customSelectedByValida[v.validaNumber] ?? []).length || 1
            );
            const combCustom = countsCustom.reduce((a, b) => a * b, 1);
            const factorCustom = activeCazadorMeeting.factorBs || 50;
            const costCustomBs = combCustom * factorCustom;

            let customHits = 0;
            let missedIdx = -1;
            let hasResults = false;
            const warnings: string[] = [];

            activeCazadorMeeting.validas.forEach((v, idx) => {
              const selectedKeys = customSelectedByValida[v.validaNumber] ?? [];
              const allH = v.allFvHorses?.length ? v.allFvHorses : v.picksPremium;
              for (const h of allH) {
                if (h.pos >= 1 && h.pos <= 4 && h.fvPct >= 18 && !selectedKeys.includes(horseIdKey(h))) {
                  warnings.push(
                    `Válida ${v.validaNumber}: Dejaste fuera al ${h.pos}º FV (#${h.dorsalNumber} ${h.horseName} con ${h.fvPct}% FV).`
                  );
                }
              }
              if (v.winner) {
                hasResults = true;
                const wKey = horseIdKey(v.winner);
                const hit = selectedKeys.some(
                  k =>
                    k === wKey ||
                    (v.winner?.dorsalNumber != null && k.startsWith(`${v.winner.dorsalNumber}_`))
                );
                if (hit) customHits++;
                else missedIdx = idx;
              }
            });

            let customPrizeBs = 0;
            if (hasResults && activeCazadorMeeting.payout6Bs > 0) {
              if (customHits === 6) {
                customPrizeBs = Math.round(activeCazadorMeeting.payout6Bs);
              } else if (customHits === 5 && missedIdx >= 0) {
                customPrizeBs = Math.round(activeCazadorMeeting.payout5Bs);
              }
            }

            return (
              <div className="bg-gradient-to-br from-gray-900 via-[#1a0f1e] to-gray-900 border-2 border-rose-600/50 rounded-2xl p-4 space-y-4 shadow-[0_0_35px_rgba(225,29,72,0.12)]">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-rose-900/40 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                        <span>💣</span>
                        <span>3E. Laboratorio Privado — Tablero de 8 Factores y Cuadro Cazador Potencial</span>
                      </h3>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-600">
                        🔒 Uso Exclusivo Admin
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Mantiene la <strong>Base Fija (1º–3º FV)</strong>, enciende o apaga en vivo los <strong>8 factores de cada carrera</strong> (incluyendo la alerta <strong>✂️ Quitar 1º FV para bajar costo</strong> y las etiquetas <strong>🪶 50–52kg / 🔥 Entrenador / ⚡ Jinete</strong>) y te permite meter o sacar cualquier ejemplar con un clic.
                    </p>
                  </div>

                  {/* Selector de Reunión a Simular */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={cazadorMeetingId}
                      onChange={e => setCazadorMeetingId(e.target.value)}
                      className="bg-gray-950 border border-rose-700/60 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
                    >
                      <option value="upcoming">
                        Reunión Activa / Más Reciente (R{data.upcomingFiveAndSix?.meetingNumber ?? ''})
                      </option>
                      {data.fiveAndSixBacktest.meetings.map(m => (
                        <option key={m.meetingId} value={m.meetingId}>
                          Reunión {m.meetingNumber} · {m.date}{' '}
                          {m.payout6Bs > 0 ? `(Div. 6: Bs. ${Math.round(m.payout6Bs).toLocaleString('es-VE')})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* KPIs Anuales del Cuadro Cazador Potencial */}
                {data.fiveAndSixBacktest.cazador && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <KpiCard
                      label="Cazador Potencial: 6 de 6"
                      value={`${data.fiveAndSixBacktest.cazador.hits6} de ${data.fiveAndSixBacktest.totalMeetings}`}
                      sub={`${data.fiveAndSixBacktest.cazador.pct6}% (+${data.fiveAndSixBacktest.cazador.hits5} con 5 = ${data.fiveAndSixBacktest.cazador.pct5Or6}%)`}
                      color="#fb7185"
                    />
                    <KpiCard
                      label="Comb. Promedio Cazador"
                      value={`${data.fiveAndSixBacktest.cazador.avgCombinations} comb.`}
                      sub="Base + Alertas + 50kg/Yuntas"
                      color="white"
                    />
                    <KpiCard
                      label="Total Cobrado (1 pago INH)"
                      value={`Bs. ${data.fiveAndSixBacktest.cazador.totalWonBs.toLocaleString('es-VE')}`}
                      sub={`Costo: Bs. ${data.fiveAndSixBacktest.cazador.totalCostBs.toLocaleString('es-VE')}`}
                      color="#22c55e"
                    />
                    <KpiCard
                      label="Ganancia Neta Cazador"
                      value={`Bs. ${data.fiveAndSixBacktest.cazador.netProfitBs.toLocaleString('es-VE')}`}
                      sub="Sin sumar múltiplos de 5"
                      color={GOLD}
                    />
                  </div>
                )}

                {/* Botones de las 4 Variantes + Resumen en Vivo del Cuadro Armado */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-950/90 border border-rose-900/50 rounded-xl p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCazadorVariant('cazador_fv')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                        cazadorVariant === 'cazador_fv'
                          ? 'bg-rose-600 text-white border-rose-500'
                          : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      🎯 1. Cuadro Cazador Potencial (Base + Alertas + 50kg/Yunta)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCazadorVariant('quitar_1fv')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                        cazadorVariant === 'quitar_1fv'
                          ? 'bg-pink-600 text-white border-pink-400'
                          : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      ✂️ 2. Quitar 1º FV en Carreras con Alerta (Bajar Costo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCazadorVariant('top5_abierto')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                        cazadorVariant === 'top5_abierto'
                          ? 'bg-amber-500 text-black border-amber-400'
                          : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      🔥 3. Top 5 FV Abierto
                    </button>
                    <button
                      type="button"
                      onClick={() => setCazadorVariant('bomba_todos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${
                        cazadorVariant === 'bomba_todos'
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-600'
                      }`}
                    >
                      🌟 4. 1 Carrera con TODOS (0% FV)
                    </button>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-extrabold px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-white">
                      {countsCustom.join(' × ')} = <span className="text-yellow-400">{combCustom} comb.</span> ·{' '}
                      <span className="text-green-400">Bs. {costCustomBs.toLocaleString('es-VE')}</span>
                    </span>
                    {hasResults && (
                      <span
                        className={`text-xs font-black px-3 py-1.5 rounded-lg border ${
                          customHits === 6
                            ? 'bg-green-950 text-green-300 border-green-600'
                            : customHits === 5
                            ? 'bg-yellow-950 text-yellow-300 border-yellow-600'
                            : 'bg-gray-900 text-gray-400 border-gray-700'
                        }`}
                      >
                        Resultado Tu Selección: {customHits}/6{' '}
                        {customPrizeBs > 0 ? `→ Cobró Bs. ${customPrizeBs.toLocaleString('es-VE')}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {warnings.length > 0 && (
                  <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl px-3.5 py-2 text-xs text-amber-200 space-y-0.5">
                    {warnings.map((w, i) => (
                      <div key={i}>⚠️ {w}</div>
                    ))}
                  </div>
                )}

                {/* Las 6 Válidas Interactivas con Tablero de 8 Factores Encendidos/Apagados */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeCazadorMeeting.validas.map(v => {
                    const selectedKeys = customSelectedByValida[v.validaNumber] ?? [];
                    const allH = v.allFvHorses?.length ? v.allFvHorses : v.picksPremium;
                    const winnerKey = v.winner ? horseIdKey(v.winner) : null;
                    const validaHit =
                      v.winner &&
                      selectedKeys.some(
                        k =>
                          k === winnerKey ||
                          (v.winner?.dorsalNumber != null && k.startsWith(`${v.winner.dorsalNumber}_`))
                      );

                    return (
                      <div
                        key={v.validaNumber}
                        className={`rounded-xl p-3 space-y-2 border ${
                          v.canDropFirstFv
                            ? 'bg-gray-950/95 border-rose-500/60'
                            : 'bg-gray-950/90 border-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-white">
                            {v.validaNumber}ª Válida · C{v.raceNumber} ({v.distance}m · {v.fieldSize} ej.)
                          </span>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/60">
                            {selectedKeys.length} sel.
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <span className="text-[10px] font-bold text-sky-300 bg-sky-950/40 border border-sky-800/40 rounded px-2 py-0.5">
                            {v.category ?? 'Lote'} · {v.ageGroup ?? ''}{' '}
                            {v.forecasterCount != null ? `(${v.forecasterCount} pron.)` : ''}
                          </span>
                          {v.winner && (
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                validaHit
                                  ? 'bg-green-950 text-green-400 border border-green-700/50'
                                  : 'bg-red-950 text-red-400 border border-red-700/50'
                              }`}
                            >
                              {validaHit ? '✅ PEGÓ' : '❌ FALLÓ'} (#{v.winner.dorsalNumber}{' '}
                              {v.winner.fullFvRank ? `${v.winner.fullFvRank}º FV` : '0% Sin FV'})
                            </span>
                          )}
                        </div>

                        {/* TABLERO DE LOS 8 FACTORES (Siempre visibles: Encendidos en color / Apagados en gris) */}
                        {v.factors && v.factors.length > 0 && (
                          <div className="grid grid-cols-2 gap-1 pt-0.5">
                            {v.factors.map(f => {
                              const activeStyle =
                                f.tone === 'green'
                                  ? 'bg-emerald-950/70 border-emerald-500/70 text-emerald-200 font-extrabold'
                                  : f.tone === 'purple'
                                  ? 'bg-purple-950/70 border-purple-500/70 text-purple-200 font-extrabold'
                                  : f.tone === 'rose'
                                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 font-extrabold'
                                  : f.tone === 'amber'
                                  ? 'bg-amber-950/70 border-amber-500/70 text-amber-200 font-extrabold'
                                  : 'bg-red-950/70 border-red-500/70 text-red-200 font-extrabold';
                              return (
                                <div
                                  key={f.id}
                                  className={`text-[9.5px] px-1.5 py-1 rounded border flex items-center justify-between gap-1 ${
                                    f.active
                                      ? activeStyle
                                      : 'bg-gray-900/40 border-gray-800/60 text-gray-600'
                                  }`}
                                >
                                  <span className="truncate">{f.label}</span>
                                  <span className="shrink-0 font-black">
                                    {f.pendingFv ? '⏳' : f.active ? 'ON' : 'OFF'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="text-[10px] font-semibold text-rose-200 bg-rose-950/40 border border-rose-800/40 rounded px-2 py-1">
                          {v.badgeCazador}
                        </div>

                        {/* Botones rápidos por válida */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setValidaQuickPreset(v, 'top2')}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700"
                          >
                            1º+2º (2)
                          </button>
                          <button
                            type="button"
                            onClick={() => setValidaQuickPreset(v, 'top3')}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-700"
                          >
                            1º–3º (3)
                          </button>
                          <button
                            type="button"
                            onClick={() => setValidaQuickPreset(v, 'sin_1fv')}
                            className="text-[10px] px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-600 font-bold"
                          >
                            ✂️ Sin 1º (2º–5º)
                          </button>
                          <button
                            type="button"
                            onClick={() => setValidaQuickPreset(v, 'top5')}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-900 hover:bg-gray-800 text-yellow-300 border border-gray-700"
                          >
                            Top 5 FV
                          </button>
                          <button
                            type="button"
                            onClick={() => setValidaQuickPreset(v, 'all_fv')}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-900 hover:bg-gray-800 text-rose-300 border border-gray-700"
                          >
                            Todos FV
                          </button>
                          <button
                            type="button"
                            onClick={() => setValidaQuickPreset(v, 'all_lote')}
                            className="text-[10px] px-2 py-0.5 rounded bg-gray-900 hover:bg-gray-800 text-purple-300 border border-gray-700"
                          >
                            TODOS ({allH.length})
                          </button>
                        </div>

                        {/* Lista clicable de TODOS los ejemplares inscritos (con FV y 0% Sin FV + etiquetas 50kg/Entrenador/Jinete) */}
                        <div className="space-y-1 max-h-60 overflow-y-auto pr-0.5">
                          {allH.map(h => {
                            const hKey = horseIdKey(h);
                            const isSelected = selectedKeys.includes(hKey);
                            const isWinner =
                              v.winner &&
                              (hKey === winnerKey ||
                                (v.winner.dorsalNumber != null && h.dorsalNumber === v.winner.dorsalNumber));
                            return (
                              <button
                                key={hKey}
                                type="button"
                                onClick={() => toggleCustomHorse(v.validaNumber, hKey)}
                                className={`w-full flex items-center justify-between text-xs rounded-lg px-2 py-1.5 border text-left transition-all ${
                                  isSelected
                                    ? 'bg-rose-950/60 border-rose-500 text-white'
                                    : 'bg-gray-900/50 border-gray-800/80 text-gray-500 hover:text-gray-300'
                                }`}
                              >
                                <span className="font-semibold truncate flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black shrink-0 ${
                                      isSelected ? 'bg-rose-500 text-white' : 'bg-gray-800 text-gray-500'
                                    }`}
                                  >
                                    {isSelected ? '✓' : ''}
                                  </span>
                                  <span>
                                    #{h.dorsalNumber ?? '?'} {h.horseName}
                                  </span>
                                  {h.hunterTags?.map((tg, tIdx) => (
                                    <span
                                      key={tIdx}
                                      className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                    >
                                      {tg}
                                    </span>
                                  ))}
                                  {isWinner && <span className="text-yellow-400 font-black">🏆</span>}
                                </span>
                                <span
                                  className={`text-[10px] font-bold shrink-0 ml-1.5 ${
                                    h.pos === 0
                                      ? 'text-purple-400'
                                      : h.pos <= 3
                                      ? 'text-yellow-300'
                                      : 'text-amber-300'
                                  }`}
                                >
                                  {h.pos > 0 ? `${h.pos}º FV (${h.fvPct}%)` : '0% Sin FV'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

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

                <select
                  value={distanceFilter}
                  onChange={e => setDistanceFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-yellow-600"
                >
                  <option value="all">Todas las distancias</option>
                  {(data.byDistance ?? []).map(d => (
                    <option key={d.distance} value={d.distance}>
                      {d.distanceLabel} ({d.totalRaces})
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
