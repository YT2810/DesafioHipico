'use client';

import { useRouter } from 'next/navigation';
import TopUpModal from '@/components/TopUpModal';
import BackToHome from '@/components/BackToHome';

const GOLD = '#D4AF37';

export default function PaseClient() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
          <BackToHome />
          <span className="text-sm font-bold text-white">🎟️ Pase Nacional</span>
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Hook — el dolor que resuelve */}
        <div className="text-center space-y-2">
          <p className="text-2xl font-black text-white leading-tight">
            Deja de jugar a ciegas.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            El Factor de Victoria ordena cada carrera por probabilidad real —
            te dice cuándo cerrar en 2 y cuándo abrir a 5.
            <span className="text-yellow-400 font-bold"> 79.9% de los ganadores salen del Top 3.</span>
          </p>
        </div>

        {/* Checkout inline — mismo flujo del modal */}
        <TopUpModal inline onClose={() => router.push('/pronosticos')} />

        {/* Trust signals */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { k: '+30', v: 'Handicappers activos' },
            { k: '79.9%', v: 'Acierto Top 3 FV' },
            { k: '<24h', v: 'Activación del pase' },
          ].map(s => (
            <div key={s.k} className="rounded-xl bg-gray-900 border border-gray-800 px-2 py-3">
              <p className="text-base font-black" style={{ color: GOLD }}>{s.k}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{s.v}</p>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-600 text-center leading-relaxed">
          Pago por Pago Móvil · Verificación manual en menos de 24 h hábiles ·{' '}
          <a href="/faq" className="text-yellow-700 hover:text-yellow-500 underline">Preguntas frecuentes</a>
        </p>
      </main>
    </div>
  );
}
