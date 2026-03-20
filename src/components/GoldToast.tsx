'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

const GOLD = '#D4AF37';

type ToastState = 'hidden' | 'enter' | 'visible' | 'exit';

export default function GoldToast() {
  const { data: session, status } = useSession();
  const [toastState, setToastState] = useState<ToastState>('hidden');
  const [message, setMessage] = useState('');
  const [subMessage, setSubMessage] = useState('');
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || shown) return;

    const user = session?.user as any;
    const goldEarned: number = user?.goldEarned ?? 0;
    const balance: number = user?.balance?.golds ?? 0;
    const streak: number = user?.loginStreak ?? 0;
    const isStreakBonus = goldEarned === 8;

    if (goldEarned > 0) {
      const isNew = balance <= 23 && streak <= 1; // brand new user
      if (isNew && balance >= 15) {
        setMessage(`🎉 ¡Bienvenido a Desafío Hípico!`);
        setSubMessage(`Recibiste 🪙 ${balance} Gold de bienvenida`);
      } else if (isStreakBonus) {
        setMessage(`🔥 ¡${streak} días seguidos! Bonus desbloqueado`);
        setSubMessage(`+${goldEarned} Gold especial · Saldo: ${balance} Gold`);
      } else if (streak >= 3) {
        setMessage(`🔥 ${streak} días seguidos · +${goldEarned} Gold`);
        setSubMessage(`¡Sigue así! El día 7 ganas un bonus extra`);
      } else {
        setMessage(`🪙 +${goldEarned} Gold por tu visita de hoy`);
        setSubMessage(`Saldo actual: ${balance} Gold`);
      }
      setShown(true);
      setTimeout(() => setToastState('enter'), 300);
      setTimeout(() => setToastState('visible'), 600);
      setTimeout(() => setToastState('exit'), 4500);
      setTimeout(() => setToastState('hidden'), 5100);
    }
  }, [status, session, shown]);

  if (toastState === 'hidden') return null;

  const opacity =
    toastState === 'enter' ? 'opacity-0 translate-y-4' :
    toastState === 'exit'  ? 'opacity-0 translate-y-4' :
    'opacity-100 translate-y-0';

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${opacity}`}
      style={{ maxWidth: '320px', width: 'calc(100vw - 2rem)' }}
    >
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl border"
        style={{
          background: 'linear-gradient(135deg, #1a1400 0%, #2a1f00 100%)',
          borderColor: GOLD + '60',
          boxShadow: `0 0 24px ${GOLD}30`,
        }}
      >
        {/* Coin icon with glow */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 font-extrabold"
          style={{
            backgroundColor: GOLD,
            boxShadow: `0 0 12px ${GOLD}80`,
            color: '#000',
          }}
        >
          🪙
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">{message}</p>
          <p className="text-xs mt-0.5" style={{ color: GOLD }}>{subMessage}</p>
        </div>
        <button
          onClick={() => setToastState('hidden')}
          className="text-gray-600 hover:text-gray-400 text-sm shrink-0 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
