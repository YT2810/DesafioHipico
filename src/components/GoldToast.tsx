'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

const GOLD = '#D4AF37';
const SESSION_KEY = 'gold_toast_shown';

type ToastState = 'hidden' | 'enter' | 'visible' | 'exit';

export default function GoldToast() {
  const { data: session, status } = useSession();
  const [toastState, setToastState] = useState<ToastState>('hidden');
  const [message, setMessage] = useState('');
  const [subMessage, setSubMessage] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function dismiss() {
    timers.current.forEach(clearTimeout);
    setToastState('exit');
    setTimeout(() => setToastState('hidden'), 500);
    // Mark as seen for the rest of this browser session
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
  }

  useEffect(() => {
    if (status !== 'authenticated') return;

    // Already seen this session — never show again until new tab/login
    try { if (sessionStorage.getItem(SESSION_KEY)) return; } catch {}

    const user = session?.user as any;
    const goldEarned: number = user?.goldEarned ?? 0;
    const balance: number = user?.balance?.golds ?? 0;
    const streak: number = user?.loginStreak ?? 0;

    if (goldEarned <= 0) return;

    const isNew = balance <= 23 && streak <= 1;
    const isStreakBonus = goldEarned === 8;

    if (isNew && balance >= 15) {
      setMessage('🎉 ¡Bienvenido a Desafío Hípico!');
      setSubMessage(`Recibiste 🪙 ${balance} Gold de bienvenida`);
    } else if (isStreakBonus) {
      setMessage(`🔥 ¡${streak} días de racha! Bonus desbloqueado`);
      setSubMessage(`+${goldEarned} Gold especial · Saldo: ${balance} Gold`);
    } else if (streak >= 3) {
      setMessage(`🔥 ${streak} días de racha · +${goldEarned} Gold`);
      setSubMessage('¡Sigue así! El día 7 ganas un bonus extra');
    } else {
      setMessage(`🪙 +${goldEarned} Gold por tu visita de hoy`);
      setSubMessage(`Saldo actual: ${balance} Gold`);
    }

    // Mark as shown immediately so navigating back won't re-trigger
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}

    const t1 = setTimeout(() => setToastState('enter'), 400);
    const t2 = setTimeout(() => setToastState('visible'), 700);
    const t3 = setTimeout(() => setToastState('exit'), 6700);
    const t4 = setTimeout(() => setToastState('hidden'), 7200);
    timers.current = [t1, t2, t3, t4];
    return () => timers.current.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (toastState === 'hidden') return null;

  const anim =
    toastState === 'enter' ? 'opacity-0 -translate-y-4' :
    toastState === 'exit'  ? 'opacity-0 -translate-y-4' :
    'opacity-100 translate-y-0';

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${anim}`}
      style={{ maxWidth: '340px', width: 'calc(100vw - 2rem)' }}
    >
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl border cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #1a1400 0%, #2a1f00 100%)',
          borderColor: GOLD + '60',
          boxShadow: `0 0 24px ${GOLD}30`,
        }}
        onClick={dismiss}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: GOLD, boxShadow: `0 0 12px ${GOLD}80`, color: '#000' }}
        >
          🪙
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">{message}</p>
          <p className="text-xs mt-0.5" style={{ color: GOLD }}>{subMessage}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); dismiss(); }}
          className="text-gray-500 hover:text-gray-300 text-sm shrink-0 transition-colors px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
