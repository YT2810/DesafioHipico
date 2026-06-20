'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminTabs, { type TabId } from './_components/AdminTabs';
import DashboardTab from './_components/DashboardTab';
import CarrerasTab from './_components/CarrerasTab';
import PronosticosTab from './_components/PronosticosTab';
import UsuariosTab from './_components/UsuariosTab';
import FinanzasTab from './_components/FinanzasTab';
import ConfigTab from './_components/ConfigTab';
import { useAdminStats, useBcvStatus, bcvAlertNeeded } from './_hooks/useAdminStats';

export default function AdminPage() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const { stats, loading: statsLoading } = useAdminStats();
  const bcv = useBcvStatus();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Link href="/perfil" className="text-gray-400 hover:text-white text-sm transition-colors shrink-0">← Mi Perfil</Link>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white">Panel de Administración</h1>
            <p className="text-xs text-gray-500">Desafío Hípico · Admin</p>
          </div>
        </div>
      </header>

      <AdminTabs active={tab} onChange={setTab} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {bcvAlertNeeded(bcv) && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-700/60 rounded-2xl px-4 py-3 mb-6">
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

        {tab === 'dashboard' && <DashboardTab stats={stats} loading={statsLoading} />}
        {tab === 'carreras' && <CarrerasTab stats={stats} />}
        {tab === 'pronosticos' && <PronosticosTab stats={stats} />}
        {tab === 'usuarios' && <UsuariosTab stats={stats} />}
        {tab === 'finanzas' && <FinanzasTab stats={stats} loading={statsLoading} />}
        {tab === 'config' && <ConfigTab bcv={bcv} />}
      </main>
    </div>
  );
}
