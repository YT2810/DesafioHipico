import KpiCard from './KpiCard';
import SectionCard from './SectionCard';
import type { AdminStats } from '../_hooks/useAdminStats';

const GOLD = '#D4AF37';

function StatRow({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800/60 last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="text-right">
        <span className="text-sm font-bold" style={{ color: color ?? 'white' }}>{value}</span>
        {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
      </div>
    </div>
  );
}

function sumLastNDays(stats: AdminStats | null, field: 'registrations' | 'logins', days: number): number {
  if (!stats?.dailyStats) return 0;
  return stats.dailyStats.slice(-days).reduce((a, b) => a + (b[field] ?? 0), 0);
}

export default function UsuariosTab({ stats }: { stats: AdminStats | null }) {
  const pendingTopups    = stats?.tokenomics?.topups?.pending ?? 0;
  const regToday         = stats?.dailyStats?.[stats.dailyStats.length - 1]?.registrations ?? 0;
  const regLast7         = sumLastNDays(stats, 'registrations', 7);
  const regLast30        = sumLastNDays(stats, 'registrations', 30);
  const loginToday       = stats?.dailyStats?.[stats.dailyStats.length - 1]?.logins ?? 0;
  const loginLast7       = sumLastNDays(stats, 'logins', 7);
  const totalUsers       = stats?.totalUsers ?? 0;

  const uniqueBuyers     = stats?.conversion?.uniqueBuyers   ?? 0;
  const zeroBuyers       = stats?.conversion?.zeroBuyers     ?? 0;
  const convRate         = stats?.conversion?.conversionRate ?? 0;
  const withEmail        = stats?.audience?.withEmail        ?? 0;
  const noEmail          = stats?.audience?.noEmail          ?? 0;
  const withGoogle       = stats?.audience?.withGoogle       ?? 0;
  const withTelegram     = stats?.audience?.withTelegram     ?? 0;
  const newLast30d       = stats?.audience?.newLast30d       ?? 0;
  const newLast90d       = stats?.audience?.newLast90d       ?? 0;
  const active7d         = stats?.retention?.active7d        ?? 0;
  const active30d        = stats?.retention?.active30d       ?? 0;
  const ret7pct          = totalUsers > 0 ? Math.round((active7d  / totalUsers) * 100) : 0;
  const ret30pct         = totalUsers > 0 ? Math.round((active30d / totalUsers) * 100) : 0;

  return (
    <div className="space-y-6">

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Usuarios totales" value={totalUsers} sub={`${stats?.roles.customer ?? 0} clientes`} color="white" />
        <KpiCard label="Compradores únicos" value={uniqueBuyers} sub={`${convRate}% tasa conversión`} color={GOLD} />
        <KpiCard label="Activos 7d" value={active7d} sub={`${ret7pct}% retención`} color="#3b82f6" />
        <KpiCard label="Con email" value={withEmail} sub="lista email marketing" color="#22c55e" />
      </div>

      {/* Tres columnas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* Conversión */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">💰 Conversión</p>
          <div className="space-y-0.5">
            <StatRow label="Compradores únicos" value={uniqueBuyers} color={GOLD} />
            <StatRow
              label="Tasa de conversión"
              value={`${convRate}%`}
              sub="registrados → primera compra"
              color={convRate >= 2 ? '#22c55e' : convRate >= 0.5 ? GOLD : '#ef4444'}
            />
            <StatRow label="Sin Gold (compraron antes)" value={zeroBuyers} sub="candidatos recompra" color="#f97316" />
            <StatRow label="Ingresos aprobados" value={`$${(stats?.tokenomics?.topups?.approved?.usd ?? 0).toFixed(0)}`} color="#22c55e" />
            <StatRow label="Recargas pendientes" value={pendingTopups} color={pendingTopups > 0 ? '#facc15' : 'white'} />
          </div>
        </div>

        {/* Retención */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">🔄 Actividad</p>
          <div className="space-y-0.5">
            <StatRow label="Registros hoy" value={regToday} color="#22c55e" />
            <StatRow label="Registros últimos 7d" value={regLast7} color="#22c55e" />
            <StatRow label="Registros últimos 30d" value={regLast30} color="#6b7280" />
            <StatRow label="Logins hoy" value={loginToday} color="#3b82f6" />
            <StatRow label="Logins últimos 7d" value={loginLast7} color="#3b82f6" />
            <StatRow label="Activos últimos 30d" value={active30d} sub={`${ret30pct}% del total`} color="#6366f1" />
          </div>
        </div>

        {/* Audiencia */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">📧 Audiencia</p>
          <div className="space-y-0.5">
            <StatRow label="Con email válido" value={withEmail} sub="Google + Magic Link" color="#22c55e" />
            <StatRow label="Sin email" value={noEmail} sub="solo Telegram" color="#6b7280" />
            <StatRow label="Vía Google" value={withGoogle} color="#4285f4" />
            <StatRow label="Vía Telegram" value={withTelegram} color="#229ed9" />
            <StatRow label="Nuevos últimos 30d" value={newLast30d} color="white" />
            <StatRow label="Nuevos últimos 90d" value={newLast90d} color="white" />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-800/60 flex items-center justify-between">
            <p className="text-[10px] text-gray-500">Exportar lista de emails</p>
            <a href="/api/admin/users/export" download
              className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-green-900/40 border border-green-700/50 text-green-400 hover:bg-green-900/60 transition-colors">
              ⬇ CSV
            </a>
          </div>
        </div>
      </div>

      {/* Roles */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Roles</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
          <div className="bg-gray-800/60 rounded-xl px-3 py-2">
            <p className="text-lg font-extrabold text-white">{stats?.roles.customer ?? 0}</p>
            <p className="text-[10px] text-gray-500">Clientes</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl px-3 py-2">
            <p className="text-lg font-extrabold" style={{ color: GOLD }}>{stats?.roles.handicapper ?? 0}</p>
            <p className="text-[10px] text-gray-500">Handicappers</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl px-3 py-2">
            <p className="text-lg font-extrabold text-blue-400">{stats?.roles.staff ?? 0}</p>
            <p className="text-[10px] text-gray-500">Staff</p>
          </div>
          <div className="bg-gray-800/60 rounded-xl px-3 py-2">
            <p className="text-lg font-extrabold text-purple-400">{stats?.roles.admin ?? 0}</p>
            <p className="text-[10px] text-gray-500">Admin</p>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionCard href="/admin/users" icon="👥" label="Gestionar Usuarios" desc="Busca usuarios, asigna roles, revisa historial y gestiona cuentas." />
        <SectionCard href="/admin/topup" icon="💳" label="Recargas Pendientes" desc={`Aprueba o rechaza solicitudes de recarga de Gold.${pendingTopups > 0 ? ` (${pendingTopups} pendientes)` : ''}`} />
        <SectionCard href="/admin/handicapper-request" icon="🎓" label="Solicitudes Handicapper" desc="Revisa solicitudes de usuarios que quieren ser handicappers." />
      </div>
    </div>
  );
}
