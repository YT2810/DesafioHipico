import KpiCard from './KpiCard';
import SectionCard from './SectionCard';
import type { AdminStats } from '../_hooks/useAdminStats';

const GOLD = '#D4AF37';

function sumLastNDays(stats: AdminStats | null, field: "registrations" | "logins", days: number): number {
  if (!stats?.dailyStats) return 0;
  const slice = stats.dailyStats.slice(-days);
  return slice.reduce((a, b) => a + (b[field] ?? 0), 0);
}

export default function UsuariosTab({ stats }: { stats: AdminStats | null }) {
  const pendingTopups = stats?.tokenomics?.topups?.pending ?? 0;
  const regToday = stats?.dailyStats?.[stats.dailyStats.length - 1]?.registrations ?? 0;
  const regMonth = sumLastNDays(stats, "registrations", 30);
  const loginToday = stats?.dailyStats?.[stats.dailyStats.length - 1]?.logins ?? 0;
  const loginMonth = sumLastNDays(stats, "logins", 30);
  const totalUsers = stats?.totalUsers ?? 1;
  const convRate = totalUsers > 0 ? Math.round((loginToday / totalUsers) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Usuarios totales" value={stats?.totalUsers ?? 0} sub={`${stats?.roles.customer ?? 0} clientes`} color="white" />
        <KpiCard label="Con Gold" value={stats?.gold.usersWithGold ?? 0} sub={`${stats?.gold.usersNoGold ?? 0} sin Gold`} color="#22c55e" />
        <KpiCard label="Handicappers" value={stats?.roles?.handicapper ?? 0} color={GOLD} />
        <KpiCard label="Staff/Admin" value={(stats?.roles?.staff ?? 0) + (stats?.roles?.admin ?? 0)} color="#3b82f6" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Registros hoy" value={regToday} color="#22c55e" />
        <KpiCard label="Registros mes" value={regMonth} color="#22c55e" />
        <KpiCard label="Logins hoy" value={loginToday} color="#3b82f6" />
        <KpiCard label="Logins mes" value={loginMonth} color="#3b82f6" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Tasa conversión</p>
        <p className="text-xl font-extrabold text-white">{convRate}% <span className="text-xs font-normal text-gray-500">logins hoy / usuarios totales</span></p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionCard href="/admin/users" icon="👥" label="Usuarios" desc="Busca usuarios, asigna roles, revisa historial y gestiona cuentas." />
        <SectionCard href="/admin/topup" icon="💳" label="Recargas Pendientes" desc={`Aprueba o rechaza solicitudes de recarga de Gold.${pendingTopups > 0 ? ` (${pendingTopups} pendientes)` : ''}`} />
        <SectionCard href="/admin/handicapper-request" icon="🎓" label="Solicitudes Handicapper" desc="Revisa solicitudes de usuarios que quieren ser handicappers." />
      </div>
    </div>
  );
}
