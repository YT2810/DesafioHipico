import KpiCard from './KpiCard';
import SectionCard from './SectionCard';
import type { AdminStats } from '../_hooks/useAdminStats';

const GOLD = '#D4AF37';

export default function CarrerasTab({ stats }: { stats: AdminStats | null }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Reuniones totales" value={stats?.tokenomics?.meetings ?? 0} color="white" />
        <KpiCard label="Pronósticos" value={stats?.tokenomics?.forecasts ?? 0} color={GOLD} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionCard href="/admin/ingest" icon="🏁" label="Cargar Resultados" desc="Sube fotos del tablero y guarda posiciones, pagos y dividendos." />
        <SectionCard href="/admin/meetings" icon="📋" label="Reuniones y Programas" desc="Ingesta de PDFs del programa, video resumen y estado de cada reunión." />
        <SectionCard href="/admin/workouts" icon="⏱️" label="Subir Traqueos" desc="Sube archivos Excel o PDF de la División de Toma Tiempos." />
      </div>
    </div>
  );
}
