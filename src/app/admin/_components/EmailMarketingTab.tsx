'use client';

import { useState, useEffect, useCallback } from 'react';

const GOLD = '#D4AF37';

export default function EmailMarketingTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState<'wednesday' | 'thursday'>('wednesday');
  const [targetList, setTargetList] = useState<'active' | 'all_valid'>('active');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [variantIdx, setVariantIdx] = useState(0);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadData = useCallback(async (vIdx: number = 0) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/email-marketing?variant=${vIdx}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setTestEmail(prev => prev || json.adminEmail || '');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(0);
  }, [loadData]);

  useEffect(() => {
    if (!data) return;
    const draft = slot === 'wednesday' ? data.wednesday : data.thursday;
    if (draft) {
      setSubject(draft.subject ?? '');
      setHtml(draft.html ?? '');
    }
  }, [data, slot]);

  async function handleSyncBounces() {
    setBusyAction('sync');
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/email-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_bounces' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al sincronizar');
      setStatusMsg({
        type: 'ok',
        text: `✅ Lista sincronizada con Resend: ${json.suppressedCount} correos rebotados/baja excluidos de futuros envíos.`,
      });
      loadData(variantIdx);
    } catch (e) {
      setStatusMsg({ type: 'err', text: e instanceof Error ? e.message : 'Error' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRegenerateAi() {
    setBusyAction('ai');
    setStatusMsg(null);
    try {
      const nextVar = (variantIdx + 1) % 4;
      setVariantIdx(nextVar);
      const res = await fetch('/api/admin/email-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_ai', slot }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al regenerar');
      setSubject(json.subject);
      setHtml(json.html);
      setStatusMsg({
        type: 'ok',
        text: '✨ Nuevo título y redacción generados con los datos reales de la reunión.',
      });
    } catch (e) {
      setStatusMsg({ type: 'err', text: e instanceof Error ? e.message : 'Error' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSendTest() {
    setBusyAction('test');
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/email-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_test', testEmail, subject, html }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al enviar prueba');
      setStatusMsg({
        type: 'ok',
        text: `📨 Correo de prueba enviado a ${json.sentTo}. Revísalo antes de disparar a la lista.`,
      });
    } catch (e) {
      setStatusMsg({ type: 'err', text: e instanceof Error ? e.message : 'Error' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSendCampaign() {
    const count =
      targetList === 'active'
        ? data?.lists?.activeListCount ?? 0
        : data?.lists?.allValidCount ?? 0;
    if (
      !confirm(
        `¿Enviar ahora "${subject}" a ${count} usuarios de la lista ${
          targetList === 'active' ? 'Activos (recomendada)' : 'Completa Válida'
        }?`
      )
    ) {
      return;
    }
    setBusyAction('send');
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/email-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_campaign', slot, targetList, subject, html }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error al enviar campaña');
      setStatusMsg({
        type: 'ok',
        text: `🚀 Campaña enviada con éxito a ${json.sentCount} destinatarios.`,
      });
      loadData(variantIdx);
    } catch (e) {
      setStatusMsg({ type: 'err', text: e instanceof Error ? e.message : 'Error' });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleToggleAuto(enabled: boolean) {
    const res = await fetch('/api/admin/email-marketing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_auto', enabled }),
    });
    if (res.ok) {
      setData((prev: any) => (prev ? { ...prev, autoModeEnabled: enabled } : prev));
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 rounded-2xl bg-gray-900 animate-pulse" />
        ))}
      </div>
    );
  }

  const ctx = data?.context ?? {};
  const lists = data?.lists ?? {};
  const activeDraft = slot === 'wednesday' ? data?.wednesday : data?.thursday;

  return (
    <div className="space-y-6">
      {/* 1. Estado de la Jornada y Listas */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>📧</span>
              <span>Plan Semanal de Email Marketing (Miércoles Mañana + Jueves Tarde)</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              2 envíos estratégicos por semana basados en datos reales de MongoDB, con filtro anti-rebote y aprobación previa.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSyncBounces}
              disabled={busyAction !== null}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700"
            >
              {busyAction === 'sync' ? 'Sincronizando...' : '🧹 Limpiar Bounces de Resend'}
            </button>

            <label className="flex items-center gap-2 text-xs bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(data?.autoModeEnabled)}
                onChange={e => handleToggleAuto(e.target.checked)}
                className="accent-yellow-500"
              />
              <span className="font-bold text-gray-300">
                ⚡ Envío Automático: {data?.autoModeEnabled ? 'ACTIVO' : 'PAUSADO (Revisión Manual)'}
              </span>
            </label>
          </div>
        </div>

        {/* Semáforo de validación de jornada cargada */}
        <div
          className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3 flex-wrap ${
            ctx.hasUpcomingMeetingLoaded
              ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
              : 'bg-red-950/40 border-red-700/60 text-red-200'
          }`}
        >
          <div className="text-xs space-y-0.5">
            <p className="font-extrabold">
              {ctx.hasUpcomingMeetingLoaded
                ? `✅ Jornada Cargada Verificada: Reunión ${ctx.upcomingMeetingNumber} (${ctx.upcomingDate}) · ${ctx.upcomingTotalRaces} carreras · ${ctx.upcomingForecastersCount} pronosticadores`
                : '⚠️ Aún NO hay jornada futura sin resultados cargada en La Rinconada'}
            </p>
            <p className="text-[11px] opacity-80">
              {ctx.hasUpcomingMeetingLoaded
                ? `Último resultado auditado: Reunión ${ctx.lastMNum} (Dividendo 5y6: Bs. ${ctx.lastPayout6}). El sistema está listo para enviar.`
                : 'El bloqueo de seguridad impide enviar el Correo #1 hasta que subas el PDF de inscritos del martes en la noche.'}
            </p>
          </div>
        </div>

        {/* Las 3 Listas en Vivo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setTargetList('active')}
            className={`text-left rounded-xl p-3.5 border transition-all ${
              targetList === 'active'
                ? 'bg-emerald-950/30 border-emerald-500 text-white'
                : 'bg-gray-950 border-gray-800 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-400">🟢 Lista 1: Activos y Compradores</span>
              <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-950 text-emerald-300">
                Recomendada
              </span>
            </div>
            <p className="text-xl font-black text-white mt-1">
              {(lists.activeListCount ?? 0).toLocaleString('es-VE')} usuarios
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Entraron en los últimos 60 días, tienen saldo o son nuevos (máxima apertura, cuida tu dominio).
            </p>
          </button>

          <button
            type="button"
            onClick={() => setTargetList('all_valid')}
            className={`text-left rounded-xl p-3.5 border transition-all ${
              targetList === 'all_valid'
                ? 'bg-yellow-950/30 border-yellow-500 text-white'
                : 'bg-gray-950 border-gray-800 text-gray-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-yellow-400">🟡 Lista 2: Audiencia Completa Limpia</span>
              <span className="text-[10px] text-gray-500">1 vez al mes</span>
            </div>
            <p className="text-xl font-black text-white mt-1">
              {(lists.allValidCount ?? 0).toLocaleString('es-VE')} usuarios
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Todos los correos válidos de tu base de datos (excluyendo rebotados y bajas).
            </p>
          </button>

          <div className="rounded-xl p-3.5 border bg-gray-950 border-gray-800">
            <span className="text-xs font-extrabold text-red-400">🔴 Lista 3: Suprimidos (Bounces / Bajas)</span>
            <p className="text-xl font-black text-white mt-1">
              {(lists.suppressedCount ?? 0).toLocaleString('es-VE')} excluidos
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate">
              {lists.sampleSuppressed?.length
                ? lists.sampleSuppressed.slice(0, 3).join(', ')
                : 'Toca "Limpiar Bounces de Resend" para sincronizar'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Selector de los 2 Correos de la Semana + Editor y Envío de Prueba */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3">
          <button
            type="button"
            onClick={() => setSlot('wednesday')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold border transition-all ${
              slot === 'wednesday'
                ? 'bg-yellow-500 text-black border-yellow-500'
                : 'bg-gray-950 text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            📩 Correo #1 · Miércoles Mañana (8:30–10:00 am) — Balance Domingo + Inscritos y Fase 1 Gratis
          </button>
          <button
            type="button"
            onClick={() => setSlot('thursday')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold border transition-all ${
              slot === 'thursday'
                ? 'bg-yellow-500 text-black border-yellow-500'
                : 'bg-gray-950 text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            👑 Correo #2 · Jueves Tarde (4:00–6:00 pm) — 1 Dato Regalo FV + Alertas + Venta Pase Bs. 6.000
          </button>
        </div>

        {activeDraft?.alreadySentAt && (
          <div className="bg-blue-950/40 border border-blue-700/50 rounded-xl px-3.5 py-2 text-xs text-blue-200">
            ℹ️ Este correo ya fue enviado para esta reunión el{' '}
            <strong>{new Date(activeDraft.alreadySentAt).toLocaleString('es-VE')}</strong>.
          </div>
        )}

        {statusMsg && (
          <div
            className={`rounded-xl px-4 py-2.5 text-xs font-bold border ${
              statusMsg.type === 'ok'
                ? 'bg-green-950/50 border-green-600 text-green-300'
                : 'bg-red-950/50 border-red-600 text-red-300'
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Columna Izquierda: Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300">Título / Asunto del Correo</label>
              <button
                type="button"
                onClick={handleRegenerateAi}
                disabled={busyAction !== null}
                className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700"
              >
                {busyAction === 'ai' ? 'Redactando...' : '✨ Cambiar Estilo / Redactar con IA'}
              </button>
            </div>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white"
            />

            <label className="block text-xs font-bold text-gray-300 pt-1">
              Contenido HTML (Puedes ajustar cualquier texto antes de enviar)
            </label>
            <textarea
              rows={12}
              value={html}
              onChange={e => setHtml(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs font-mono text-gray-300"
            />

            {/* Botonera de Prueba y Disparo */}
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="Tu correo para recibir la prueba..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleSendTest}
                  disabled={busyAction !== null}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-gray-800 hover:bg-gray-700 text-yellow-300 border border-yellow-600/40 shrink-0"
                >
                  {busyAction === 'test' ? 'Enviando...' : '🧪 Enviarme Prueba'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSendCampaign}
                disabled={busyAction !== null || !ctx.hasUpcomingMeetingLoaded}
                className="w-full py-3 rounded-xl text-sm font-black text-black shadow-lg disabled:opacity-40 transition-all"
                style={{ backgroundColor: GOLD }}
              >
                {busyAction === 'send'
                  ? 'Enviando por lotes...'
                  : `🚀 Enviar Ahora a ${
                      targetList === 'active'
                        ? `Lista Activos (${lists.activeListCount ?? 0})`
                        : `Audiencia Válida (${lists.allValidCount ?? 0})`
                    }`}
              </button>
            </div>
          </div>

          {/* Columna Derecha: Vista Previa en Vivo */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-gray-400">
              👁️ Vista Previa Real (Así lo verá el usuario en su teléfono/correo)
            </span>
            <div
              className="rounded-2xl border border-gray-800 bg-black p-3 overflow-auto max-h-[540px]"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
