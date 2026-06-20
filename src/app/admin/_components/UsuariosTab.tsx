import KpiCard from './KpiCard';
import SectionCard from './SectionCard';
import type { AdminStats } from '../_hooks/useAdminStats';

const GOLD = '#D4AF37';

export default function UsuariosTab({ stats }: { stats: AdminStats | null }) {
  const pendingTopups = stats?.tokenomics?.topups?.pending ?? 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Usuarios totales" value={stats?.totalUsers ?? 0} sub={`${stats?.roles.customer ?? 0} clientes`} color="white" />
        <KpiCard label="Con Gold" value={stats?.gold.usersWithGold ?? 0} sub={`${stats?.gold.usersNoGold ?? 0} sin Gold`} color="#22c55e" />
        <KpiCard label="Handicappers" value={stats?.roles?.handicapper ?? 0} color={GOLD} />
        <KpiCard label="Staff/Admin" value={(stats?.roles?.staff ?? 0) + (stats?.roles?.admin ?? 0)} color="#3b82f6" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionCard href="/admin/users" icon="👥" label="Usuarios" desc="Busca usuarios, asigna roles, revisa historial y gestiona cuentas." />
        <SectionCard href="/admin/topup" icon="💳" label="Recargas Pendientes" desc={`Aprueba o rechaza solicitudes de recarga de Gold.${pendingTopups > 0 ? ` (${pendingTopups} pendientes)` : ''}`} />
        <SectionCard href="/admin/handicapper-request" icon="🎓" label="Solicitudes Handicapper" desc="Revisa solicitudes de usuarios que quieren ser handicappers." />
      </div>
    </div>
  );
}
