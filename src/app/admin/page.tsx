'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';

const SECTIONS = [
  {
    group: 'Datos de Carreras',
    items: [
      { href: '/admin/ingest',       icon: '🏁', label: 'Cargar Resultados',   desc: 'Sube fotos del tablero y guarda posiciones, pagos y dividendos.' },
      { href: '/admin/meetings',     icon: '📋', label: 'Subir Programa',       desc: 'Ingesta de PDFs con el programa de la reunión (INH / HINAVA).' },
      { href: '/admin/workouts',     icon: '⏱️', label: 'Subir Traqueos',       desc: 'Sube archivos Excel o PDF de la División de Toma Tiempos.' },
      { href: '/admin/meetings',     icon: '▶️',  label: 'Video Resumen Jornadas', desc: 'Sube o enlaza el video resumen de la jornada para cada reunión.' },
    ],
  },
  {
    group: 'Pronósticos',
    items: [
      { href: '/admin/intelligence', icon: '🧠', label: 'Subir Pronóstico',     desc: 'Pega texto, imagen o URL de un handicapper. La IA extrae las marcas.' },
      { href: '/staff/fuentes',      icon: '📡', label: 'Fuentes y Handicappers', desc: 'Catálogo de handicappers conocidos y sus fuentes.' },
    ],
  },
  {
    group: 'Usuarios y Economía',
    items: [
      { href: '/admin/users',        icon: '👥', label: 'Usuarios',             desc: 'Busca usuarios, asigna roles y gestiona cuentas.' },
      { href: '/admin/topup',        icon: '💳', label: 'Recargas Pendientes',  desc: 'Aprueba o rechaza solicitudes de recarga de Gold.' },
      { href: '/admin/exchange-rate',icon: '💱', label: 'Tasa BCV',             desc: 'Actualiza la tasa de cambio BCV para calcular precios en Bs.' },
    ],
  },
  {
    group: 'Sistema',
    items: [
      { href: '/admin/handicapper-request', icon: '🎓', label: 'Solicitudes Handicapper', desc: 'Revisa solicitudes de usuarios que quieren ser handicappers.' },
      { href: '/admin/audios',       icon: '🎙️', label: 'Audios',              desc: 'Gestión de audios de handicappers.' },
    ],
  },
];

interface BcvStatus {
  rateVes?: number;
  updatedAt?: string;
  ageHours?: number;
  stale: boolean;
  message?: string;
}

interface DayStats { date: string; registrations: number; logins: number; }
interface AdminStats {
  totalUsers: number;
  roles: { customer: number; handicapper: number; staff: number; admin: number };
  gold: { total: number; usersWithGold: number; usersNoGold: number; avg: number };
  dailyStats: DayStats[];
  recentUsers: { _id: string; email?: string; alias?: string; roles: string[]; balance: { golds: number }; createdAt: string; lastLoginDate?: string }[];
}

function fmtDay(iso: string) {
  const [, , dd] = iso.split('-');
  const names = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return `${names[new Date(iso + 'T12:00:00').getDay()]} ${dd}`;
}

function bcvAlertNeeded(status: BcvStatus | null): boolean {
  if (!status) return false;
  if (!status.stale) return false;
  // No alert on Saturday (6), Sunday (0), Monday (1)
  const day = new Date().getDay();
  if ([0, 1, 6].includes(day)) return false;
  return true;
}

export default function AdminPage() {
  const [bcv, setBcv] = useState<BcvStatus | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [goldIdentifier, setGoldIdentifier] = useState('');
  const [goldAmount, setGoldAmount] = useState('');
  const [goldNote, setGoldNote] = useState('');
  const [goldMsg, setGoldMsg] = useState('');
  const [goldErr, setGoldErr] = useState('');
  const [goldLoading, setGoldLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetch('/api/exchange-rate')
      .then(r => r.json())
      .then(d => setBcv(d))
      .catch(() => setBcv({ stale: true, message: 'No se pudo verificar la tasa BCV' }));

    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  async function handleAssignGold() {
    if (!goldIdentifier.trim() || !goldAmount) return;
    setGoldLoading(true);
    setGoldMsg('');
    setGoldErr('');
    try {
      const res = await fetch('/api/admin/users/gold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: goldIdentifier.trim(), amount: parseInt(goldAmount), note: goldNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGoldMsg(`✅ ${data.alias ?? data.email} → nuevo saldo: ${data.newBalance} Gold`);
      setGoldIdentifier('');
      setGoldAmount('');
      setGoldNote('');
    } catch (e: any) {
      setGoldErr(`⚠️ ${e.message}`);
    } finally {
      setGoldLoading(false);
    }
  }

  async function handleBulkWelcome() {
    if (!confirm('¿Asignar 15 Gold a todos los usuarios con saldo 0?')) return;
    setBulkLoading(true);
    setBulkMsg('');
    try {
      const res = await fetch('/api/admin/users/gold/bulk-welcome', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBulkMsg(`✅ ${data.message}`);
    } catch (e: any) {
      setBulkMsg(`⚠️ ${e.message}`);
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/perfil" className="text-gray-400 hover:text-white text-sm transition-colors">← Mi Perfil</Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">Panel de Administración</h1>
            <p className="text-xs text-gray-500">Desafío Hípico · Admin</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* BCV staleness alert */}
        {bcvAlertNeeded(bcv) && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-700/60 rounded-2xl px-4 py-3">
            <span className="text-xl shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-400">Tasa BCV desactualizada</p>
              <p className="text-xs text-red-300/70 mt-0.5">
                Lleva {bcv?.ageHours?.toFixed(0)}h sin actualizarse. Actualízala antes de aprobar recargas.
              </p>
            </div>
            <Link href="/admin/exchange-rate"
              className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-700 hover:bg-red-600 text-white transition-colors">
              Actualizar
            </Link>
          </div>
        )}

        {/* ── Métricas ── */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Resumen del día</p>
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-900 animate-pulse" />)}
            </div>
          ) : stats ? (
            <div className="space-y-4">
              {/* KPI cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">Usuarios totales</p>
                  <p className="text-2xl font-extrabold text-white">{stats.totalUsers}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {stats.roles.handicapper} hcp · {stats.roles.staff} staff
                  </p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">Gold en circulación</p>
                  <p className="text-2xl font-extrabold" style={{ color: '#D4AF37' }}>{stats.gold.total.toLocaleString()}</p>
                  <p className="text-xs text-gray-600 mt-1">Promedio {stats.gold.avg} / usuario</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">Con Gold</p>
                  <p className="text-2xl font-extrabold text-green-400">{stats.gold.usersWithGold}</p>
                  <p className="text-xs text-gray-600 mt-1">{stats.gold.usersNoGold} sin Gold</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">Logins hoy</p>
                  <p className="text-2xl font-extrabold text-blue-400">
                    {stats.dailyStats[stats.dailyStats.length - 1]?.logins ?? 0}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    +{stats.dailyStats[stats.dailyStats.length - 1]?.registrations ?? 0} nuevos
                  </p>
                </div>
              </div>

              {/* 7-day bar chart (CSS bars) */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Últimos 7 días</p>
                <div className="flex items-end gap-2 h-20">
                  {stats.dailyStats.map(d => {
                    const maxLogins = Math.max(...stats.dailyStats.map(x => x.logins), 1);
                    const pct = Math.round((d.logins / maxLogins) * 100);
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <p className="text-[10px] text-gray-600">{d.logins}</p>
                        <div className="w-full rounded-t-md bg-blue-700/60" style={{ height: `${Math.max(pct, 4)}%` }} title={`${d.logins} logins`} />
                        {d.registrations > 0 && (
                          <div className="w-full rounded-t-sm bg-yellow-600/80" style={{ height: `${Math.round((d.registrations / maxLogins) * 100)}%`, marginTop: '-100%' }} title={`${d.registrations} nuevos`} />
                        )}
                        <p className="text-[10px] text-gray-600 leading-none">{fmtDay(d.date)}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-blue-700/60 inline-block" /> Logins</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-600/80 inline-block" /> Registros</span>
                </div>
              </div>

              {/* Recent users */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-3">Últimos registros</p>
                <div className="space-y-2">
                  {stats.recentUsers.map(u => (
                    <div key={u._id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold text-black shrink-0"
                        style={{ backgroundColor: GOLD }}>
                        {(u.alias ?? u.email ?? 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{u.alias ?? u.email}</p>
                        <p className="text-[10px] text-gray-600">{new Date(u.createdAt).toLocaleDateString('es-VE')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold" style={{ color: GOLD }}>🪙 {u.balance?.golds ?? 0}</p>
                        {u.lastLoginDate && (
                          <p className="text-[10px] text-gray-600">login {u.lastLoginDate.slice(5)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Sections */}
        {SECTIONS.map(section => (
          <div key={section.group}>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{section.group}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {section.items.map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-2xl px-4 py-4 hover:border-gray-600 transition-colors group">
                  <span className="text-2xl shrink-0 mt-0.5">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Gold Management */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Gestión de Gold</p>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">

            {/* Manual assign */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Asignar Gold a un usuario</p>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Email o alias"
                  value={goldIdentifier}
                  onChange={e => setGoldIdentifier(e.target.value)}
                  className="flex-1 min-w-[160px] bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
                />
                <input
                  type="number"
                  placeholder="Cantidad"
                  value={goldAmount}
                  onChange={e => setGoldAmount(e.target.value)}
                  className="w-28 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
                />
              </div>
              <input
                type="text"
                placeholder="Nota (opcional)"
                value={goldNote}
                onChange={e => setGoldNote(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600"
              />
              {goldMsg && <p className="text-xs text-green-400">{goldMsg}</p>}
              {goldErr && <p className="text-xs text-red-400">{goldErr}</p>}
              <button
                onClick={handleAssignGold}
                disabled={goldLoading || !goldIdentifier || !goldAmount}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: GOLD }}>
                {goldLoading ? 'Asignando...' : 'Asignar Gold'}
              </button>
            </div>

            <div className="border-t border-gray-800 pt-4">
              <p className="text-sm font-semibold text-white mb-1">Bienvenida masiva</p>
              <p className="text-xs text-gray-500 mb-3">Asigna 15 Gold a todos los usuarios con saldo 0. Operación única de bienvenida.</p>
              {bulkMsg && <p className="text-xs text-green-400 mb-2">{bulkMsg}</p>}
              <button
                onClick={handleBulkWelcome}
                disabled={bulkLoading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border border-yellow-700/60 text-yellow-400 hover:bg-yellow-950/40 disabled:opacity-40 transition-colors">
                {bulkLoading ? 'Procesando...' : '🎁 Dar 15 Gold a todos (saldo 0)'}
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
