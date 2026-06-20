import KpiCard from './KpiCard';
import SectionCard from './SectionCard';
import type { AdminStats } from '../_hooks/useAdminStats';

const GOLD = '#D4AF37';

export default function PronosticosTab({ stats }: { stats: AdminStats | null }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Pronósticos totales" value={stats?.tokenomics?.forecasts ?? 0} color="white" />
        <KpiCard label="Handicappers" value={stats?.roles?.handicapper ?? 0} color={GOLD} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionCard href="/admin/intelligence" icon="🧠" label="Subir Pronóstico" desc="Pega texto, imagen o URL de un handicapper. La IA extrae las marcas." />
        <SectionCard href="/staff/fuentes" icon="📡" label="Fuentes y Handicappers" desc="Catálogo de handicappers conocidos y sus fuentes." />
        <SectionCard href="/admin/handicapper-request" icon="🎓" label="Solicitudes Handicapper" desc="Revisa solicitudes de usuarios que quieren ser handicappers." />
      </div>
    </div>
  );
}
