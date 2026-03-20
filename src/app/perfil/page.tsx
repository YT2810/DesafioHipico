'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import TopUpModal from '@/components/TopUpModal';

const GOLD = '#D4AF37';

type HReqStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface HReq {
  status: HReqStatus;
  pseudonym?: string;
  rejectionReason?: string;
  createdAt?: string;
}

interface TxItem {
  _id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

interface TopUpItem {
  _id: string;
  goldAmount: number;
  amountUsd: number;
  referenceNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
}

export default function PerfilPage() {
  const { data: session, status } = useSession();
  const [hReq, setHReq] = useState<HReq | null>(null);
  const [loadingReq, setLoadingReq] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [aliasInput, setAliasInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  // Handicapper pseudonym editing
  const [hProfile, setHProfile] = useState<{ pseudonym: string; bio: string; contactNumber: string } | null>(null);
  const [editingPseudonym, setEditingPseudonym] = useState(false);
  const [pseudonymInput, setPseudonymInput] = useState('');
  const [savingPseudonym, setSavingPseudonym] = useState(false);
  const [pseudonymError, setPseudonymError] = useState('');

  // Handicapper request form
  const [showForm, setShowForm] = useState(false);
  const [pseudonym, setPseudonym] = useState('');
  const [bio, setBio] = useState('');
  const [contactPlatform, setContactPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [contactValue, setContactValue] = useState('');
  const [socialLinks, setSocialLinks] = useState<{ platform: string; url: string; frequency: string }[]>([]);
  const [yearsExperience, setYearsExperience] = useState('');
  const [methodology, setMethodology] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Transaction history
  const [topUps, setTopUps] = useState<TopUpItem[]>([]);
  const [txs, setTxs] = useState<TxItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const { update: updateSession } = useSession();
  const user = session?.user as any;
  const roles: string[] = user?.roles ?? [];
  const golds: number = user?.balance?.golds ?? 0;
  const isHandicapper = roles.includes('handicapper');
  const isPrivileged = roles.some((r: string) => ['admin', 'staff'].includes(r));

  // Load handicapper profile if applicable
  useEffect(() => {
    if (status !== 'authenticated' || !isHandicapper) return;
    fetch('/api/handicapper/profile')
      .then(r => r.json())
      .then(d => { if (d.profile) setHProfile(d.profile); })
      .catch(() => {});
  }, [status, isHandicapper]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/handicapper-request')
      .then(r => r.json())
      .then(d => setHReq(d.request ? { ...d.request, status: d.request.status } : { status: 'none' }))
      .catch(() => setHReq({ status: 'none' }))
      .finally(() => setLoadingReq(false));
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    Promise.all([
      fetch('/api/topup').then(r => r.json()),
      fetch('/api/user/transactions').then(r => r.json()),
    ]).then(([topUpData, txData]) => {
      setTopUps(topUpData.requests ?? []);
      setTxs(txData.transactions ?? []);
    }).catch(() => {}).finally(() => setLoadingHistory(false));
  }, [status]);

  // Pre-fill pseudonym from localStorage intent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wants = localStorage.getItem('dh_wants_handicapper');
      if (wants) setShowForm(true);
    }
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!aliasInput.trim()) return;
    setSavingName(true);
    setNameError('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: aliasInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      await updateSession({ alias: data.alias });
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSavingName(false);
    }
  }

  async function handleSavePseudonym(e: React.FormEvent) {
    e.preventDefault();
    if (!pseudonymInput.trim()) return;
    setSavingPseudonym(true);
    setPseudonymError('');
    try {
      const res = await fetch('/api/handicapper/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudonym: pseudonymInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      setHProfile(p => p ? { ...p, pseudonym: data.pseudonym } : p);
      setEditingPseudonym(false);
    } catch (err) {
      setPseudonymError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSavingPseudonym(false);
    }
  }

  function addSocialLink() {
    if (socialLinks.length >= 4) return;
    setSocialLinks(prev => [...prev, { platform: 'youtube', url: '', frequency: 'weekly' }]);
  }
  function removeSocialLink(idx: number) {
    setSocialLinks(prev => prev.filter((_, i) => i !== idx));
  }
  function updateSocialLink(idx: number, field: string, value: string) {
    setSocialLinks(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!pseudonym.trim()) { setFormError('El seudónimo es requerido.'); return; }
    if (!contactValue.trim()) { setFormError('El número o usuario de contacto es requerido.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/handicapper-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pseudonym,
          bio,
          contactPlatform,
          contactValue,
          socialLinks: socialLinks.filter(l => l.url.trim()),
          yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
          methodology: methodology || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      localStorage.removeItem('dh_wants_handicapper');
      setFormSuccess('¡Solicitud enviada! El equipo la revisará pronto.');
      setHReq({ status: 'pending', pseudonym, createdAt: new Date().toISOString() });
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-4xl">🔐</div>
        <p className="text-white font-bold">Inicia sesión para ver tu perfil</p>
        <Link href="/auth/signin" className="px-6 py-3 rounded-xl text-sm font-bold text-black" style={{ backgroundColor: GOLD }}>
          Entrar
        </Link>
      </div>
    );
  }

  const hReqStatusCfg: Record<HReqStatus, { label: string; color: string; bg: string; border: string; icon: string }> = {
    none:     { label: '',           color: '',                bg: '',                  border: '',                  icon: '' },
    pending:  { label: 'Pendiente',  color: 'text-yellow-400', bg: 'bg-yellow-950/40',  border: 'border-yellow-700/50', icon: '⏳' },
    approved: { label: 'Aprobada',   color: 'text-green-400',  bg: 'bg-green-950/40',   border: 'border-green-700/50',  icon: '✅' },
    rejected: { label: 'Rechazada',  color: 'text-red-400',    bg: 'bg-red-950/40',     border: 'border-red-700/50',    icon: '❌' },
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-800 bg-gray-950/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white text-lg leading-none">←</Link>
          <h1 className="text-sm font-bold text-white">👤 Mi Perfil</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-4">

        {/* User card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-extrabold text-black shrink-0"
              style={{ backgroundColor: GOLD }}>
              {(user?.alias ?? user?.name ?? user?.email ?? 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {editingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={aliasInput}
                    onChange={e => setAliasInput(e.target.value)}
                    maxLength={40}
                    className="flex-1 min-w-0 bg-gray-800 border border-yellow-600 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none"
                  />
                  <button type="submit" disabled={savingName || !aliasInput.trim()}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-black disabled:opacity-40"
                    style={{ backgroundColor: GOLD }}>
                    {savingName ? '...' : 'Guardar'}
                  </button>
                  <button type="button" onClick={() => { setEditingName(false); setNameError(''); }}
                    className="shrink-0 px-2 py-1.5 rounded-lg text-xs text-gray-400 bg-gray-800 border border-gray-700">
                    ✕
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-white truncate">{user?.alias ?? user?.name ?? 'Usuario'}</p>
                  <button
                    onClick={() => { setAliasInput(user?.alias ?? user?.name ?? ''); setEditingName(true); setNameError(''); }}
                    className="shrink-0 text-xs text-gray-600 hover:text-yellow-400 transition-colors"
                    title="Cambiar nombre">
                    ✏️
                  </button>
                </div>
              )}
              {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
              <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {roles.map((r: string) => (
                  <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 capitalize border border-gray-700">{r}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gold balance */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Saldo</p>
            <p className="text-2xl font-extrabold" style={{ color: GOLD }}>🪙 {golds} <span className="text-base font-semibold">Golds</span></p>
          </div>
          <button onClick={() => setShowTopUp(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-black shrink-0"
            style={{ backgroundColor: GOLD }}>
            + Recargar
          </button>
        </div>

        {/* Quick link to panel for privileged users */}
        {roles.includes('admin') && (
          <Link href="/admin"
            className="flex items-center justify-between px-4 py-3 rounded-2xl border border-yellow-700/40 bg-yellow-950/20 hover:bg-yellow-950/40 transition-colors">
            <span className="text-sm font-bold text-yellow-400">⚙️ Panel de Administración</span>
            <span className="text-yellow-600 text-sm">›</span>
          </Link>
        )}
        {!roles.includes('admin') && roles.includes('staff') && (
          <Link href="/staff/panel"
            className="flex items-center justify-between px-4 py-3 rounded-2xl border border-blue-700/40 bg-blue-950/20 hover:bg-blue-950/40 transition-colors">
            <span className="text-sm font-bold text-blue-400">🛠️ Panel de Staff</span>
            <span className="text-blue-600 text-sm">›</span>
          </Link>
        )}

        {/* Handicapper section */}
        {isHandicapper ? (
          <div className="bg-gray-900 border border-green-800/40 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Handicapper</p>

            {/* Pseudonym editor */}
            {hProfile && (
              <div className="bg-gray-800/50 rounded-xl px-3 py-2.5">
                <p className="text-xs text-gray-500 mb-1.5">Seudónimo público</p>
                {editingPseudonym ? (
                  <form onSubmit={handleSavePseudonym} className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={pseudonymInput}
                      onChange={e => setPseudonymInput(e.target.value)}
                      maxLength={40}
                      className="flex-1 min-w-0 bg-gray-700 border border-yellow-600 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none"
                    />
                    <button type="submit" disabled={savingPseudonym || !pseudonymInput.trim()}
                      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-black disabled:opacity-40"
                      style={{ backgroundColor: GOLD }}>
                      {savingPseudonym ? '...' : 'Guardar'}
                    </button>
                    <button type="button" onClick={() => { setEditingPseudonym(false); setPseudonymError(''); }}
                      className="shrink-0 px-2 py-1.5 rounded-lg text-xs text-gray-400 bg-gray-700 border border-gray-600">
                      ✕
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{hProfile.pseudonym}</span>
                    <button
                      onClick={() => { setPseudonymInput(hProfile.pseudonym); setEditingPseudonym(true); setPseudonymError(''); }}
                      className="text-xs text-gray-600 hover:text-yellow-400 transition-colors"
                      title="Cambiar seudónimo">
                      ✏️
                    </button>
                  </div>
                )}
                {pseudonymError && <p className="text-xs text-red-400 mt-1">{pseudonymError}</p>}
              </div>
            )}

            <Link href="/handicapper/forecast"
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-black font-bold text-sm"
              style={{ backgroundColor: GOLD }}>
              <span>🎯 Subir pronóstico</span>
              <span>›</span>
            </Link>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">¿Quieres ser Handicapper?</p>

            {formSuccess && (
              <div className="text-sm text-green-400 bg-green-950/40 border border-green-800/40 rounded-xl px-3 py-2.5">
                {formSuccess}
              </div>
            )}

            {loadingReq ? (
              <div className="h-10 rounded-xl bg-gray-800 animate-pulse" />
            ) : hReq?.status === 'pending' ? (
              <div className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${hReqStatusCfg.pending.bg} ${hReqStatusCfg.pending.border}`}>
                <span className="text-xl">⏳</span>
                <div>
                  <p className={`text-sm font-semibold ${hReqStatusCfg.pending.color}`}>Solicitud pendiente de revisión</p>
                  <p className="text-xs text-gray-600">Seudónimo: <span className="text-gray-400">{hReq.pseudonym}</span></p>
                  <p className="text-xs text-gray-700 mt-0.5">El equipo la revisará pronto</p>
                </div>
              </div>
            ) : hReq?.status === 'rejected' ? (
              <div className="space-y-3">
                <div className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${hReqStatusCfg.rejected.bg} ${hReqStatusCfg.rejected.border}`}>
                  <span className="text-xl shrink-0">❌</span>
                  <div>
                    <p className={`text-sm font-semibold ${hReqStatusCfg.rejected.color}`}>Solicitud rechazada</p>
                    {hReq.rejectionReason && <p className="text-xs text-gray-500 mt-0.5">Motivo: {hReq.rejectionReason}</p>}
                    <p className="text-xs text-gray-700 mt-1">Puedes volver a solicitar</p>
                  </div>
                </div>
                <button onClick={() => { setShowForm(true); setFormSuccess(''); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-black"
                  style={{ backgroundColor: GOLD }}>
                  Volver a solicitar
                </button>
              </div>
            ) : showForm ? (
              <form onSubmit={handleSubmitRequest} className="space-y-3">
                {/* Seudónimo */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-medium">Seudónimo <span className="text-red-500">*</span></label>
                  <input value={pseudonym} onChange={e => setPseudonym(e.target.value)}
                    placeholder="Ej: El Maestro, TurfMaster VE..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
                </div>

                {/* Contacto obligatorio */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Contacto <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <div className="flex rounded-xl overflow-hidden border border-gray-700 shrink-0">
                      <button type="button"
                        onClick={() => setContactPlatform('whatsapp')}
                        className={`px-3 py-2 text-xs font-semibold transition-colors ${
                          contactPlatform === 'whatsapp' ? 'bg-green-700 text-white' : 'bg-gray-800 text-gray-500 hover:text-white'
                        }`}>
                        WhatsApp
                      </button>
                      <button type="button"
                        onClick={() => setContactPlatform('telegram')}
                        className={`px-3 py-2 text-xs font-semibold transition-colors ${
                          contactPlatform === 'telegram' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-500 hover:text-white'
                        }`}>
                        Telegram
                      </button>
                    </div>
                    <input value={contactValue} onChange={e => setContactValue(e.target.value)}
                      placeholder={contactPlatform === 'whatsapp' ? '+58 412 000 0000' : '@usuario o número'}
                      className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
                  </div>
                </div>

                {/* Presentación */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-medium">Presentación <span className="text-gray-600">(opcional)</span></label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
                    placeholder="Cuéntanos tu experiencia en el mundo hípico..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors resize-none" />
                </div>

                {/* Experiencia + metodología */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-medium">Años pronosticando <span className="text-gray-600">(opc.)</span></label>
                    <input type="number" min="0" max="50" value={yearsExperience} onChange={e => setYearsExperience(e.target.value)}
                      placeholder="Ej: 5"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-medium">Metodología <span className="text-gray-600">(opc.)</span></label>
                    <input value={methodology} onChange={e => setMethodology(e.target.value)}
                      placeholder="Ej: Estadística, forma..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
                  </div>
                </div>

                {/* Redes sociales */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-gray-400 font-medium">Redes / canales <span className="text-gray-600">(opcional)</span></label>
                    {socialLinks.length < 4 && (
                      <button type="button" onClick={addSocialLink}
                        className="text-xs text-yellow-500 hover:text-yellow-300 transition-colors">
                        + Agregar
                      </button>
                    )}
                  </div>
                  {socialLinks.length === 0 && (
                    <p className="text-xs text-gray-700 italic">YouTube, X, Instagram, TikTok donde publicas tus pronósticos</p>
                  )}
                  <div className="space-y-2">
                    {socialLinks.map((link, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select value={link.platform} onChange={e => updateSocialLink(idx, 'platform', e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none shrink-0">
                          <option value="youtube">YouTube</option>
                          <option value="x">X / Twitter</option>
                          <option value="instagram">Instagram</option>
                          <option value="tiktok">TikTok</option>
                          <option value="other">Otro</option>
                        </select>
                        <input value={link.url} onChange={e => updateSocialLink(idx, 'url', e.target.value)}
                          placeholder="URL o @usuario"
                          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors" />
                        <select value={link.frequency} onChange={e => updateSocialLink(idx, 'frequency', e.target.value)}
                          className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-400 focus:outline-none shrink-0">
                          <option value="daily">Diario</option>
                          <option value="weekly">Semanal</option>
                          <option value="irregular">Irregular</option>
                        </select>
                        <button type="button" onClick={() => removeSocialLink(idx)}
                          className="text-gray-600 hover:text-red-400 transition-colors text-sm shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {formError && <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/40 rounded-xl px-3 py-2">{formError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-400 bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={submitting || !pseudonym.trim() || !contactValue.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-40 transition-opacity"
                    style={{ backgroundColor: GOLD }}>
                    {submitting ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                </div>
              </form>
            ) : (
              <button onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 hover:border-yellow-700/50 transition-colors">
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Solicitar ser Handicapper</p>
                  <p className="text-xs text-gray-500">Publica pronósticos y genera ingresos</p>
                </div>
                <span className="text-gray-500 text-lg">›</span>
              </button>
            )}
          </div>
        )}

        {/* Transaction history */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Historial</p>

          {loadingHistory ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-gray-800 animate-pulse" />)}
            </div>
          ) : (topUps.length === 0 && txs.length === 0) ? (
            <p className="text-xs text-gray-700 text-center py-4">Sin movimientos aún</p>
          ) : (
            <div className="space-y-2">
              {/* Pending top-ups first */}
              {topUps.filter(t => t.status === 'pending').map(t => (
                <div key={t._id} className="flex items-center gap-3 bg-yellow-950/20 border border-yellow-800/30 rounded-xl px-3 py-2.5">
                  <span className="text-lg shrink-0">⏳</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-yellow-300">Recarga pendiente · {t.goldAmount} Golds</p>
                    <p className="text-xs text-gray-600">Ref: {t.referenceNumber} · ${t.amountUsd} USD</p>
                  </div>
                  <span className="text-xs text-yellow-600 shrink-0">{new Date(t.createdAt).toLocaleDateString('es-VE')}</span>
                </div>
              ))}
              {/* Rejected top-ups */}
              {topUps.filter(t => t.status === 'rejected').map(t => (
                <div key={t._id} className="flex items-center gap-3 bg-red-950/20 border border-red-800/30 rounded-xl px-3 py-2.5">
                  <span className="text-lg shrink-0">❌</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-red-400">Recarga rechazada · {t.goldAmount} Golds</p>
                    {t.rejectionReason && <p className="text-xs text-gray-600 truncate">Motivo: {t.rejectionReason}</p>}
                  </div>
                  <span className="text-xs text-gray-600 shrink-0">{new Date(t.createdAt).toLocaleDateString('es-VE')}</span>
                </div>
              ))}
              {/* Gold transactions */}
              {txs.map(tx => {
                const isCredit = tx.amount > 0;
                const icon = tx.type === 'purchase' ? '🪙' : tx.type === 'race_unlock' ? '🏇' : tx.type === 'refund' ? '↩️' : tx.type === 'bonus' ? '🎁' : '💸';
                return (
                  <div key={tx._id} className="flex items-center gap-3 bg-gray-800/40 rounded-xl px-3 py-2.5">
                    <span className="text-lg shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{tx.description}</p>
                      <p className="text-xs text-gray-600">Saldo: {tx.balanceAfter} Golds</p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                      {isCredit ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
          <Link href="/pronosticos"
            className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
            <span className="text-sm text-gray-300">🏇 Ver pronósticos</span>
            <span className="text-gray-600 text-sm">›</span>
          </Link>
          <button onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
            <span className="text-sm text-red-400">🚪 Cerrar sesión</span>
            <span className="text-gray-600 text-sm">›</span>
          </button>
        </div>

      </main>

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
    </div>
  );
}
