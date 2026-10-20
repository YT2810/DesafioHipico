'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { VENEZUELAN_BANKS, TOPUP_PACKAGES, type TopUpPackageId } from '@/lib/constants';

type LivePackage = { id: string; label: string; description: string; priceBs: number; golds: number; bsPerGold: number; badge: string | null; saving: string | null; };

const GOLD = '#D4AF37';
const SHOW_EXTENDED_TOPUP_FIELDS = false;

interface TopUpModalProps { onClose: () => void; }

export default function TopUpModal({ onClose }: TopUpModalProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const today = new Date().toISOString().slice(0, 10);

  const [step, setStep] = useState<'package' | 'destination' | 'form' | 'success'>('package');
  const [selectedPkgId, setSelectedPkgId] = useState<TopUpPackageId>('arranque');
  const [livePackages, setLivePackages] = useState<LivePackage[]>([...TOPUP_PACKAGES]);
  const [loading, setLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [error, setError] = useState('');
  const [paymentBanks, setPaymentBanks] = useState<{ priority: number; bankName: string; phone: string; legalId: string; holderName: string }[]>([]);
  const [selectedBankIdx, setSelectedBankIdx] = useState(0);
  const [successData, setSuccessData] = useState<{ goldAmount: number; requestId: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/topup/payment-info')
      .then(r => r.json())
      .then(d => { if (d.banks?.length) setPaymentBanks(d.banks); })
      .catch(() => {});
    fetch('/api/topup/packages')
      .then(r => r.json())
      .then(d => { if (d.packages?.length) setLivePackages(d.packages); })
      .catch(() => {});
  }, []);

  const selectedPkg = livePackages.find(p => p.id === selectedPkgId) ?? livePackages[0];

  const [form, setForm] = useState({
    referenceNumber: '',
    phone: user?.phone ?? '',
    legalId: user?.legalId ?? '',
    bank: '',
    amountBs: '',
    paymentDate: today,
    receiptUrl: '',
    receiptName: '',
    fullName: user?.fullName ?? '',
    identityDocument: user?.identityDocument ?? '',
    idPrefix: 'V',
  });

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
      if (form.fullName.trim() && form.identityDocument.trim()) {
        fetch('/api/user/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: form.fullName.trim(),
            identityDocument: form.idPrefix + form.identityDocument.trim(),
            phoneNumber: form.phone.trim(),
          }),
        }).catch(() => {});
      }

      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: selectedPkgId,
          referenceNumber: form.referenceNumber,
          phone: form.phone,
          legalId: form.identityDocument.trim() ? form.idPrefix + form.identityDocument.trim() : '',
          bank: form.bank,
          amountBs: parseFloat(form.amountBs) || selectedPkg.priceBs,
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

  const stepIndex = step === 'package' ? 0 : step === 'destination' ? 1 : step === 'form' ? 2 : 3;
  const stepLabels = ['Elige tu Pase', 'Datos de pago', 'Confirma el pago'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-gray-950 border border-gray-800 rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[94vh] flex flex-col shadow-2xl">

        {/* Pull handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-white">🎟️ Activar Pase Nacional</h2>
            <p className="text-xs text-gray-500">Acceso completo a La Rinconada + Valencia</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-sm">✕</button>
        </div>

        {/* Step progress */}
        {step !== 'success' && (
          <div className="flex items-center gap-1.5 px-5 pt-3 pb-1 shrink-0">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full transition-colors ${stepIndex === i ? 'bg-yellow-500' : stepIndex > i ? 'bg-yellow-700' : 'bg-gray-700'}`} />
                {i < 2 && <div className="w-4 h-px bg-gray-800" />}
              </div>
            ))}
            <span className="ml-2 text-xs text-gray-600">{stepLabels[stepIndex] ?? ''}</span>
          </div>
        )}

        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── Step 1: Elegir Pase ── */}
          {step === 'package' && (
            <div className="space-y-4">
              {/* Beneficios del Pase */}
              <div className="rounded-2xl border border-yellow-700/40 bg-yellow-950/20 px-4 py-3 space-y-2">
                <p className="text-xs font-extrabold text-yellow-400 uppercase tracking-wide">Con tu Pase Nacional desbloqueas:</p>
                <ul className="space-y-1.5 text-xs text-gray-300">
                  <li className="flex items-center gap-2"><span className="text-yellow-400">✓</span>Todas las carreras de La Rinconada y Valencia con Factor de Victoria en vivo</li>
                  <li className="flex items-center gap-2"><span className="text-yellow-400">✓</span>Diagnóstico de Riesgo de cada carrera (Candado Limpio vs. Alerta de Batacazo)</li>
                  <li className="flex items-center gap-2"><span className="text-yellow-400">✓</span>Cuadro 5y6 VIP del Algoritmo en el botón dorado flotante 👑</li>
                </ul>
              </div>

              {/* Cards de Pases */}
              <div className="space-y-3">
                {livePackages.map(pkg => {
                  const isSelected = selectedPkgId === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPkgId(pkg.id as TopUpPackageId)}
                      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${isSelected ? 'border-yellow-500 bg-yellow-950/25' : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'border-yellow-500' : 'border-gray-600'}`}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-white">{pkg.label}</span>
                              {pkg.badge && (
                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full text-black" style={{ backgroundColor: GOLD }}>{pkg.badge}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 leading-snug">{pkg.description}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-black text-white">Bs {pkg.priceBs.toLocaleString('es-VE')}</p>
                          {pkg.saving && (
                            <p className="text-[10px] font-bold text-green-400 mt-0.5">{pkg.saving}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Info pago */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-xs text-gray-400 space-y-1">
                <p>� Pago vía <strong className="text-white">Pago Móvil</strong> al número de la plataforma.</p>
                <p>⏱ Tu pase se activa en <strong className="text-white">menos de 24 h hábiles</strong> una vez verificado.</p>
                <p>📩 ¿Dudas? <a href="/faq" className="text-yellow-500 underline">Ver FAQ</a> · <a href="mailto:desafiohipicoapp@gmail.com" className="text-yellow-500 underline">desafiohipicoapp@gmail.com</a></p>
              </div>

              <button
                onClick={() => setStep('destination')}
                className="w-full py-4 rounded-xl text-sm font-extrabold text-black shadow-lg"
                style={{ backgroundColor: GOLD }}
              >
                Activar {selectedPkg?.label} — Bs {selectedPkg?.priceBs.toLocaleString('es-VE')} →
              </button>
            </div>
          )}

          {/* ── Step 2: Cuenta destino ── */}
          {step === 'destination' && (
            <div className="space-y-4">
              <p className="text-sm font-bold text-white">Realiza tu Pago Móvil a esta cuenta:</p>

              {paymentBanks.length > 1 && (
                <div className="flex gap-2">
                  {paymentBanks.map((b, i) => (
                    <button key={i} onClick={() => setSelectedBankIdx(i)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${selectedBankIdx === i ? 'border-yellow-600 bg-yellow-950/30 text-yellow-400' : 'border-gray-800 bg-gray-900 text-gray-500 hover:text-gray-300'}`}>
                      {i === 0 ? '⭐ ' : ''}{b.bankName.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}

              {paymentBanks.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-yellow-600 border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Cuenta destino</span>
                    {selectedBankIdx === 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-black" style={{ backgroundColor: GOLD }}>Preferida</span>}
                  </div>
                  <div className="divide-y divide-gray-800/60">
                    <DestRow label="Banco"    value={paymentBanks[selectedBankIdx]?.bankName ?? ''} />
                    <DestRow label="Cédula"   value={paymentBanks[selectedBankIdx]?.legalId ?? ''} copyable />
                    <DestRow label="Teléfono" value={paymentBanks[selectedBankIdx]?.phone ?? ''}   copyable />
                    <DestRow label="Titular"  value={paymentBanks[selectedBankIdx]?.holderName ?? ''} />
                    <DestRow label="Pase"     value={selectedPkg?.label ?? ''} />
                    <DestRow label="Monto"    value={`Bs ${selectedPkg?.priceBs.toLocaleString('es-VE')}`} highlight copyable />
                  </div>
                </div>
              )}

              <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-xl px-4 py-3 text-xs text-yellow-200/70 space-y-1">
                <p>📸 Guarda el comprobante con el número de referencia — lo necesitas en el siguiente paso.</p>
                <p>⏱ Tu pase se activa en menos de 24 h hábiles una vez verificado.</p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep('package')} className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-400 bg-gray-900 hover:bg-gray-800 border border-gray-800 transition-colors">← Atrás</button>
                <button onClick={() => {
                  setForm(p => ({ ...p, amountBs: p.amountBs || String(selectedPkg?.priceBs ?? '') }));
                  setStep('form');
                }} className="flex-1 py-3.5 rounded-xl text-sm font-extrabold text-black" style={{ backgroundColor: GOLD }}>Ya pagué →</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Confirmar pago ── */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Resumen del Pase */}
              <div className="rounded-2xl border border-yellow-700/40 bg-yellow-950/20 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Activando</p>
                  <p className="text-sm font-extrabold text-white">{selectedPkg?.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Monto</p>
                  <p className="text-base font-extrabold" style={{ color: GOLD }}>Bs {selectedPkg?.priceBs.toLocaleString('es-VE')}</p>
                </div>
              </div>

              <Field label="Número de referencia *" value={form.referenceNumber} onChange={e => set('referenceNumber', e.target.value)}
                placeholder="Ej: 00123456789" required inputMode="numeric" hint="Últimos dígitos o referencia completa del Pago Móvil" />

              <Field label="Teléfono del pagador *" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="Ej: 04121234567" required inputMode="tel" hint="El número desde el que realizaste el Pago Móvil" />

              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Monto en Bs. *" value={form.amountBs} onChange={e => set('amountBs', e.target.value)}
                  placeholder={`${selectedPkg?.priceBs.toLocaleString('es-VE')}`} required type="number" inputMode="decimal" />
                <Field label="Fecha del pago *" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)}
                  placeholder={today} required type="date" />
              </div>

              {SHOW_EXTENDED_TOPUP_FIELDS && (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-medium">Banco emisor</label>
                    <select value={form.bank} onChange={e => set('bank', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-600 transition-colors">
                      <option value="">— Selecciona tu banco —</option>
                      {VENEZUELAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cédula de identidad</label>
                    <div className="flex gap-2">
                      <select value={form.idPrefix} onChange={e => set('idPrefix', e.target.value)}
                        className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-yellow-600 w-20 shrink-0">
                        <option value="V">V</option><option value="E">E</option><option value="J">J</option><option value="P">P</option><option value="G">G</option>
                      </select>
                      <input type="text" value={form.identityDocument}
                        onChange={e => set('identityDocument', e.target.value.replace(/\D/g, ''))}
                        placeholder="16108291"
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600" />
                    </div>
                  </div>
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
                </>
              )}

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-xs bg-red-950/40 border border-red-800/50 rounded-xl px-3 py-2.5">
                  <span>⚠️</span><span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pb-2">
                <button type="button" onClick={() => setStep('destination')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-400 bg-gray-900 hover:bg-gray-800 border border-gray-800 transition-colors">← Atrás</button>
                <button type="submit" disabled={loading || uploadingImg}
                  className="flex-1 py-3 rounded-xl text-sm font-extrabold text-black disabled:opacity-50" style={{ backgroundColor: GOLD }}>
                  {loading ? 'Enviando...' : '📤 Enviar solicitud'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 4: Éxito ── */}
          {step === 'success' && successData && (
            <div className="flex flex-col items-center text-center gap-5 py-6">
              <div className="w-20 h-20 rounded-full bg-yellow-950/40 border-2 border-yellow-600/60 flex items-center justify-center text-4xl">🎟️</div>
              <div className="space-y-1.5">
                <p className="text-lg font-extrabold text-white">¡Solicitud enviada!</p>
                <p className="text-sm text-gray-400">Tu <span className="font-bold text-white">{selectedPkg?.label}</span> se activará en menos de 24 h hábiles una vez que verifiquemos el pago.</p>
                <p className="text-xs text-gray-700 mt-2 font-mono">Ref interna: {successData.requestId.slice(-8)}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-xs text-gray-400 w-full text-left space-y-1">
                <p>⏱ Verificación: <strong className="text-white">menos de 24 h hábiles</strong></p>
                <p>📩 ¿Dudas? <a href="mailto:desafiohipicoapp@gmail.com" className="text-yellow-400 underline">desafiohipicoapp@gmail.com</a></p>
              </div>
              <button onClick={onClose} className="w-full py-3.5 rounded-xl text-sm font-extrabold text-black" style={{ backgroundColor: GOLD }}>Entendido</button>
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
            className="shrink-0 text-xs px-2 py-0.5 rounded-lg border border-gray-700 text-gray-500 hover:border-yellow-600 hover:text-yellow-400 transition-colors">
            {copied ? '✓' : 'Copiar'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, required, hint, type = 'text', inputMode }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; required?: boolean; hint?: string; type?: string;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5 font-medium">{label}</label>
      <input type={type} inputMode={inputMode} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
      {hint && <p className="text-xs text-gray-600 mt-1">{hint}</p>}
    </div>
  );
}
