'use client';

import { useState } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';

export default function ContactoPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el mensaje');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white text-lg leading-none transition-colors">←</Link>
          <span className="text-sm font-bold text-white">Contacto</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        {success ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-extrabold text-white mb-2">¡Mensaje enviado!</h2>
            <p className="text-sm text-gray-400 mb-6">Te responderemos a la brevedad posible.</p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold text-black"
              style={{ backgroundColor: GOLD }}
            >
              Volver al inicio
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-white mb-1">¿Tienes alguna pregunta?</h1>
              <p className="text-sm text-gray-400">
                Escríbenos y te respondemos en menos de 24 horas.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Nombre *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Tu nombre"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="tu@email.com"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Asunto</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="¿Sobre qué nos escribes?"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Mensaje *</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, 2000))}
                  required
                  maxLength={2000}
                  rows={5}
                  placeholder="Escribe tu mensaje aquí..."
                  className={`w-full bg-gray-900 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors resize-none ${
                    message.length >= 2000 ? 'border-red-600 focus:border-red-500' :
                    message.length >= 1800 ? 'border-yellow-700 focus:border-yellow-600' :
                    'border-gray-700 focus:border-yellow-600'
                  }`}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className={`text-xs ${
                    message.length >= 2000 ? 'text-red-400 font-semibold' :
                    message.length >= 1800 ? 'text-yellow-500' :
                    'invisible'
                  }`}>
                    {message.length >= 2000 ? 'Límite alcanzado — no puedes escribir más' : 'Estás llegando al límite'}
                  </span>
                  <span className={`text-xs font-mono ${
                    message.length >= 2000 ? 'text-red-400' :
                    message.length >= 1800 ? 'text-yellow-400' :
                    'text-gray-600'
                  }`}>
                    {message.length}/2000
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-700/50 bg-red-950/30 px-4 py-3">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name.trim() || !email.trim() || !message.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold text-black disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: GOLD }}
              >
                {loading ? 'Enviando...' : 'Enviar mensaje'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-800 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Otras formas de contacto</p>
              <div className="flex flex-col gap-2">
                <a
                  href="https://t.me/desafiohipico"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <span className="text-base">✈️</span>
                  <span>Telegram: @desafiohipico</span>
                </a>
                <a
                  href="https://x.com/desafiohipico"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <span className="text-base">𝕏</span>
                  <span>Twitter/X: @desafiohipico</span>
                </a>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
