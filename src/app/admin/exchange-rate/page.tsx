'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const GOLD = '#D4AF37';

export default function ExchangeRatePage() {
  const [rateVes, setRateVes] = useState('');
  const [current, setCurrent] = useState<{ rateVes: number; updatedAt: string; ageHours: number; stale: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/exchange-rate');
      const data = await res.json();
      if (data.rateVes) {
        setCurrent(data);
        setRateVes(String(data.rateVes));
      }
    } catch {
      // no rate yet
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setErr('');
    const val = parseFloat(rateVes.replace(',', '.'));
    if (!val || val <= 0) { setErr('Ingresa una tasa válida mayor a 0.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/exchange-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rateVes: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setMsg(`✅ Tasa actualizada: Bs ${val.toLocaleString('es-VE', { minimumFractionDigits: 2 })} / USD`);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  const staleWarning = current?.stale;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <Link href="/perfil" className="flex items-center gap-1 text-gray-400 hover:text-white text-sm font-medium transition-colors shrink-0">
            <span className="text-base leading-none">←</span>
            <span className="hidden sm:inline">Panel</span>
          </Link>
          <div>
            <h1 className="text-base font-bold text-white">💱 Tasa de Cambio BCV</h1>
            <p className="text-xs text-gray-500">Actualización manual — Bs / USD</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-4">

        {/* Stale warning */}
        {staleWarning && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-700/50 rounded-2xl px-4 py-3">
            <span className="text-xl shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-bold text-red-400">Tasa desactualizada</p>
              <p className="text-xs text-red-300/70">
                Lleva {current?.ageHours}h sin actualizarse. Los montos en Bs mostrados a los usuarios pueden estar incorrectos.
              </p>
            </div>
          </div>
        )}

        {/* Current rate card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Tasa actual</p>

          {loading ? (
            <div className="h-12 rounded-xl bg-gray-800 animate-pulse" />
          ) : current ? (
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-extrabold" style={{ color: GOLD }}>
                  Bs {current.rateVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">por 1 USD</p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-semibold ${current.stale ? 'text-red-400' : 'text-green-400'}`}>
                  {current.stale ? '⚠️ Desactualizada' : '✅ Al día'}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Hace {current.ageHours < 1 ? 'menos de 1h' : `${current.ageHours}h`}
                </p>
                <p className="text-xs text-gray-700">
                  {new Date(current.updatedAt).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic">Sin tasa configurada — los usuarios no podrán ver el monto en Bs.</p>
          )}
        </div>

        {/* Update form */}
        <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Actualizar tasa</p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Tasa BCV (Bs por 1 USD)
            </label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-500 shrink-0">Bs</span>
              <input
                type="text"
                inputMode="decimal"
                value={rateVes}
                onChange={e => setRateVes(e.target.value)}
                placeholder="Ej: 91.50"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-lg font-bold text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors"
                required
              />
              <span className="text-sm text-gray-500 shrink-0">/ USD</span>
            </div>
          </div>

          {/* Preview */}
          {rateVes && !isNaN(parseFloat(rateVes.replace(',', '.'))) && (
            <div className="bg-gray-800/50 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs text-gray-500 font-semibold">Vista previa de paquetes</p>
              {[10, 25, 50, 100].map(usd => {
                const bs = (usd * parseFloat(rateVes.replace(',', '.'))).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const golds = Math.floor((usd / 10) * 40);
                return (
                  <div key={usd} className="flex justify-between text-xs">
                    <span className="text-gray-400">${usd} USD · {golds} Golds</span>
                    <span className="font-semibold text-white">Bs {bs}</span>
                  </div>
                );
              })}
            </div>
          )}

          {err && <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-xl px-3 py-2">⚠️ {err}</p>}
          {msg && <p className="text-xs text-green-400 bg-green-950/40 border border-green-800/40 rounded-xl px-3 py-2">{msg}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: GOLD }}>
            {saving ? 'Guardando...' : '💾 Guardar tasa'}
          </button>
        </form>

        {/* Instructions */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2 text-xs text-gray-500">
          <p className="font-semibold text-gray-400">¿Dónde consultar la tasa oficial?</p>
          <p>→ <a href="https://www.bcv.org.ve" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:text-yellow-400 underline">bcv.org.ve</a> — sección "Tipos de Cambio"</p>
          <p>→ Se recomienda actualizar cada día hábil antes de las 9am.</p>
          <p>→ El sistema alerta si la tasa lleva más de 24h sin actualizarse.</p>
        </div>

      </main>
    </div>
  );
}
