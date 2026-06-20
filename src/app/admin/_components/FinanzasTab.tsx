import Link from 'next/link';
import KpiCard from './KpiCard';
import SectionCard from './SectionCard';
import type { AdminStats } from '../_hooks/useAdminStats';

const GOLD = '#D4AF37';

export default function FinanzasTab({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  const approvedUsd = stats?.tokenomics?.topups?.approved?.usd ?? 0;
  const pendingTopups = stats?.tokenomics?.topups?.pending ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Gold circulación" value={stats?.gold.total ?? 0} color={GOLD} />
        <KpiCard label="USD aprobados" value={`$${approvedUsd.toFixed(0)}`} color="#22c55e" />
        <KpiCard label="Recargas pendientes" value={pendingTopups} color={pendingTopups > 0 ? '#ef4444' : '#6b7280'} />
        <KpiCard label="Tx 30d" value={stats?.tokenomics?.txVolume30d?.count ?? 0} color="#3b82f6" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Transacciones por tipo (30d)</p>
        {loading ? (
          <div className="h-20 rounded-xl bg-gray-800 animate-pulse" />
        ) : stats?.tokenomics?.txByType?.length ? (
          <div className="space-y-2">
            {stats.tokenomics.txByType.map(t => (
              <div key={t.type} className="flex items-center justify-between py-1.5 border-b border-gray-800/60 last:border-0">
                <span className="text-sm text-gray-300 capitalize">{t.type.replace(/_/g, ' ')}</span>
                <div className="text-right">
                  <span className="text-xs font-bold text-white">{t.count}</span>
                  <span className="text-xs text-gray-500 ml-2">vol: {t.volume > 0 ? '+' : ''}{t.volume}G</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600">Sin transacciones en los últimos 30 días</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SectionCard href="/admin/topup" icon="💳" label="Recargas Pendientes" desc={`Gestiona solicitudes de recarga.${pendingTopups > 0 ? ` ${pendingTopups} pendientes.` : ''}`} />
        <SectionCard href="/admin/exchange-rate" icon="💱" label="Tasa BCV" desc="Actualiza la tasa de cambio BCV para calcular precios en Bs." />
      </div>
    </div>
  );
}
