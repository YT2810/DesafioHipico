'use client';

import KpiCard from './KpiCard';
import SectionCard from './SectionCard';
import type { AdminStats } from '../_hooks/useAdminStats';

const GOLD = '#D4AF37';

export default function PronosticosTab({
  stats,
  onOpenLab,
}: {
  stats: AdminStats | null;
  onOpenLab?: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Pronósticos totales" value={stats?.tokenomics?.forecasts ?? 0} color="white" />
        <KpiCard label="Handicappers" value={stats?.roles?.handicapper ?? 0} color={GOLD} />
      </div>

      {onOpenLab && (
        <div className="bg-gray-900 border border-yellow-700/40 rounded-2xl px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🧪</span>
              <span>Estadísticas del Factor de Victoria ahora están en Laboratorio FV</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Consulta el cuadro general de aciertos, efectividad +40/+50/+60, caídas de favoritos, tamaño de lote, candados y trilogías.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenLab}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-black transition-opacity hover:opacity-90"
            style={{ backgroundColor: GOLD }}
          >
            Abrir Laboratorio FV →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionCard href="/admin/intelligence" icon="🧠" label="Subir Pronóstico" desc="Pega texto, imagen o URL de un handicapper. La IA extrae las marcas." />
        <SectionCard href="/staff/fuentes" icon="📡" label="Fuentes y Handicappers" desc="Catálogo de handicappers conocidos y sus fuentes." />
        <SectionCard href="/admin/handicapper-request" icon="🎓" label="Solicitudes Handicapper" desc="Revisa solicitudes de usuarios que quieren ser handicappers." />
      </div>
    </div>
  );
}
