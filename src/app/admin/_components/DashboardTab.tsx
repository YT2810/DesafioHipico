import Link from 'next/link';
import KpiCard from './KpiCard';
import type { AdminStats } from '../_hooks/useAdminStats';
import { fmtDay } from '../_hooks/useAdminStats';
import { useState } from 'react';

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

export default function DashboardTab({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  const [range, setRange] = useState<'hoy' | 'ayer' | 7 | 14 | 30 | 90 | 365>(7);
  const sliced = stats && typeof range === 'number' ? stats.dailyStats.slice(-range) : [];
  const maxLogins = sliced.length ? Math.max(...sliced.map(x => x.logins), 1) : 1;
  const pendingTopups = stats?.tokenomics?.topups?.pending ?? 0;
  const todayData = stats?.dailyStats[stats.dailyStats.length - 1] ?? null;
  const yesterdayData = stats?.dailyStats[stats.dailyStats.length - 2] ?? null;
  const dayDetail = range === 'hoy' ? todayData : range === 'ayer' ? yesterdayData : null;

  const totalUsers = stats?.totalUsers ?? 0;
  const retention7  = stats?.retention?.active7d  ?? 0;
  const retention30 = stats?.retention?.active30d ?? 0;
  const retention90 = stats?.retention?.active90d ?? 0;
  const ret7pct  = totalUsers > 0 ? Math.round((retention7  / totalUsers) * 100) : 0;
  const ret30pct = totalUsers > 0 ? Math.round((retention30 / totalUsers) * 100) : 0;
  const ret90pct = totalUsers > 0 ? Math.round((retention90 / totalUsers) * 100) : 0;

  const uniqueBuyers   = stats?.conversion?.uniqueBuyers   ?? 0;
  const zeroBuyers     = stats?.conversion?.zeroBuyers     ?? 0;
  const convRate       = stats?.conversion?.conversionRate ?? 0;
  const withEmail      = stats?.audience?.withEmail        ?? 0;
  const noEmail        = stats?.audience?.noEmail          ?? 0;
  const withGoogle     = stats?.audience?.withGoogle       ?? 0;
  const withTelegram   = stats?.audience?.withTelegram     ?? 0;
  const newLast30d     = stats?.audience?.newLast30d       ?? 0;
  const newLast90d     = stats?.audience?.newLast90d       ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Usuarios totales" value={totalUsers} sub={`${stats?.roles.handicapper ?? 0} hcp · ${stats?.roles.staff ?? 0} staff`} color="white" />
        <KpiCard label="Gold en circulación" value={stats?.gold.total ?? 0} sub={`Promedio ${stats?.gold.avg ?? 0} / usuario`} color={GOLD} />
        <KpiCard label="Con Gold" value={stats?.gold.usersWithGold ?? 0} sub={`${stats?.gold.usersNoGold ?? 0} sin Gold`} color="#22c55e" />
        <KpiCard label="Logins hoy" value={stats?.dailyStats[stats?.dailyStats.length - 1]?.logins ?? 0} sub={`+${stats?.dailyStats[stats?.dailyStats.length - 1]?.registrations ?? 0} nuevos`} color="#3b82f6" />
      </div>

      {/* Conversión + Retención + Audiencia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* Conversión */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">💰 Conversión</p>
          {loading ? <div className="h-16 rounded-xl bg-gray-800 animate-pulse" /> : (
            <div className="space-y-0.5">
              <StatRow label="Compradores únicos" value={uniqueBuyers} color={GOLD} />
              <StatRow label="Tasa de conversión" value={`${convRate}%`} sub="registrados → compra" color={convRate >= 2 ? '#22c55e' : convRate >= 0.5 ? GOLD : '#ef4444'} />
              <StatRow label="Sin Gold · pagaron antes" value={zeroBuyers} sub="candidatos recompra" color="#f97316" />
              <StatRow label="Ingresos aprobados" value={`$${(stats?.tokenomics?.topups?.approved?.usd ?? 0).toFixed(0)}`} color="#22c55e" />
              <StatRow label="Recargas pendientes" value={pendingTopups} color={pendingTopups > 0 ? '#facc15' : 'white'} />
            </div>
          )}
        </div>

        {/* Retención */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">🔄 Retención</p>
          {loading ? <div className="h-16 rounded-xl bg-gray-800 animate-pulse" /> : (
            <div className="space-y-0.5">
              <StatRow label="Activos últimos 7d" value={retention7} sub={`${ret7pct}% del total`} color="#3b82f6" />
              <StatRow label="Activos últimos 30d" value={retention30} sub={`${ret30pct}% del total`} color="#6366f1" />
              <StatRow label="Activos últimos 90d" value={retention90} sub={`${ret90pct}% del total`} color="#8b5cf6" />
              <StatRow label="Nuevos últimos 30d" value={newLast30d} color="white" />
              <StatRow label="Nuevos últimos 90d" value={newLast90d} color="white" />
            </div>
          )}
        </div>

        {/* Audiencia / Emails */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">📧 Audiencia</p>
          {loading ? <div className="h-16 rounded-xl bg-gray-800 animate-pulse" /> : (
            <div className="space-y-0.5">
              <StatRow label="Con email válido" value={withEmail} sub="Google + Magic Link" color="#22c55e" />
              <StatRow label="Sin email" value={noEmail} sub="solo Telegram" color="#6b7280" />
              <StatRow label="Vía Google" value={withGoogle} color="#4285f4" />
              <StatRow label="Vía Telegram" value={withTelegram} color="#229ed9" />
              <div className="mt-2 pt-2 border-t border-gray-800/60 flex items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] text-gray-600 mb-1">Lista para email marketing</p>
                  <p className="text-lg font-extrabold text-green-400">{withEmail} emails</p>
                </div>
                <a href="/api/admin/users/export" download
                  className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold bg-green-900/40 border border-green-700/50 text-green-400 hover:bg-green-900/60 transition-colors">
                  ⬇ CSV
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tokenomics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Tokenomics (30d)</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-extrabold text-white">{stats?.tokenomics?.txVolume30d?.count ?? 0}</p>
              <p className="text-[10px] text-gray-500">Transacciones</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-red-400">-{stats?.tokenomics?.txVolume30d?.spent ?? 0}</p>
              <p className="text-[10px] text-gray-500">Gastado</p>
            </div>
            <div>
              <p className="text-lg font-extrabold text-green-400">+{stats?.tokenomics?.txVolume30d?.income ?? 0}</p>
              <p className="text-[10px] text-gray-500">Ingresado</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">Contenido</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-extrabold text-white">{stats?.tokenomics?.meetings ?? 0}</p>
              <p className="text-[10px] text-gray-500">Reuniones</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-white">{stats?.tokenomics?.forecasts ?? 0}</p>
              <p className="text-[10px] text-gray-500">Pronósticos</p>
            </div>
          </div>
        </div>
      </div>

      {/* 📰 Gaceta PDF — distribución y tracking */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">📰 Gaceta Hípica — Descargas PDF</p>
        {loading ? <div className="h-16 rounded-xl bg-gray-800 animate-pulse" /> : (
          <div className="space-y-0.5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-yellow-400">{stats?.gaceta?.total ?? 0}</p>
                <p className="text-[10px] text-gray-500">Total descargas</p>
              </div>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-blue-400">{stats?.gaceta?.last7d ?? 0}</p>
                <p className="text-[10px] text-gray-500">Últimos 7 días</p>
              </div>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-green-400">{stats?.gaceta?.last30d ?? 0}</p>
                <p className="text-[10px] text-gray-500">Últimos 30 días</p>
              </div>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-purple-400">{stats?.gaceta?.uniqueUsers ?? 0}</p>
                <p className="text-[10px] text-gray-500">Usuarios únicos</p>
              </div>
            </div>
            {(stats?.gaceta?.topMeetings?.length ?? 0) > 0 && (
              <div>
                <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wide mb-1">Reuniones más descargadas</p>
                <div className="space-y-0.5">
                  {stats!.gaceta.topMeetings.map((m, i) => (
                    <div key={i} className="flex items-center justify-between py-0.5 border-b border-gray-800/50 last:border-0">
                      <span className="text-xs text-gray-400">
                        Reunión {m.meetingNumber ?? '—'}
                        {m.date ? ` · ${new Date(m.date).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', timeZone: 'UTC' })}` : ''}
                        {m.tipsterName ? <span className="text-gray-600 ml-1">· {m.tipsterName}</span> : ''}
                      </span>
                      <span className="text-sm font-bold text-yellow-400">{m.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logins y Registros chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Logins y Registros</p>
          <div className="flex gap-1 flex-wrap justify-end">
            {(['hoy', 'ayer', 7, 14, 30, 90, 365] as const).map(d => (
              <button key={String(d)} onClick={() => setRange(d)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${range === d ? 'bg-yellow-700/40 text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}>
                {d === 365 ? '1Y' : typeof d === 'number' ? `${d}d` : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="h-20 rounded-xl bg-gray-800 animate-pulse" />
        ) : dayDetail ? (
          <div className="space-y-3">
            <p className="text-[10px] text-gray-600">{dayDetail.date}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-blue-400">{dayDetail.logins}</p>
                <p className="text-[10px] text-gray-500">Logins</p>
              </div>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-yellow-400">{dayDetail.registrations}</p>
                <p className="text-[10px] text-gray-500">Registros</p>
              </div>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-red-400">-{dayDetail.gold.raceUnlock + dayDetail.gold.meetingPass}</p>
                <p className="text-[10px] text-gray-500">Gold gastado</p>
              </div>
              <div className="bg-gray-800 rounded-xl px-3 py-2 text-center">
                <p className="text-xl font-extrabold text-green-400">+{dayDetail.gold.purchase + dayDetail.gold.bonus}</p>
                <p className="text-[10px] text-gray-500">Gold ingresado</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-800/60 rounded-lg px-2 py-1.5">
                <p className="text-sm font-bold text-white">{dayDetail.gold.raceUnlock}</p>
                <p className="text-[9px] text-gray-600">Desbloqueos</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg px-2 py-1.5">
                <p className="text-sm font-bold text-white">{dayDetail.gold.meetingPass}</p>
                <p className="text-[9px] text-gray-600">Pases jornada</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg px-2 py-1.5">
                <p className="text-sm font-bold text-white">{dayDetail.gold.purchase}</p>
                <p className="text-[9px] text-gray-600">Recargas</p>
              </div>
            </div>
          </div>
        ) : sliced.length ? (
          <>
            <div className="flex items-end gap-1.5 h-24">
              {sliced.map(d => {
                const pct = Math.round((d.logins / maxLogins) * 100);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                    <p className="text-[9px] text-gray-600">{d.logins}</p>
                    <div className="w-full rounded-t-sm bg-blue-700/60" style={{ height: `${Math.max(pct, 3)}%` }} />
                    {d.registrations > 0 && (
                      <div className="w-full rounded-t-sm bg-yellow-600/80" style={{ height: `${Math.round((d.registrations / maxLogins) * 100)}%`, marginTop: '-100%' }} />
                    )}
                    <p className="text-[9px] text-gray-600 leading-none">{fmtDay(d.date)}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-blue-700/60 inline-block" /> Logins</span>
              <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-600/80 inline-block" /> Registros</span>
            </div>
          </>
        ) : null}
      </div>

      {/* Últimos registros */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Últimos registros</p>
          <Link href="/admin/users" className="text-xs text-yellow-600 hover:text-yellow-400 transition-colors">Ver todos →</Link>
        </div>
        {loading ? (
          <div className="h-20 rounded-xl bg-gray-800 animate-pulse" />
        ) : stats ? (
          <div className="space-y-2">
            {stats.recentUsers.map(u => (
              <div key={u._id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold text-black shrink-0" style={{ backgroundColor: GOLD }}>
                  {(u.alias ?? u.email ?? 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{u.alias ?? u.email}</p>
                  <p className="text-[10px] text-gray-600">{new Date(u.createdAt).toLocaleDateString('es-VE')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold" style={{ color: GOLD }}>🪙 {u.balance?.golds ?? 0}</p>
                  {u.lastLoginDate && <p className="text-[10px] text-gray-600">login {u.lastLoginDate.slice(5)}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Accesos rápidos */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickCard href="/admin/ingest" icon="🏁" label="Cargar Resultados" />
          <QuickCard href="/admin/meetings" icon="📋" label="Reuniones" />
          <QuickCard href="/admin/intelligence" icon="��" label="Subir Pronóstico" />
          <QuickCard href="/admin/topup" icon="💳" label={`Recargas ${pendingTopups > 0 ? `(${pendingTopups})` : ''}`} />
          <QuickCard href="/admin/users" icon="👥" label="Usuarios" />
          <QuickCard href="/admin/workouts" icon="⏱️" label="Traqueos" />
          <QuickCard href="/admin/exchange-rate" icon="💱" label="Tasa BCV" />
          <QuickCard href="/staff/fuentes" icon="📡" label="Fuentes" />
        </div>
      </div>
    </div>
  );
}

function QuickCard({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 hover:border-gray-600 transition-colors">
      <p className="text-sm font-bold text-white">{icon} {label}</p>
    </Link>
  );
}
