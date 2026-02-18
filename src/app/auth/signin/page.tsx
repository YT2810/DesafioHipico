'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

const GOLD = '#D4AF37';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleGoogle() {
    setLoading('google');
    await signIn('google', { callbackUrl });
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading('email');
    setError('');
    const res = await signIn('nodemailer', { email, callbackUrl, redirect: false });
    setLoading(null);
    if (res?.error) {
      setError('Error al enviar el enlace. Verifica tu correo.');
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">
      {/* Logo / Brand */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🏇</div>
        <h1 className="text-2xl font-bold text-white">Desafío Hípico</h1>
        <p className="text-sm text-gray-500 mt-1">El marketplace de pronósticos hípicos</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading === 'google' ? 'Conectando...' : 'Continuar con Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-xs text-gray-600">o con tu correo</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Magic Link */}
        {sent ? (
          <div className="bg-green-950/40 border border-green-800/50 rounded-xl px-4 py-5 text-center">
            <div className="text-3xl mb-2">📧</div>
            <p className="text-sm font-semibold text-green-400">¡Enlace enviado!</p>
            <p className="text-xs text-gray-500 mt-1">Revisa tu correo y haz clic en el enlace para entrar.</p>
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading !== null || !email.trim()}
              className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: GOLD }}
            >
              {loading === 'email' ? 'Enviando...' : 'Enviar enlace mágico'}
            </button>
          </form>
        )}

        {/* Telegram note */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-xl">✈️</span>
          <div>
            <p className="text-xs font-semibold text-gray-300">Acceso vía Telegram</p>
            <p className="text-xs text-gray-600">Disponible en nuestra Mini App de Telegram</p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 px-4">
          Al continuar aceptas los términos de uso de Desafío Hípico.
        </p>
      </div>
    </div>
  );
}
