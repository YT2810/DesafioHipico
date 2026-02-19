'use client';

import { useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function MagicCompletePage() {
  const params = useSearchParams();
  const router = useRouter();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const email = params.get('email') ?? '';
    const callbackUrl = params.get('callbackUrl') ?? '/';

    if (!email) {
      router.replace('/auth/error?error=Verification');
      return;
    }

    signIn('magic-verified', { email, callbackUrl, redirect: true });
  }, [params, router]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-yellow-600 border-t-transparent animate-spin" />
      <p className="text-sm text-gray-500">Iniciando sesión...</p>
    </div>
  );
}
