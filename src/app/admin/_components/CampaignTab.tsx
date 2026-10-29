'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignStats {
  impressions: number;
  clicks: number;
  bySlot: Record<string, { impressions: number; clicks: number; ctr: number }>;
}

interface Campaign {
  _id: string;
  slug: string;
  brand: string;
  targetUrl: string;
  slots: string[];
  active: boolean;
  creative: {
    badgeText?: string;
    title: string;
    subtitle?: string;
    ctaText: string;
    logoUrl?: string;
    accentColor?: string;
  };
  startsAt?: string;
  endsAt?: string;
  notes?: string;
  createdAt: string;
  stats30d: CampaignStats;
}

interface FormState {
  slug: string;
  brand: string;
  targetUrl: string;
  slots: string[];
  active: boolean;
  startsAt: string;
  endsAt: string;
  badgeText: string;
  title: string;
  subtitle: string;
  ctaText: string;
  logoUrl: string;
  accentColor: string;
  notes: string;
}

// ─── Slot catalogue (matches media kit) ─────────────────────────────────────

const SLOT_CATALOGUE = [
  { id: 'retrospectos_inline', label: 'In-Text Retrospectos',   icon: '📰', page: '/retrospectos' },
  { id: 'revista_inline',      label: 'In-Text Revista/Gaceta', icon: '📖', page: '/revista/[id]' },
  { id: 'resultados_inline',   label: 'In-Text Resultados',     icon: '🏆', page: '/resultados' },
  { id: 'traqueos_inline',     label: 'In-Text Traqueos',       icon: '⏱',  page: '/traqueos' },
  { id: 'header_leaderboard',  label: 'Cabecera Principal',     icon: '🖥️', page: 'Global' },
  { id: 'sticky_mobile',       label: 'Sticky Mobile',          icon: '📱', page: 'Global' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyForm(today: string, nextMonth: string): FormState {
  return {
    slug: '', brand: '', targetUrl: '', slots: [],
    active: true,
    startsAt: today, endsAt: nextMonth,
    badgeText: 'Sponsor Oficial', title: '', subtitle: '', ctaText: 'Reclamar Bono',
    logoUrl: '', accentColor: '#00A8E8', notes: '',
  };
}

function toLocalDate(iso?: string): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function daysRemaining(endsAt?: string): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function ctr(imp: number, clk: number): string {
  if (!imp) return '—';
  return `${((clk / imp) * 100).toFixed(1)}%`;
}

function fmtN(n: number): string {
  return n.toLocaleString('es-VE');
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CampaignTab() {
  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Form modal state
  const [editing, setEditing] = useState<Campaign | null | 'new'>(null); // null=closed, 'new'=create, Campaign=edit
  const [form, setForm] = useState<FormState>(emptyForm(today, nextMonth));
  const [slotOpen, setSlotOpen] = useState(false);

  // ── Load campaigns ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/sponsors');
      const j = await r.json();
      if (r.ok) setCampaigns(j.campaigns ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(type: 'ok' | 'err', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  // ── Toggle active ──────────────────────────────────────────────────────────
  async function toggleActive(c: Campaign) {
    setBusy(c.slug);
    const r = await fetch('/api/admin/sponsors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: c.slug, active: !c.active }),
    });
    if (r.ok) {
      setCampaigns(prev => prev.map(x => x.slug === c.slug ? { ...x, active: !x.active } : x));
      flash('ok', `Campaña "${c.brand}" ${!c.active ? 'activada ✅' : 'pausada ⏸'}`);
    } else {
      flash('err', 'Error al cambiar estado');
    }
    setBusy(null);
  }

  // ── Open edit form ─────────────────────────────────────────────────────────
  function openEdit(c: Campaign) {
    setForm({
      slug: c.slug,
      brand: c.brand,
      targetUrl: c.targetUrl,
      slots: c.slots,
      active: c.active,
      startsAt: toLocalDate(c.startsAt),
      endsAt: toLocalDate(c.endsAt),
      badgeText: c.creative.badgeText ?? 'Sponsor Oficial',
      title: c.creative.title,
      subtitle: c.creative.subtitle ?? '',
      ctaText: c.creative.ctaText,
      logoUrl: c.creative.logoUrl ?? '',
      accentColor: c.creative.accentColor ?? '#00A8E8',
      notes: c.notes ?? '',
    });
    setEditing(c);
    setSlotOpen(false);
  }

  function openNew() {
    setForm(emptyForm(today, nextMonth));
    setEditing('new');
    setSlotOpen(false);
  }

  function closeModal() { setEditing(null); setSlotOpen(false); }

  // ── Save (create or update) ────────────────────────────────────────────────
  async function save() {
    if (!form.slug.trim() || !form.brand.trim() || !form.targetUrl.trim() || !form.title.trim()) {
      flash('err', 'Completa: slug, marca, URL destino y título del banner');
      return;
    }
    if (!/^https?:\/\//.test(form.targetUrl)) {
      flash('err', 'URL destino debe empezar con https://');
      return;
    }

    setBusy('save');
    const body = {
      slug: form.slug.toLowerCase().trim(),
      brand: form.brand.trim(),
      targetUrl: form.targetUrl.trim(),
      slots: form.slots,
      active: form.active,
      startsAt: form.startsAt || undefined,
      endsAt: form.endsAt || undefined,
      creative: {
        badgeText: form.badgeText,
        title: form.title,
        subtitle: form.subtitle,
        ctaText: form.ctaText,
        logoUrl: form.logoUrl,
        accentColor: form.accentColor,
      },
      notes: form.notes,
    };

    const r = await fetch('/api/admin/sponsors', {
      method: editing === 'new' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (r.ok) {
      flash('ok', editing === 'new' ? 'Campaña creada ✅' : 'Campaña actualizada ✅');
      closeModal();
      load();
    } else {
      const e = await r.json().catch(() => ({}));
      flash('err', e.error ?? 'Error al guardar');
    }
    setBusy(null);
  }

  // ── Form field helpers ────────────────────────────────────────────────────
  const F = (field: keyof FormState) => ({
    value: form[field] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value })),
  });

  function toggleSlot(id: string) {
    setForm(p => ({
      ...p,
      slots: p.slots.includes(id) ? p.slots.filter(s => s !== id) : [...p.slots, id],
    }));
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">📢 Campañas Publicitarias</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestión de avisos, slots de publicidad y testing A/B/C. Los cambios son inmediatos.
          </p>
        </div>
        <button
          onClick={openNew}
          className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-black transition-colors"
        >
          + Nueva Campaña
        </button>
      </div>

      {/* ── Flash message ── */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-semibold border ${
          msg.type === 'ok'
            ? 'bg-green-950/50 border-green-700/50 text-green-300'
            : 'bg-red-950/50 border-red-700/50 text-red-300'
        }`}>
          {msg.text}
        </div>
      )}

      {/* ── Media kit info ── */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
        <p className="text-xs font-bold text-yellow-600 mb-2 uppercase tracking-widest">📐 Slots disponibles (media kit)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SLOT_CATALOGUE.map(s => (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <span>{s.icon}</span>
              <div>
                <p className="font-semibold text-white">{s.label}</p>
                <p className="text-gray-600 font-mono text-[10px]">{s.page}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Campaign list ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 rounded-2xl bg-gray-900 animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-sm">No hay campañas aún. Crea la primera con el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const days = daysRemaining(c.endsAt);
            const isExpired = days !== null && days <= 0;
            const accent = c.creative.accentColor || '#00A8E8';
            const total30 = c.stats30d;

            return (
              <div
                key={c.slug}
                className={`rounded-2xl border p-4 transition-all ${
                  c.active && !isExpired
                    ? 'border-gray-700 bg-gray-900'
                    : 'border-gray-800 bg-gray-950 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">

                  {/* ── Active toggle ── */}
                  <button
                    onClick={() => toggleActive(c)}
                    disabled={busy === c.slug}
                    title={c.active ? 'Pausar campaña' : 'Activar campaña'}
                    className={`shrink-0 w-10 h-6 rounded-full transition-colors relative ${
                      c.active ? 'bg-green-500' : 'bg-gray-700'
                    } ${busy === c.slug ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                    style={{ minWidth: 40 }}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        c.active ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  {/* ── Brand + meta ── */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: accent }}
                      />
                      <span className="font-extrabold text-white text-sm">{c.brand}</span>
                      <span className="text-[10px] text-gray-600 font-mono bg-gray-800 px-1.5 py-0.5 rounded">
                        {c.slug}
                      </span>
                      {isExpired && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950/50 border border-red-700/50 text-red-400 uppercase">
                          Vencida
                        </span>
                      )}
                    </div>

                    {/* Slots */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.slots.map(sl => {
                        const info = SLOT_CATALOGUE.find(x => x.id === sl);
                        return (
                          <span key={sl} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400">
                            {info ? `${info.icon} ${info.label}` : sl}
                          </span>
                        );
                      })}
                      {c.slots.length === 0 && (
                        <span className="text-[9px] text-yellow-600">⚠ Sin slots asignados</span>
                      )}
                    </div>

                    {/* Dates */}
                    <p className="text-[10px] text-gray-600 mt-1">
                      {c.startsAt ? toLocalDate(c.startsAt) : '—'}
                      {' → '}
                      {c.endsAt ? toLocalDate(c.endsAt) : '∞'}
                      {days !== null && days > 0 && (
                        <span className="ml-2 text-yellow-600 font-semibold">({days}d restantes)</span>
                      )}
                    </p>

                    {/* Creative preview */}
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      <span className="text-gray-700 mr-1">»</span>
                      {c.creative.title}
                    </p>
                  </div>

                  {/* ── 30-day stats ── */}
                  <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-center">
                        <p className="font-black text-white">{fmtN(total30.impressions)}</p>
                        <p className="text-[9px] text-gray-600 uppercase tracking-wide">Imp.</p>
                      </div>
                      <div className="text-center">
                        <p className="font-black text-white">{fmtN(total30.clicks)}</p>
                        <p className="text-[9px] text-gray-600 uppercase tracking-wide">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className={`font-black ${
                          total30.impressions > 0
                            ? parseFloat(ctr(total30.impressions, total30.clicks)) > 2
                              ? 'text-green-400'
                              : 'text-white'
                            : 'text-gray-600'
                        }`}>
                          {ctr(total30.impressions, total30.clicks)}
                        </p>
                        <p className="text-[9px] text-gray-600 uppercase tracking-wide">CTR</p>
                      </div>
                    </div>

                    {/* Per-slot breakdown */}
                    {Object.entries(total30.bySlot).map(([sl, st]) => {
                      const info = SLOT_CATALOGUE.find(x => x.id === sl);
                      return (
                        <p key={sl} className="text-[9px] text-gray-600">
                          {info?.icon ?? '📌'} {st.impressions} imp · {st.clicks} clk · {st.ctr}%
                        </p>
                      );
                    })}

                    <button
                      onClick={() => openEdit(c)}
                      className="mt-2 px-3 py-1 rounded-lg text-[10px] font-bold border border-gray-700 text-gray-400 hover:border-yellow-700/60 hover:text-yellow-400 transition-colors"
                    >
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════ FORM MODAL ══════════════════════════════════════════ */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Panel */}
          <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-gray-950 border border-gray-800 shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-black text-white text-sm">
                {editing === 'new' ? '➕ Nueva Campaña' : `✏️ Editar — ${(editing as Campaign).brand}`}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-white text-lg transition-colors"
              >✕</button>
            </div>

            <div className="p-5 space-y-5">

              {/* ── Identidad ── */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-600">Identidad</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Slug <span className="text-gray-600">(único, sin espacios)</span></label>
                    <input
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-yellow-600"
                      placeholder="ej. 1xbet-a"
                      disabled={editing !== 'new'}
                      {...F('slug')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombre del anunciante</label>
                    <input
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                      placeholder="ej. 1xBET"
                      {...F('brand')}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">URL destino (link de afiliado)</label>
                  <input
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-yellow-600"
                    placeholder="https://1xplay.vip/DESAFIOVIP"
                    type="url"
                    {...F('targetUrl')}
                  />
                  <p className="text-[10px] text-gray-600 mt-0.5">Los UTMs se añaden automáticamente si la URL no los incluye.</p>
                </div>
              </section>

              {/* ── Slots ── */}
              <section className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-600">Slots de aparición</p>
                <button
                  type="button"
                  onClick={() => setSlotOpen(p => !p)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-300 hover:border-yellow-700/60 transition-colors"
                >
                  <span>
                    {form.slots.length === 0
                      ? 'Selecciona slots...'
                      : `${form.slots.length} slot${form.slots.length > 1 ? 's' : ''} seleccionado${form.slots.length > 1 ? 's' : ''}`}
                  </span>
                  <span className="text-gray-600">{slotOpen ? '▲' : '▼'}</span>
                </button>

                {slotOpen && (
                  <div className="rounded-xl border border-gray-700 bg-gray-900 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SLOT_CATALOGUE.map(s => (
                      <label key={s.id} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={form.slots.includes(s.id)}
                          onChange={() => toggleSlot(s.id)}
                          className="w-3.5 h-3.5 accent-yellow-500"
                        />
                        <span className="text-xs text-gray-300 group-hover:text-white transition-colors">
                          {s.icon} {s.label}
                        </span>
                        <span className="text-[9px] text-gray-700 ml-auto">{s.page}</span>
                      </label>
                    ))}
                  </div>
                )}

                {form.slots.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.slots.map(sl => {
                      const info = SLOT_CATALOGUE.find(x => x.id === sl);
                      return (
                        <span key={sl} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-yellow-950/40 border border-yellow-700/40 text-yellow-400">
                          {info ? `${info.icon} ${info.label}` : sl}
                        </span>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* ── Período ── */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-600">Período de la campaña</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Fecha inicio</label>
                    <input
                      type="date"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                      {...F('startsAt')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Fecha fin</label>
                    <input
                      type="date"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                      {...F('endsAt')}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="camp-active"
                    checked={form.active}
                    onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-yellow-500"
                  />
                  <label htmlFor="camp-active" className="text-xs text-gray-300 cursor-pointer">
                    Activa — el banner se muestra inmediatamente en la web
                  </label>
                </div>
              </section>

              {/* ── Creative ── */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-600">Creative del banner</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Badge/chip</label>
                    <input
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                      placeholder="Sponsor Oficial"
                      {...F('badgeText')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Texto del botón CTA</label>
                    <input
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                      placeholder="Reclamar Bono"
                      {...F('ctaText')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Color acento</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        className="w-10 h-9 rounded-lg border border-gray-700 bg-gray-900 cursor-pointer p-0.5"
                        {...F('accentColor')}
                      />
                      <input
                        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-yellow-600"
                        placeholder="#00A8E8"
                        {...F('accentColor')}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Título del banner <span className="text-gray-600">(headline principal)</span>
                  </label>
                  <input
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                    placeholder="¡Dobla tu primer depósito hasta $130!"
                    {...F('title')}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Subtítulo</label>
                  <input
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                    placeholder="Apuestas · Casino · Deportes · Código: DESAFIOVIP"
                    {...F('subtitle')}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Logo URL <span className="text-gray-600">(opcional)</span></label>
                  <input
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-yellow-600"
                    placeholder="https://..."
                    type="url"
                    {...F('logoUrl')}
                  />
                </div>

                {/* Tip for A/B/C */}
                <div className="rounded-xl bg-blue-950/30 border border-blue-700/30 px-3 py-2.5 text-xs text-blue-300 leading-relaxed">
                  <strong className="text-blue-200">Testing A/B/C:</strong> Crea varias campañas con los mismos slots y el mismo período.
                  El sistema las rota aleatoriamente — cada visita ve una variante distinta.
                  Compara el CTR por slug en las métricas de 30 días para identificar el ganador.
                </div>
              </section>

              {/* ── Notas internas ── */}
              <section className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-600">Notas internas</p>
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600 resize-none"
                  rows={2}
                  placeholder="Monto del contrato, contacto, condiciones..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </section>

              {/* ── Actions ── */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={save}
                  disabled={busy === 'save'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black bg-yellow-500 hover:bg-yellow-400 text-black transition-colors disabled:opacity-50"
                >
                  {busy === 'save' ? 'Guardando...' : editing === 'new' ? '✅ Crear campaña' : '✅ Guardar cambios'}
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
