'use client';

import { useEffect, useState } from 'react';
import KpiCard from './KpiCard';
import SectionCard from './SectionCard';
import type { AdminStats } from '../_hooks/useAdminStats';

const GOLD = '#D4AF37';

interface FvRow {
  position: number;
  total: number;
  wins: number;
  pct: number;
}

interface FvAccuracy {
  trackId: string;
  trackName: string;
  totalRaces: number;
  batacazos: number;
  batacazoPct: number;
  byPosition: FvRow[];
}

export default function PronosticosTab({ stats }: { stats: AdminStats | null }) {
  const [track, setTrack] = useState('rinconada');
  const [fv, setFv] = useState<FvAccuracy | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/stats/fv-accuracy?track=${track}`)
      .then(r => r.json())
      .then((data: FvAccuracy) => {
        if (!cancelled) setFv(data);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [track]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Pronósticos totales" value={stats?.tokenomics?.forecasts ?? 0} color="white" />
        <KpiCard label="Handicappers" value={stats?.roles?.handicapper ?? 0} color={GOLD} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Acierto Factor de Victoria</h3>
            <p className="text-xs text-gray-500">Carreras con resultado · Top 5 FV por posición · Batacazos</p>
          </div>
          <select
            value={track}
            onChange={e => setTrack(e.target.value)}
            className="bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-yellow-600"
          >
            <option value="rinconada">La Rinconada</option>
            <option value="valencia">Valencia</option>
          </select>
        </div>

        {loading && <p className="text-xs text-gray-500">Calculando…</p>}

        {!loading && fv && fv.totalRaces === 0 && (
          <p className="text-xs text-gray-500">No hay carreras con resultado para este hipódromo.</p>
        )}

        {!loading && fv && fv.totalRaces > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <KpiCard label="Carreras evaluadas" value={fv.totalRaces} color={GOLD} />
              <KpiCard label="Batacazos (ganó fuera del top 5)" value={fv.batacazos} sub={`${fv.batacazoPct}%`} color="#ef4444" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-800">
                  <tr>
                    <th className="pb-2 font-medium">Posición FV</th>
                    <th className="pb-2 font-medium">Carreras con esa posición</th>
                    <th className="pb-2 font-medium">Aciertos (ganó)</th>
                    <th className="pb-2 font-medium">% Acierto</th>
                  </tr>
                </thead>
                <tbody>
                  {fv.byPosition.map(row => (
                    <tr key={row.position} className="border-b border-gray-800/50 last:border-0">
                      <td className="py-2.5 text-white font-semibold">{row.position}º</td>
                      <td className="py-2.5 text-gray-400">{row.total}</td>
                      <td className="py-2.5 text-gray-400">{row.wins}</td>
                      <td className="py-2.5">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold"
                          style={{ backgroundColor: row.pct >= 50 ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.05)', color: row.pct >= 50 ? GOLD : '#9ca3af' }}
                        >
                          {row.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionCard href="/admin/intelligence" icon="🧠" label="Subir Pronóstico" desc="Pega texto, imagen o URL de un handicapper. La IA extrae las marcas." />
        <SectionCard href="/staff/fuentes" icon="📡" label="Fuentes y Handicappers" desc="Catálogo de handicappers conocidos y sus fuentes." />
        <SectionCard href="/admin/handicapper-request" icon="🎓" label="Solicitudes Handicapper" desc="Revisa solicitudes de usuarios que quieren ser handicappers." />
      </div>
    </div>
  );
}
