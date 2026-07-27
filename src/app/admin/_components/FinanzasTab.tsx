import { useState } from 'react';
import Link from 'next/link';
import KpiCard from './KpiCard';
import SectionCard from './SectionCard';
import type { AdminStats } from '../_hooks/useAdminStats';
import { fmtDay } from '../_hooks/useAdminStats';

const GOLD = '#D4AF37';

function goldNet(d: any): number {
  return (d.gold?.bonus ?? 0) + (d.gold?.welcomeBonus ?? 0) + (d.gold?.purchase ?? 0) + (d.gold?.adminAssign ?? 0) + (d.gold?.refund ?? 0) + (d.gold?.other ?? 0) + (d.gold?.raceUnlock ?? 0) + (d.gold?.meetingPass ?? 0);
}

function goldEmitted(d: any): number {
  return (d.gold?.bonus ?? 0) + (d.gold?.welcomeBonus ?? 0) + (d.gold?.purchase ?? 0) + (d.gold?.adminAssign ?? 0) + (d.gold?.refund ?? 0) + (d.gold?.other ?? 0);
}

function goldBurned(d: any): number {
  return Math.abs((d.gold?.raceUnlock ?? 0) + (d.gold?.meetingPass ?? 0));
}

export default function FinanzasTab({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  const [range, setRange] = useState<'hoy' | 'ayer' | 7 | 14 | 30 | 90 | 365>(7);
  const sliced = stats && typeof range === 'number' ? stats.dailyStats.slice(-range) : [];
  const todayData = stats?.dailyStats[stats.dailyStats.length - 1] ?? null;
  const yesterdayData = stats?.dailyStats[stats.dailyStats.length - 2] ?? null;
  const dayDetail = range === 'hoy' ? todayData : range === 'ayer' ? yesterdayData : null;
  const approvedUsd = stats?.tokenomics?.topups?.approved?.usd ?? 0;
  const pendingTopups = stats?.tokenomics?.topups?.pending ?? 0;

  const maxGold = sliced.length ? Math.max(...sliced.map(d => Math.max(goldEmitted(d), goldBurned(d))), 1) : 1;
  const totalEmitted = sliced.reduce((a, d) => a + goldEmitted(d), 0);
  const totalBurned = sliced.reduce((a, d) => a + goldBurned(d), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Gold circulación" value={stats?.gold.total ?? 0} color={GOLD} />
        <KpiCard label="USD aprobados" value={`$${approvedUsd.toFixed(0)}`} color="#22c55e" />
        <KpiCard label="Recargas pendientes" value={pendingTopups} color={pendingTopups > 0 ? '#ef4444' : '#6b7280'} />
        <KpiCard label="Tx 30d" value={stats?.tokenomics?.txVolume30d?.count ?? 0} color="#3b82f6" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Gold Economics · Emitido vs Quemado</p>
          <div className="flex gap-1 flex-wrap">
            {(['hoy', 'ayer', 7, 14, 30, 90, 365] as const).map(d => (
              <button key={String(d)} onClick={() => setRange(d)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${range === d ? 'bg-yellow-700/40 text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}>
                {d === 365 ? '1Y' : typeof d === 'number' ? `${d}d` : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3 text-center">
          <div>
            <p className="text-lg font-extrabold text-green-400">+{totalEmitted}</p>
            <p className="text-[10px] text-gray-500">Emitido</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-red-400">-{totalBurned}</p>
            <p className="text-[10px] text-gray-500">Quemado</p>
          </div>
          <div>
            <p className="text-lg font-extrabold text-white">{totalEmitted - totalBurned}</p>
            <p className="text-[10px] text-gray-500">Neto</p>
          </div>
        </div>
        {loading ? (
          <div className="h-20 rounded-xl bg-gray-800 animate-pulse" />
        ) : dayDetail ? (
          <div className="space-y-3">
            <p className="text-[10px] text-gray-600">{dayDetail.date}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-green-400">+{goldEmitted(dayDetail)}</p>
                <p className="text-[10px] text-gray-500">Emitido</p>
              </div>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-red-400">-{goldBurned(dayDetail)}</p>
                <p className="text-[10px] text-gray-500">Quemado</p>
              </div>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-white">{goldEmitted(dayDetail) - goldBurned(dayDetail)}</p>
                <p className="text-[10px] text-gray-500">Neto</p>
              </div>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-yellow-400">{dayDetail.registrations}</p>
                <p className="text-[10px] text-gray-500">Registros</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                { label: 'Compras (recarga)', key: 'purchase', color: 'text-green-300' },
                { label: 'Welcome bonus', key: 'welcomeBonus', color: 'text-yellow-300' },
                { label: 'Bonus/promo', key: 'bonus', color: 'text-orange-300' },
                { label: 'Desbloqueos', key: 'raceUnlock', color: 'text-red-300' },
                { label: 'Pases jornada', key: 'meetingPass', color: 'text-red-300' },
                { label: 'Asig. admin', key: 'adminAssign', color: 'text-blue-300' },
              ].map(({ label, key, color }) => (
                <div key={key} className="bg-gray-800/40 rounded-lg px-2 py-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">{label}</span>
                  <span className={`text-[10px] font-bold ${color}`}>{(dayDetail.gold?.[key as keyof typeof dayDetail.gold] ?? 0) > 0 ? '+' : ''}{dayDetail.gold?.[key as keyof typeof dayDetail.gold] ?? 0}G</span>
                </div>
              ))}
            </div>
          </div>
        ) : sliced.length ? (
          <>
            <div className="flex items-end gap-1.5 h-24">
              {sliced.map(d => {
                const emitted = goldEmitted(d);
                const burned = goldBurned(d);
                const maxH = Math.max(emitted, burned);
                const hPct = maxH > 0 ? Math.round((maxH / maxGold) * 100) : 0;
                const ePct = emitted > 0 ? Math.round((emitted / maxGold) * 100) : 0;
                const bPct = burned > 0 ? Math.round((burned / maxGold) * 100) : 0;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                    <p className="text-[9px] text-gray-600">{goldNet(d)}</p>
                    <div className="w-full flex flex-col-reverse items-center gap-px">
                      {ePct > 0 && <div className="w-full rounded-t-sm bg-green-700/60" style={{ height: `${Math.max(ePct, 3)}%` }} />}
                      {bPct > 0 && <div className="w-full rounded-t-sm bg-red-700/60" style={{ height: `${Math.max(bPct, 3)}%` }} />}
                    </div>
                    <p className="text-[9px] text-gray-600 leading-none">{fmtDay(d.date)}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-green-700/60 inline-block" /> Emitido</span>
              <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-red-700/60 inline-block" /> Quemado</span>
            </div>
            {/* Emitted breakdown */}
            <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 gap-1.5">
              {[
                { label: 'Compras (recarga)', key: 'purchase', color: 'text-green-300' },
                { label: 'Asig. admin', key: 'adminAssign', color: 'text-blue-300' },
                { label: 'Welcome bonus', key: 'welcomeBonus', color: 'text-yellow-300' },
                { label: 'Bonus/promo', key: 'bonus', color: 'text-orange-300' },
              ].map(({ label, key, color }) => {
                const total = sliced.reduce((a, d) => a + (d.gold?.[key as keyof typeof d.gold] ?? 0), 0);
                return total > 0 ? (
                  <div key={key} className="flex items-center justify-between bg-gray-800/40 rounded-lg px-2 py-1">
                    <span className="text-[10px] text-gray-500">{label}</span>
                    <span className={`text-[10px] font-bold ${color}`}>+{total}G</span>
                  </div>
                ) : null;
              })}
            </div>
          </>
        ) : null}
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
