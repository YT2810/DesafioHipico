'use client';

import { useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos
const EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export default function InactivitySignout() {
  const { status } = useSession();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    function reset() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        signOut({ callbackUrl: '/' });
      }, INACTIVITY_MS);
    }

    // Start timer on mount
    reset();

    // Reset on any user interaction
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [status]);

  return null;
}
