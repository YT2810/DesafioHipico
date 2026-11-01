'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

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
  isHouseAd: boolean;
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

// ─── Slot catalogue (matches media kit) ──────────────────────────────────────

const SLOT_CATALOGUE = [
  { id: 'retrospectos_inline', label: 'In-Text Retrospectos',   icon: '📰', page: '/retrospectos' },
  { id: 'revista_inline',      label: 'In-Text Revista/Gaceta', icon: '📖', page: '/revista/[id]' },
  { id: 'resultados_inline',   label: 'In-Text Resultados',     icon: '🏆', page: '/resultados' },
  { id: 'traqueos_inline',     label: 'In-Text Traqueos',       icon: '⏱',  page: '/traqueos' },
  { id: 'header_leaderboard',  label: 'Cabecera Principal',     icon: '🖥️', page: 'Global' },
  { id: 'sticky_mobile',       label: 'Sticky Mobile',          icon: '📱', page: 'Global' },
];

// ─── Plantillas A/B/C ────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);
const NEXT_30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const NEXT_90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

const TEMPLATES_1XBET = [
  {
    key: 'a',
    label: 'Hipismo + Bono',
    emoji: '🅰',
    desc: 'Azul 1xBET · para la audiencia hípica',
    color: '#00A8E8',
    form: {
      slug: '1xbet-a',
      brand: '1xBET',
      targetUrl: 'https://1xplay.vip/DESAFIOVIP',
      slots: ['retrospectos_inline', 'revista_inline'],
      active: true, isHouseAd: false,
      startsAt: TODAY,
      endsAt: NEXT_30,
      badgeText: 'Sponsor Oficial',
      title: '¡Dobla tu primer depósito hasta $130!',
      subtitle: 'Apuestas · Casino · Deportes · Código: DESAFIOVIP',
      ctaText: 'Reclamar Bono',
      logoUrl: '',
      accentColor: '#00A8E8',
      notes: 'Campaña 1xBET octubre–noviembre 2026. Afiliado: DESAFIOVIP. Variante A — hípica + bono.',
    },
  },
  {
    key: 'b',
    label: 'LVBP en Vivo',
    emoji: '🅱',
    desc: 'Rojo béisbol · temporada activa',
    color: '#C41E3A',
    form: {
      slug: '1xbet-b',
      brand: '1xBET',
      targetUrl: 'https://1xplay.vip/DESAFIOVIP',
      slots: ['retrospectos_inline', 'revista_inline'],
      active: true, isHouseAd: false,
      startsAt: TODAY,
      endsAt: NEXT_30,
      badgeText: 'LVBP 2026 EN VIVO',
      title: 'LVBP ya empezó — apuesta en cada juego con 1xBET',
      subtitle: 'Bono hasta $130 · Regístrate con código DESAFIOVIP',
      ctaText: 'Apostar en LVBP',
      logoUrl: '',
      accentColor: '#C41E3A',
      notes: 'Campaña 1xBET octubre–noviembre 2026. Afiliado: DESAFIOVIP. Variante B — LVBP.',
    },
  },
  {
    key: 'c',
    label: 'Código Exclusivo',
    emoji: '🅲',
    desc: 'Naranja dorado · exclusividad Desafío',
    color: '#F5A623',
    form: {
      slug: '1xbet-c',
      brand: '1xBET',
      targetUrl: 'https://1xplay.vip/DESAFIOVIP',
      slots: ['retrospectos_inline', 'revista_inline'],
      active: true, isHouseAd: false,
      startsAt: TODAY,
      endsAt: NEXT_30,
      badgeText: 'Solo Desafío Hípico',
      title: 'Código DESAFIOVIP: duplica tu depósito',
      subtitle: 'Casino · Parlays · LVBP · Hasta $130 en 1xBET',
      ctaText: 'Activar Código',
      logoUrl: '',
      accentColor: '#F5A623',
      notes: 'Campaña 1xBET octubre–noviembre 2026. Afiliado: DESAFIOVIP. Variante C — exclusividad.',
    },
  },
];

// ─── House Ads (Publicidad Propia — Pase Nacional → /pase) ───────────────────
// Copy mezclado: dolor (jugar a ciegas, fijos trampa, batacazos no vistos)
// + beneficio (orden, diagnóstico, cuándo cerrar o abrir la jugada)

const PASE_URL = '/pase';

const TEMPLATES_HOUSE = [
  // ── Retrospectos ──────────────────────────────────────────────────────────
  {
    key: 'retro-pase-a',
    emoji: '📰',
    label: 'Retrospectos A',
    desc: 'Dolor: data sin conclusión · dorado',
    color: '#D4AF37',
    form: {
      slug: 'house-retro-pase-a',
      brand: 'Desafío Hípico',
      targetUrl: PASE_URL,
      slots: ['retrospectos_inline'],
      active: true, isHouseAd: true,
      startsAt: TODAY, endsAt: NEXT_90,
      badgeText: '👑 Pase Nacional',
      title: '¿Leíste el retrospecto y aún no sabes por quién ir?',
      subtitle: 'El FV resume toda la data en un número por caballo · 79.9% acierta el Top 3',
      ctaText: 'Ver el FV →',
      logoUrl: '',
      accentColor: '#D4AF37',
      notes: 'House ad — Retrospectos A. Dolor: retrospecto abruma, FV concluye.',
    },
  },
  {
    key: 'retro-pase-b',
    emoji: '📰',
    label: 'Retrospectos B',
    desc: 'Dolor: el fijo del grupo · verde',
    color: '#22c55e',
    form: {
      slug: 'house-retro-pase-b',
      brand: 'Desafío Hípico',
      targetUrl: PASE_URL,
      slots: ['retrospectos_inline'],
      active: true, isHouseAd: true,
      startsAt: TODAY, endsAt: NEXT_90,
      badgeText: 'Factor de Victoria',
      title: "¿Cuántos 'fijos' de grupo te han tumbado la combinada?",
      subtitle: 'El FV detecta cuándo el favorito es trampa · Diagnóstico de riesgo por carrera · Bs. 6.000',
      ctaText: 'Activar mi Pase →',
      logoUrl: '',
      accentColor: '#22c55e',
      notes: 'House ad — Retrospectos B. Dolor: fijos de WhatsApp que fallan.',
    },
  },
  // ── Revista ───────────────────────────────────────────────────────────────
  {
    key: 'revista-pase-a',
    emoji: '📖',
    label: 'Revista A',
    desc: 'Beneficio: cuándo cerrar o abrir · dorado',
    color: '#D4AF37',
    form: {
      slug: 'house-revista-pase-a',
      brand: 'Desafío Hípico',
      targetUrl: PASE_URL,
      slots: ['revista_inline'],
      active: true, isHouseAd: true,
      startsAt: TODAY, endsAt: NEXT_90,
      badgeText: 'Hoy es reunión',
      title: 'El FV te dice cuándo cerrar en 2 y cuándo abrir a 5',
      subtitle: 'Diagnóstico de riesgo por carrera · La Rinconada + Valencia · Bs. 6.000',
      ctaText: 'Activar el FV →',
      logoUrl: '',
      accentColor: '#D4AF37',
      notes: 'House ad — Revista A. Beneficio: saber cuántos caballos jugar por carrera.',
    },
  },
  {
    key: 'revista-pase-b',
    emoji: '📖',
    label: 'Revista B',
    desc: 'Dolor: jugar por corazonada · verde',
    color: '#22c55e',
    form: {
      slug: 'house-revista-pase-b',
      brand: 'Desafío Hípico',
      targetUrl: PASE_URL,
      slots: ['revista_inline'],
      active: true, isHouseAd: true,
      startsAt: TODAY, endsAt: NEXT_90,
      badgeText: 'Pase Semanal',
      title: '¿Sigues jugando por corazonada? El algoritmo ya corrió los números',
      subtitle: 'FV + 5y6 VIP + diagnóstico por carrera · Pase Nacional Bs. 6.000',
      ctaText: 'Quiero el Pase →',
      logoUrl: '',
      accentColor: '#22c55e',
      notes: 'House ad — Revista B. Dolor: corazonada vs algoritmo.',
    },
  },
  // ── Resultados ────────────────────────────────────────────────────────────
  {
    key: 'result-pase-a',
    emoji: '🏆',
    label: 'Resultados A',
    desc: 'Dolor: "era obvio" post-carrera · dorado',
    color: '#D4AF37',
    form: {
      slug: 'house-result-pase-a',
      brand: 'Desafío Hípico',
      targetUrl: PASE_URL,
      slots: ['resultados_inline'],
      active: true, isHouseAd: true,
      startsAt: TODAY, endsAt: NEXT_90,
      badgeText: 'El FV lo vio venir',
      title: 'El ganador estaba en el Top 3 del FV. ¿Lo tenías?',
      subtitle: 'Para que la próxima no te pase · Pase Nacional Bs. 6.000/semana',
      ctaText: 'Activar mi Pase →',
      logoUrl: '',
      accentColor: '#D4AF37',
      notes: 'House ad — Resultados A. Dolor: el ganador era obvio y no lo tenías.',
    },
  },
  {
    key: 'result-pase-b',
    emoji: '🏆',
    label: 'Resultados B',
    desc: 'Dolor: batacazo no detectado · verde',
    color: '#22c55e',
    form: {
      slug: 'house-result-pase-b',
      brand: 'Desafío Hípico',
      targetUrl: PASE_URL,
      slots: ['resultados_inline'],
      active: true, isHouseAd: true,
      startsAt: TODAY, endsAt: NEXT_90,
      badgeText: 'El batacazo se avisó',
      title: 'El FV marcó esta carrera como Alerta antes de correrse',
      subtitle: 'Diagnóstico de riesgo en cada carrera · Pase Nacional Bs. 6.000',
      ctaText: 'Quiero esas alertas →',
      logoUrl: '',
      accentColor: '#22c55e',
      notes: 'House ad — Resultados B. Dolor: batacazo que nadie vio venir.',
    },
  },
  // ── Traqueos ──────────────────────────────────────────────────────────────
  {
    key: 'traqueos-pase',
    emoji: '⏱',
    label: 'Traqueos',
    desc: 'Beneficio: análisis completo · dorado',
    color: '#D4AF37',
    form: {
      slug: 'house-traqueos-pase',
      brand: 'Desafío Hípico',
      targetUrl: PASE_URL,
      slots: ['traqueos_inline'],
      active: true, isHouseAd: true,
      startsAt: TODAY, endsAt: NEXT_90,
      badgeText: 'Análisis completo',
      title: 'Ya tienes los trabajos — te falta el orden de llegada',
      subtitle: 'Traqueos + FV = la jugada completa · Pase Nacional Bs. 6.000',
      ctaText: 'Completar mi análisis →',
      logoUrl: '',
      accentColor: '#D4AF37',
      notes: 'House ad — Traqueos. Beneficio: combinar trabajos con el FV.',
    },
  },
  // ── Globales (header + sticky) ────────────────────────────────────────────
  {
    key: 'global-header',
    emoji: '🖥️',
    label: 'Cabecera Global',
    desc: 'Dolor+prueba · dorado · todas las páginas',
    color: '#D4AF37',
    form: {
      slug: 'house-global-header',
      brand: 'Desafío Hípico',
      targetUrl: PASE_URL,
      slots: ['header_leaderboard'],
      active: true, isHouseAd: true,
      startsAt: TODAY, endsAt: NEXT_90,
      badgeText: '👑 Pase Nacional',
      title: '79.9% acierta el Top 3 del FV',
      subtitle: 'Deja de jugar a ciegas · Bs. 6.000/semana',
      ctaText: 'Activar →',
      logoUrl: '',
      accentColor: '#D4AF37',
      notes: 'House ad — Cabecera global. Prueba estadística + dolor.',
    },
  },
  {
    key: 'global-sticky',
    emoji: '📱',
    label: 'Sticky Mobile',
    desc: 'Urgencia · verde · barra inferior móvil',
    color: '#22c55e',
    form: {
      slug: 'house-global-sticky',
      brand: 'Desafío Hípico',
      targetUrl: PASE_URL,
      slots: ['sticky_mobile'],
      active: true, isHouseAd: true,
      startsAt: TODAY, endsAt: NEXT_90,
      badgeText: 'Pase Nacional',
      title: '¿Vas a jugar a ciegas hoy?',
      subtitle: 'El FV ya calculó · Bs. 6.000',
      ctaText: 'Activar →',
      logoUrl: '',
      accentColor: '#22c55e',
      notes: 'House ad — Sticky mobile. Urgencia + facilidad de activación.',
    },
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function brandToSlug(brand: string): string {
  return brand
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function emptyForm(): FormState {
  return {
    slug: '', brand: '', targetUrl: '', slots: [],
    active: true, isHouseAd: false,
    startsAt: TODAY, endsAt: NEXT_30,
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

function ctrStr(imp: number, clk: number): string {
  if (!imp) return '—';
  return `${((clk / imp) * 100).toFixed(1)}%`;
}

function fmtN(n: number): string {
  return n.toLocaleString('es-VE');
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CampaignTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Modal state
  const [editing, setEditing] = useState<Campaign | null | 'new'>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [slotOpen, setSlotOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Track whether the user manually typed the slug (to stop auto-fill)
  const slugManual = useRef(false);

  // ── Load ────────────────────────────────────────────────────────────────────
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

  // ── Auto-generate slug from brand name (only in "new" mode, only if not manually edited) ──
  useEffect(() => {
    if (editing !== 'new') return;
    if (slugManual.current) return;
    if (!form.brand.trim()) return;
    setForm(p => ({ ...p, slug: brandToSlug(p.brand) }));
  }, [form.brand, editing]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function flash(type: 'ok' | 'err', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  // ── Toggle active ────────────────────────────────────────────────────────────
  async function toggleActive(c: Campaign) {
    setBusy(c.slug);
    const r = await fetch('/api/admin/sponsors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: c.slug, active: !c.active }),
    });
    if (r.ok) {
      setCampaigns(prev => prev.map(x => x.slug === c.slug ? { ...x, active: !x.active } : x));
      flash('ok', `"${c.brand}" ${!c.active ? 'activada ✅' : 'pausada ⏸'}`);
    } else {
      flash('err', 'Error al cambiar estado');
    }
    setBusy(null);
  }

  // ── Open modal ───────────────────────────────────────────────────────────────
  function openEdit(c: Campaign) {
    slugManual.current = true; // editing existing: don't auto-change slug
    setForm({
      slug: c.slug,
      brand: c.brand,
      targetUrl: c.targetUrl,
      slots: c.slots,
      active: c.active,
      isHouseAd: !!(c as any).isHouseAd,
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
    slugManual.current = false;
    setForm(emptyForm());
    setEditing('new');
    setSlotOpen(false);
  }

  function applyTemplate(t: typeof TEMPLATES_1XBET[number]) {
    slugManual.current = true; // template sets slug explicitly
    setForm({ ...t.form });
    setSlotOpen(false);
  }

  function closeModal() { setEditing(null); setSlotOpen(false); }

  // ── Sincronizar house ads: crea las faltantes y actualiza el creative de las
  // existentes. Preserva active / fechas / notas que hayas ajustado a mano.
  async function seedHouseAds() {
    setSeeding(true);
    let created = 0, updated = 0, failed = 0;
    for (const t of TEMPLATES_HOUSE) {
      const f = t.form;
      const exists = existingSlugs.includes(f.slug);
      const body = exists
        ? {
            // Sync ligero: solo copy/creative + destino + slots — no toca
            // active, startsAt, endsAt ni notes que el usuario pudo ajustar.
            slug: f.slug,
            targetUrl: f.targetUrl,
            slots: f.slots,
            isHouseAd: f.isHouseAd,
            creative: {
              badgeText: f.badgeText,
              title: f.title,
              subtitle: f.subtitle,
              ctaText: f.ctaText,
              logoUrl: f.logoUrl,
              accentColor: f.accentColor,
            },
          }
        : {
            slug: f.slug,
            brand: f.brand,
            targetUrl: f.targetUrl,
            slots: f.slots,
            active: f.active,
            isHouseAd: f.isHouseAd,
            startsAt: f.startsAt || undefined,
            endsAt: f.endsAt || undefined,
            creative: {
              badgeText: f.badgeText,
              title: f.title,
              subtitle: f.subtitle,
              ctaText: f.ctaText,
              logoUrl: f.logoUrl,
              accentColor: f.accentColor,
            },
            notes: f.notes,
          };
      try {
        const r = await fetch('/api/admin/sponsors', {
          method: exists ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (r.ok) exists ? updated++ : created++; else failed++;
      } catch { failed++; }
    }
    flash(
      failed ? 'err' : 'ok',
      `House ads: ${created} creadas · ${updated} sincronizadas${failed ? ` · ${failed} fallaron` : ''}`
    );
    setSeeding(false);
    load();
  }

  // ── Eliminar campaña ─────────────────────────────────────────────────────────
  async function removeCampaign(slug: string, brand: string) {
    if (!window.confirm(`¿Eliminar la campaña "${brand}" (${slug})? Las estadísticas históricas se conservan.`)) return;
    const r = await fetch(`/api/admin/sponsors?slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
    if (r.ok) {
      flash('ok', 'Campaña eliminada ✅');
      load();
    } else {
      const e = await r.json().catch(() => ({}));
      flash('err', e.error ?? 'Error al eliminar');
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function save() {
    if (!form.slug.trim() || !form.brand.trim() || !form.targetUrl.trim() || !form.title.trim()) {
      flash('err', 'Faltan campos obligatorios: nombre del anunciante, URL y título del banner');
      return;
    }
    if (!/^https?:\/\//.test(form.targetUrl) && !form.targetUrl.startsWith('/')) {
      flash('err', 'URL destino debe empezar con https:// o / (ruta interna)');
      return;
    }
    setBusy('save');
    const body = {
      slug: form.slug.toLowerCase().trim(),
      brand: form.brand.trim(),
      targetUrl: form.targetUrl.trim(),
      slots: form.slots,
      active: form.active,
      isHouseAd: form.isHouseAd,
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

  // ── Form helpers ─────────────────────────────────────────────────────────────
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

  const existingSlugs = campaigns.map(c => c.slug);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">📢 Campañas Publicitarias</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cada campaña es un anunciante activo en la web. Puedes pausarla o activarla al instante.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={seedHouseAds}
            disabled={seeding}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
            title="Crea las house ads faltantes y sincroniza el copy de las existentes — preserva tu configuración de fechas/activación"
          >
            {seeding ? '⏳ Sincronizando...' : '🏠 Sincronizar House Ads'}
          </button>
          <button
            onClick={openNew}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-yellow-500 hover:bg-yellow-400 text-black transition-colors"
          >
            + Nueva Campaña
          </button>
        </div>
      </div>

      {/* ── Flash ── */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-semibold border ${
          msg.type === 'ok'
            ? 'bg-green-950/50 border-green-700/50 text-green-300'
            : 'bg-red-950/50 border-red-700/50 text-red-300'
        }`}>{msg.text}</div>
      )}

      {/* ── Slot reference ── */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
        <p className="text-[10px] font-bold text-yellow-600 mb-2 uppercase tracking-widest">
          📐 Secciones disponibles (media kit)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SLOT_CATALOGUE.map(s => (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <span>{s.icon}</span>
              <div>
                <p className="font-semibold text-white text-[11px]">{s.label}</p>
                <p className="text-gray-600 font-mono text-[9px]">{s.page}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Campaign list ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-900 animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-sm">Sin campañas aún. Usa "Nueva Campaña" — hay plantillas de Publicidad Propia y 1xBET listas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const days = daysRemaining(c.endsAt);
            const isExpired = days !== null && days <= 0;
            const accent = c.creative.accentColor || '#00A8E8';
            const s = c.stats30d;

            return (
              <div key={c.slug}
                className={`rounded-2xl border p-4 transition-all ${
                  c.active && !isExpired ? 'border-gray-700 bg-gray-900' : 'border-gray-800 bg-gray-950 opacity-55'
                }`}
              >
                <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">

                  {/* Toggle */}
                  <button onClick={() => toggleActive(c)} disabled={busy === c.slug}
                    title={c.active ? 'Pausar' : 'Activar'}
                    className={`shrink-0 mt-0.5 w-10 h-6 rounded-full relative transition-colors ${
                      c.active ? 'bg-green-500' : 'bg-gray-700'
                    } ${busy === c.slug ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      c.active ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                      <span className="font-extrabold text-white text-sm">{c.brand}</span>
                      <span className="text-[10px] text-gray-600 font-mono bg-gray-800 px-1.5 py-0.5 rounded">
                        {c.slug}
                      </span>
                      {(c as any).isHouseAd && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950/50 border border-blue-700/50 text-blue-400 uppercase">
                          🏠 Propia
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-950/50 border border-red-700/50 text-red-400 uppercase">
                          Vencida
                        </span>
                      )}
                      {c.active && !isExpired && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-950/50 border border-green-700/50 text-green-400 uppercase">
                          Activa
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
                      {c.slots.length === 0 && <span className="text-[9px] text-yellow-600">⚠ Sin secciones asignadas</span>}
                    </div>

                    {/* Dates + creative preview */}
                    <p className="text-[10px] text-gray-600 mt-1">
                      {c.startsAt ? toLocalDate(c.startsAt) : '—'}
                      {' → '}
                      {c.endsAt ? toLocalDate(c.endsAt) : '∞'}
                      {days !== null && days > 0 && <span className="ml-2 text-yellow-600 font-semibold">({days}d restantes)</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">» {c.creative.title}</p>
                  </div>

                  {/* Stats + edit */}
                  <div className="shrink-0 text-right flex flex-col items-end gap-1">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-center">
                        <p className="font-black text-white">{fmtN(s.impressions)}</p>
                        <p className="text-[9px] text-gray-600 uppercase">Vistas</p>
                      </div>
                      <div className="text-center">
                        <p className="font-black text-white">{fmtN(s.clicks)}</p>
                        <p className="text-[9px] text-gray-600 uppercase">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className={`font-black ${
                          s.impressions > 0 && parseFloat(ctrStr(s.impressions, s.clicks)) > 2
                            ? 'text-green-400' : 'text-white'
                        }`}>
                          {ctrStr(s.impressions, s.clicks)}
                        </p>
                        <p className="text-[9px] text-gray-600 uppercase">CTR</p>
                      </div>
                    </div>
                    {Object.entries(s.bySlot).map(([sl, st]) => {
                      const info = SLOT_CATALOGUE.find(x => x.id === sl);
                      return (
                        <p key={sl} className="text-[9px] text-gray-700">
                          {info?.icon ?? '📌'} {st.impressions}i · {st.clicks}c · {st.ctr}%
                        </p>
                      );
                    })}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button onClick={() => openEdit(c)}
                        className="px-3 py-1 rounded-lg text-[10px] font-bold border border-gray-700 text-gray-400 hover:border-yellow-700/60 hover:text-yellow-400 transition-colors">
                        ✏️ Editar
                      </button>
                      <button onClick={() => removeCampaign(c.slug, c.brand)}
                        title="Eliminar campaña"
                        className="px-2 py-1 rounded-lg text-[10px] font-bold border border-gray-800 text-gray-600 hover:border-red-800/60 hover:text-red-400 transition-colors">
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════ MODAL ══════════════════════════════════════════ */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-gray-950 border border-gray-800 shadow-2xl">

            {/* Modal header */}
            <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-5 py-3.5 flex items-center justify-between">
              <h3 className="font-black text-white text-sm">
                {editing === 'new' ? '➕ Nueva Campaña' : `✏️ Editar — ${(editing as Campaign).brand}`}
              </h3>
              <button onClick={closeModal} className="text-gray-500 hover:text-white text-lg transition-colors">✕</button>
            </div>

            <div className="p-5 space-y-5">

              {/* ── Plantillas rápidas (solo en modo nuevo) ── */}
              {editing === 'new' && (
                <section className="space-y-4">
                  {/* House Ads — Publicidad Propia */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-blue-400 mb-2">
                      🏠 Publicidad Propia — Desafío Hípico (se ocultan a usuarios con Pase)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TEMPLATES_HOUSE.map(t => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => applyTemplate(t)}
                          className="flex flex-col items-start gap-1 rounded-xl p-2.5 border transition-all hover:brightness-110 text-left"
                          style={{ borderColor: `${t.color}55`, background: `${t.color}12` }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{t.emoji}</span>
                            <span className="text-[11px] font-black text-white leading-tight">{t.label}</span>
                          </div>
                          <p className="text-[9px] text-gray-500 leading-tight">{t.desc}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                            <span className="text-[8px] text-gray-600 font-mono">{t.form.slug}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[9px] text-gray-600">
                      Regla backfill: solo llenan slots SIN sponsor pago activo — cuando vendes el slot, desaparecen solas. Rotan aleatoriamente entre sí y se ocultan a usuarios con Pase. Botón "🏠 Sincronizar House Ads": crea las faltantes y actualiza el copy de las existentes sin tocar tu configuración.
                    </p>
                  </div>

                  {/* 1xBET Sponsor */}
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-600 mb-2">
                      ⚡ Sponsor externo — 1xBET A/B/C
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {TEMPLATES_1XBET.map(t => (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => applyTemplate(t)}
                          className="flex flex-col items-start gap-1 rounded-xl p-3 border transition-all hover:brightness-110 text-left"
                          style={{ borderColor: `${t.color}55`, background: `${t.color}12` }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{t.emoji}</span>
                            <span className="text-xs font-black text-white">{t.label}</span>
                          </div>
                          <p className="text-[10px] text-gray-500">{t.desc}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                            <span className="text-[9px] text-gray-600 font-mono">{t.form.slug}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[9px] text-gray-600">
                      Las 3 variantes comparten la misma URL de afiliado y rotan aleatoriamente para testing A/B/C.
                    </p>
                  </div>
                </section>
              )}

              {/* ── Anunciante ── */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-600">Anunciante</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombre del anunciante</label>
                    <input
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                      placeholder="ej. 1xBET, Betano, Codere"
                      {...F('brand')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      ID interno{' '}
                      <span className="text-gray-600">(se genera solo, no repetir)</span>
                    </label>
                    <input
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-yellow-600"
                      placeholder="ej. 1xbet-a"
                      disabled={editing !== 'new'}
                      value={form.slug}
                      onChange={e => {
                        slugManual.current = true;
                        setForm(p => ({ ...p, slug: e.target.value }));
                      }}
                    />
                    {/* Slugs en uso — visible solo al crear */}
                    {editing === 'new' && existingSlugs.length > 0 && (
                      <p className="text-[9px] text-gray-700 mt-0.5">
                        Ya en uso: {existingSlugs.map(s => (
                          <span key={s} className="font-mono text-gray-600 mr-1">{s}</span>
                        ))}
                      </p>
                    )}
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
                  <p className="text-[9px] text-gray-600 mt-0.5">
                    UTMs se añaden automáticamente · El click pasa primero por tu sistema de tracking
                  </p>
                </div>
              </section>

              {/* ── Dónde aparece ── */}
              <section className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-600">Dónde aparece</p>

                <button type="button" onClick={() => setSlotOpen(p => !p)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-sm text-gray-300 hover:border-yellow-700/60 transition-colors">
                  <span>
                    {form.slots.length === 0
                      ? 'Selecciona secciones...'
                      : `${form.slots.length} sección${form.slots.length > 1 ? 'es' : ''} seleccionada${form.slots.length > 1 ? 's' : ''}`}
                  </span>
                  <span className="text-gray-600">{slotOpen ? '▲' : '▼'}</span>
                </button>

                {slotOpen && (
                  <div className="rounded-xl border border-gray-700 bg-gray-900 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SLOT_CATALOGUE.map(s => (
                      <label key={s.id} className="flex items-center gap-2.5 cursor-pointer group">
                        <input type="checkbox" checked={form.slots.includes(s.id)}
                          onChange={() => toggleSlot(s.id)} className="w-3.5 h-3.5 accent-yellow-500" />
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
                <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-600">Período</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Fecha inicio</label>
                    <input type="date" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600" {...F('startsAt')} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Fecha fin</label>
                    <input type="date" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600" {...F('endsAt')} />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active}
                    onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-yellow-500" />
                  <span className="text-xs text-gray-300">
                    Activa — el banner aparece inmediatamente en la web al guardar
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isHouseAd}
                    onChange={e => setForm(p => ({ ...p, isHouseAd: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-blue-500" />
                  <span className="text-xs text-gray-400">
                    <span className="text-blue-400 font-bold">Publicidad Propia</span> — se oculta automáticamente a usuarios con Pase activo
                  </span>
                </label>
              </section>

              {/* ── Creative del banner ── */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-600">Diseño del banner</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Etiqueta badge</label>
                    <input className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                      placeholder="Sponsor Oficial" {...F('badgeText')} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Texto del botón</label>
                    <input className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                      placeholder="Reclamar Bono" {...F('ctaText')} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Color del anunciante</label>
                    <div className="flex items-center gap-2">
                      <input type="color"
                        className="w-10 h-9 rounded-lg border border-gray-700 bg-gray-900 cursor-pointer p-0.5"
                        value={form.accentColor}
                        onChange={e => setForm(p => ({ ...p, accentColor: e.target.value }))} />
                      <input className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-yellow-600"
                        placeholder="#00A8E8" {...F('accentColor')} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Título del banner</label>
                  <input className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                    placeholder="¡Dobla tu primer depósito hasta $130!" {...F('title')} />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Subtítulo</label>
                  <input className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600"
                    placeholder="Apuestas · Casino · Deportes · Código: DESAFIOVIP" {...F('subtitle')} />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Logo URL{' '}
                    <span className="text-gray-600">(opcional — si el anunciante tiene logo en línea)</span>
                  </label>
                  <input type="url"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-yellow-600"
                    placeholder="https://..." {...F('logoUrl')} />
                </div>
              </section>

              {/* ── Notas ── */}
              <section className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-600">Notas del contrato</p>
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-600 resize-none"
                  rows={2}
                  placeholder="Monto, contacto, condiciones, link de comisiones..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                />
              </section>

              {/* ── Actions ── */}
              <div className="flex items-center gap-3 pt-1 border-t border-gray-800">
                <button onClick={save} disabled={busy === 'save'}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black bg-yellow-500 hover:bg-yellow-400 text-black transition-colors disabled:opacity-50">
                  {busy === 'save' ? 'Guardando...' : editing === 'new' ? '✅ Crear campaña' : '✅ Guardar cambios'}
                </button>
                <button onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
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
