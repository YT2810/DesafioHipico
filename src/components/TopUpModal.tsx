'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { VENEZUELAN_BANKS, GOLD_RATE, PAYMENT_DESTINATION } from '@/lib/constants';

const GOLD = '#D4AF37';

const USD_PACKAGES = [
  { usd: 10,  golds: 40,  label: 'Starter' },
  { usd: 25,  golds: 100, label: 'Popular', highlight: true },
  { usd: 50,  golds: 200, label: 'Pro' },
  { usd: 100, golds: 400, label: 'Elite' },
];

interface TopUpModalProps { onClose: () => void; }

export default function TopUpModal({ onClose }: TopUpModalProps) {
  const { data: session } = useSession();
  const user = session?.user as any;

  const today = new Date().toISOString().slice(0, 10);
  const [step, setStep] = useState<'package' | 'destination' | 'form' | 'success'>('package');
  const [selectedUsd, setSelectedUsd] = useState(10);
  const [loading, setLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{ goldAmount: number; requestId: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    referenceNumber: '',
    phone: user?.phone ?? '',
    legalId: user?.legalId ?? '',
    bank: '',
    amountBs: '',
    paymentDate: today,
    receiptUrl: '',
    receiptName: '',
  });

  const goldAmount = Math.floor((selectedUsd / GOLD_RATE.usd) * GOLD_RATE.golds);
  function set(field: string, value: string) { setForm(p => ({ ...p, [field]: value })); }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/topup/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al subir imagen.');
      setForm(p => ({ ...p, receiptUrl: data.url, receiptName: file.name }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally { setUploadingImg(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUsd: selectedUsd, goldAmount,
          referenceNumber: form.referenceNumber,
          phone: form.phone, legalId: form.legalId,
          bank: form.bank, amountBs: parseFloat(form.amountBs) || 0,
          paymentDate: form.paymentDate,
          receiptUrl: form.receiptUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar la solicitud.');
      setSuccessData({ goldAmount: data.goldAmount, requestId: data.requestId });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[94vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-gray-700 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white">🪙 Recargar Golds</h2>
            <p className="text-xs text-gray-500">{GOLD_RATE.golds} Golds = ${GOLD_RATE.usd} USD · Pago Móvil</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>

        {step !== 'success' && (
          <div className="flex items-center gap-1.5 px-5 pt-3 pb-1 shrink-0">
            {(['package','destination','form'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full transition-colors ${step === s ? 'bg-yellow-500' : (['package','destination','form'].indexOf(step) > i) ? 'bg-yellow-800' : 'bg-gray-700'}`} />
                {i < 2 && <div className="w-5 h-px bg-gray-700" />}
              </div>
            ))}
            <span className="ml-2 text-xs text-gray-600">
              {step === 'package' ? 'Elige paquete' : step === 'destination' ? 'Realiza el pago' : 'Confirma el pago'}
            </span>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── Step 1: Package ── */}
          {step === 'package' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {USD_PACKAGES.map(pkg => (
                  <button key={pkg.usd} onClick={() => setSelectedUsd(pkg.usd)}
                    className={`relative flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all ${selectedUsd === pkg.usd ? 'border-yellow-600 bg-yellow-950/30' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}`}>
                    {pkg.highlight && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{ backgroundColor: GOLD }}>Popular</span>}
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
              <button onClick={() => setStep('destination')} className="w-full py-3.5 rounded-xl text-sm font-bold text-black" style={{ backgroundColor: GOLD }}>
                Continuar con {goldAmount} Golds →
              </button>
            </div>
          )}

          {/* ── Step 2: Payment destination ── */}
          {step === 'destination' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Realiza un <strong className="text-white">Pago Móvil</strong> con los siguientes datos:</p>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cuenta destino</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-black" style={{ backgroundColor: GOLD }}>{PAYMENT_DESTINATION.bankCode}</span>
                </div>
                <div className="divide-y divide-gray-700/50">
                  <DestRow label="Banco"    value={PAYMENT_DESTINATION.bank} />
                  <DestRow label="Cédula"   value={PAYMENT_DESTINATION.legalId} copyable />
                  <DestRow label="Teléfono" value={PAYMENT_DESTINATION.phone}   copyable />
                  <DestRow label="Nombre"   value={PAYMENT_DESTINATION.name} />
                  <DestRow label="Monto"    value={`$${selectedUsd} USD`} highlight />
                </div>
              </div>
              <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl px-4 py-3 text-xs text-blue-300 space-y-1">
                <p>📸 Guarda el comprobante — lo necesitarás en el siguiente paso.</p>
                <p>⏱ Tu saldo se acredita en menos de 24 horas hábiles.</p>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('package')} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors">← Atrás</button>
                <button onClick={() => setStep('form')} className="flex-1 py-3.5 rounded-xl text-sm font-bold text-black" style={{ backgroundColor: GOLD }}>Ya pagué →</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm form ── */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-xl px-4 py-3 flex items-center justify-between">
                <div><p className="text-xs text-gray-500">Solicitando</p><p className="text-lg font-extrabold" style={{ color: GOLD }}>{goldAmount} Golds</p></div>
                <div className="text-right"><p className="text-xs text-gray-500">Pagaste</p><p className="text-sm font-bold text-white">${selectedUsd} USD</p></div>
              </div>

              <Field label="Número de referencia *" value={form.referenceNumber} onChange={e => set('referenceNumber', e.target.value)}
                placeholder="Ej: 00123456789" required hint="Mínimo 7 dígitos — rellena con 0 a la izquierda si es necesario" />

              <Field label="Fecha del pago *" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)}
                placeholder="2026-02-18" required type="date" />

              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Banco emisor *</label>
                <select value={form.bank} onChange={e => set('bank', e.target.value)} required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-600 transition-colors">
                  <option value="">— Selecciona tu banco —</option>
                  {VENEZUELAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <Field label="Monto en Bs. *" value={form.amountBs} onChange={e => set('amountBs', e.target.value)}
                placeholder="Ej: 360000" required type="number" />

              <Field label="Teléfono del pagador *" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="Ej: 04121234567" required hint="El número desde el que realizaste el Pago Móvil" />

              <Field label="Cédula de identidad *" value={form.legalId} onChange={e => set('legalId', e.target.value)}
                placeholder="Ej: V-16108291" required />

              {/* Receipt image */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Comprobante de pago <span className="text-gray-600">(opcional)</span></label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                {form.receiptUrl ? (
                  <div className="flex items-center gap-3 bg-green-950/30 border border-green-800/40 rounded-xl px-3 py-2.5">
                    <img src={form.receiptUrl} alt="comprobante" className="w-10 h-10 rounded-lg object-cover border border-gray-700 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-green-400">✓ Imagen cargada</p>
                      <p className="text-xs text-gray-600 truncate">{form.receiptName}</p>
                    </div>
                    <button type="button" onClick={() => { setForm(p => ({ ...p, receiptUrl: '', receiptName: '' })); if (fileRef.current) fileRef.current.value = ''; }}
                      className="text-gray-600 hover:text-red-400 text-sm shrink-0">✕</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingImg}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-gray-700 text-xs font-semibold text-gray-500 hover:border-yellow-700/50 hover:text-yellow-400 transition-colors disabled:opacity-50">
                    {uploadingImg ? '⏳ Subiendo...' : '📷 Subir imagen del comprobante'}
                  </button>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/40 border border-red-800/50 rounded-xl px-3 py-2.5">
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pb-2">
                <button type="button" onClick={() => setStep('destination')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-400 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors">← Atrás</button>
                <button type="submit" disabled={loading || uploadingImg}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-black disabled:opacity-50"
                  style={{ backgroundColor: GOLD }}>
                  {loading ? 'Enviando...' : '📤 Enviar solicitud'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 4: Success ── */}
          {step === 'success' && successData && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center text-3xl">✅</div>
              <div>
                <p className="text-base font-bold text-white">¡Solicitud enviada!</p>
                <p className="text-xs text-gray-500 mt-1">
                  Se acreditarán <span className="font-bold" style={{ color: GOLD }}>{successData.goldAmount} Golds</span> una vez verificado el pago.
                </p>
                <p className="text-xs text-gray-700 mt-2 font-mono">Ref: {successData.requestId.slice(-8)}</p>
              </div>
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-400 w-full text-left space-y-1">
                <p>⏱ Acreditación: <strong className="text-white">menos de 24h hábiles</strong></p>
                <p>📞 ¿Dudas? Contáctanos por Telegram</p>
              </div>
              <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold text-black" style={{ backgroundColor: GOLD }}>Entendido</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DestRow ──────────────────────────────────────────────────────────────────

function DestRow({ label, value, copyable, highlight }: { label: string; value: string; copyable?: boolean; highlight?: boolean }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-sm font-bold truncate ${highlight ? 'text-yellow-400' : 'text-white'}`}>{value}</span>
        {copyable && (
          <button type="button" onClick={copy}
            className="shrink-0 text-xs px-2 py-0.5 rounded-lg border border-gray-600 text-gray-400 hover:border-yellow-600 hover:text-yellow-400 transition-colors">
            {copied ? '✓' : 'Copiar'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, required, hint, type = 'text' }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean; hint?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}
