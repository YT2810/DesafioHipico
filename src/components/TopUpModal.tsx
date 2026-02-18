'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { VENEZUELAN_BANKS, GOLD_RATE } from '@/lib/constants';

const GOLD = '#D4AF37';

const USD_PACKAGES = [
  { usd: 10, golds: 40, label: 'Starter' },
  { usd: 25, golds: 100, label: 'Popular', highlight: true },
  { usd: 50, golds: 200, label: 'Pro' },
  { usd: 100, golds: 400, label: 'Elite' },
];

interface TopUpModalProps {
  onClose: () => void;
}

export default function TopUpModal({ onClose }: TopUpModalProps) {
  const { data: session, update } = useSession();
  const user = session?.user;

  const [step, setStep] = useState<'package' | 'form' | 'success'>('package');
  const [selectedUsd, setSelectedUsd] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{ goldAmount: number; requestId: string } | null>(null);

  const [form, setForm] = useState({
    referenceNumber: '',
    phone: user?.phone ?? '',
    legalId: user?.legalId ?? '',
    bank: '',
    amountBs: '',
  });

  const goldAmount = Math.floor((selectedUsd / GOLD_RATE.usd) * GOLD_RATE.golds);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUsd: selectedUsd,
          goldAmount,
          referenceNumber: form.referenceNumber,
          phone: form.phone,
          legalId: form.legalId,
          bank: form.bank,
          amountBs: parseFloat(form.amountBs) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar la solicitud.');

      setSuccessData({ goldAmount: data.goldAmount, requestId: data.requestId });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-bold text-white">🪙 Recargar Golds</h2>
            <p className="text-xs text-gray-500">{GOLD_RATE.golds} Golds = ${GOLD_RATE.usd} USD · Pago Móvil</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-5">
          {/* ── Step 1: Package selection ── */}
          {step === 'package' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {USD_PACKAGES.map(pkg => (
                  <button
                    key={pkg.usd}
                    onClick={() => setSelectedUsd(pkg.usd)}
                    className={`relative flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all ${
                      selectedUsd === pkg.usd
                        ? 'border-yellow-600 bg-yellow-950/30'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    {pkg.highlight && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded-full text-black"
                        style={{ backgroundColor: GOLD }}>
                        Popular
                      </span>
                    )}
                    <span className="text-xl font-extrabold text-white">{pkg.golds}</span>
                    <span className="text-xs font-medium" style={{ color: GOLD }}>Golds</span>
                    <span className="text-xs text-gray-500">${pkg.usd} USD</span>
                    <span className="text-xs text-gray-600">{pkg.label}</span>
                  </button>
                ))}
              </div>

              <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-400 space-y-1">
                <p>📌 Realiza un <strong className="text-white">Pago Móvil</strong> al número de la plataforma.</p>
                <p>📋 Luego completa el formulario con los datos del pago.</p>
                <p>⏱ Tu saldo se acredita en menos de 24 horas hábiles.</p>
              </div>

              <button
                onClick={() => setStep('form')}
                className="w-full py-3.5 rounded-xl text-sm font-bold text-black"
                style={{ backgroundColor: GOLD }}
              >
                Continuar con {goldAmount} Golds →
              </button>
            </div>
          )}

          {/* ── Step 2: Payment form ── */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Vas a solicitar</p>
                  <p className="text-lg font-extrabold" style={{ color: GOLD }}>{goldAmount} Golds</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Monto</p>
                  <p className="text-sm font-bold text-white">${selectedUsd} USD</p>
                </div>
              </div>

              <div className="space-y-3">
                <Field label="Número de referencia" name="referenceNumber" value={form.referenceNumber}
                  onChange={handleFormChange} placeholder="Ej: 00123456789" required />

                <Field label="Teléfono del pagador" name="phone" value={form.phone}
                  onChange={handleFormChange} placeholder="Ej: 04121234567" required
                  hint="El número desde el que realizaste el pago" />

                <Field label="Cédula de identidad" name="legalId" value={form.legalId}
                  onChange={handleFormChange} placeholder="Ej: V-12345678" required />

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Banco emisor</label>
                  <select
                    name="bank"
                    value={form.bank}
                    onChange={handleFormChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-600 transition-colors"
                  >
                    <option value="">Selecciona tu banco</option>
                    {VENEZUELAN_BANKS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <Field label="Monto en Bs." name="amountBs" value={form.amountBs}
                  onChange={handleFormChange} placeholder="Ej: 36000" required type="number" />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/40 border border-red-800/50 rounded-xl px-3 py-2.5">
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('package')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors">
                  ← Atrás
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: GOLD }}>
                  {loading ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Success ── */}
          {step === 'success' && successData && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center text-3xl">
                ✅
              </div>
              <div>
                <p className="text-base font-bold text-white">¡Solicitud enviada!</p>
                <p className="text-xs text-gray-500 mt-1">
                  Se acreditarán <span className="font-bold" style={{ color: GOLD }}>{successData.goldAmount} Golds</span> una vez verificado el pago.
                </p>
                <p className="text-xs text-gray-700 mt-2 font-mono">Ref: {successData.requestId.slice(-8)}</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-400 w-full text-left space-y-1">
                <p>⏱ Tiempo de acreditación: <strong className="text-white">menos de 24h hábiles</strong></p>
                <p>📞 ¿Dudas? Contáctanos por Telegram</p>
              </div>
              <button onClick={onClose}
                className="w-full py-3 rounded-xl text-sm font-bold text-black"
                style={{ backgroundColor: GOLD }}>
                Entendido
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({ label, name, value, onChange, placeholder, required, hint, type = 'text' }: {
  label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean; hint?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors"
      />
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}
