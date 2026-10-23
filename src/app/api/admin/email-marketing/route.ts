import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Track from '@/models/Track';
import Forecast from '@/models/Forecast';
import SiteConfig, { getSiteConfig } from '@/models/SiteConfig';
import { getFvLabAnalytics } from '@/services/fvAccuracyService';
import { callLLM } from '@/services/ai/geminiProcessor';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isJunkEmail(email: string): boolean {
  const e = email.toLowerCase().trim();
  if (!EMAIL_REGEX.test(e)) return true;
  if (/@(mailinator|tempmail|10minutemail|guerrillamail|yopmail|sharklasers)\./.test(e)) return true;
  return false;
}

function buildEmailHtmlWrapper(bodyParagraphsHtml: string, ctaText: string, ctaUrl: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px 22px;background:#0c0c0e;color:#f3f4f6;border-radius:16px;border:1px solid #27272a">
  <div style="border-bottom:1px solid #27272a;padding-bottom:14px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between">
    <span style="font-size:16px;font-weight:900;color:#D4AF37;letter-spacing:0.03em">🏇 DESAFÍO HÍPICO</span>
    <span style="font-size:11px;color:#9ca3af">Inteligencia Hípica Venezolana</span>
  </div>
  <div style="font-size:14px;line-height:1.65;color:#e5e7eb">
    ${bodyParagraphsHtml}
  </div>
  <div style="text-align:center;margin:26px 0 18px">
    <a href="${ctaUrl}" style="display:inline-block;background:#D4AF37;color:#000000;font-weight:900;font-size:14px;padding:13px 28px;border-radius:12px;text-decoration:none">
      ${ctaText}
    </a>
  </div>
  <div style="border-top:1px solid #27272a;padding-top:14px;margin-top:22px;font-size:11px;color:#6b7280;text-align:center">
    Recibes este boletín porque estás registrado en desafiohipico.com.<br/>
    <a href="https://www.desafiohipico.com/perfil" style="color:#9ca3af;text-decoration:underline">Gestionar cuenta</a>
    &nbsp;·&nbsp;
    <a href="{{UNSUB_URL}}" style="color:#9ca3af;text-decoration:underline">Darte de baja de estos correos</a>
  </div>
</div>`;
}

async function buildCampaignContext(styleVariant: number = 0) {
  const lab = await getFvLabAnalytics('rinconada', 2026);
  const lastBt = lab?.fiveAndSixBacktest?.meetings?.[0] ?? null;
  const upcoming = lab?.upcomingFiveAndSix ?? null;

  // Check if there is truly an upcoming meeting with pending results (new week loaded)
  const track = (await Track.findOne({ name: /rinconada/i }).lean()) as any;
  let hasUpcomingMeetingLoaded = false;
  let upcomingMeetingNumber = upcoming?.meetingNumber ?? 0;
  let upcomingDate = upcoming?.date ?? '';
  let upcomingTotalRaces = 0;
  let upcomingForecastersCount = 0;

  if (track) {
    const latestMeeting = (await Meeting.findOne({ trackId: track._id })
      .sort({ date: -1 })
      .lean()) as any;
    if (latestMeeting) {
      const mRaces = (await Race.find({ meetingId: latestMeeting._id })
        .select('_id hasResults')
        .lean()) as any[];
      const hasPending = mRaces.length >= 6 && mRaces.some(r => !r.hasResults);
      if (hasPending) {
        hasUpcomingMeetingLoaded = true;
        upcomingMeetingNumber = latestMeeting.meetingNumber ?? 0;
        upcomingDate = latestMeeting.date ? new Date(latestMeeting.date).toISOString().slice(0, 10) : '';
        upcomingTotalRaces = mRaces.length;
        const rIds = mRaces.map(r => r._id);
        const fcs = (await Forecast.find({ raceId: { $in: rIds }, isPublished: true })
          .select('handicapperId')
          .lean()) as any[];
        const uniqueH = new Set(fcs.map(f => String(f.handicapperId)));
        upcomingForecastersCount = uniqueH.size;
      }
    }
  }

  // Extract last Sunday real results
  const lastMNum = lastBt?.meetingNumber ?? 41;
  const lastPayout6 = lastBt?.payout6Bs ? Math.round(lastBt.payout6Bs).toLocaleString('es-VE') : '9.363.331';
  const lastTop5Count =
    lastBt?.validas?.filter(v => {
      const rk = v.winner?.fullFvRank ?? v.winner?.fvRank ?? null;
      return rk !== null && rk <= 5;
    }).length ?? 6;
  const lastTop3Count =
    lastBt?.validas?.filter(v => {
      const rk = v.winner?.fullFvRank ?? v.winner?.fvRank ?? null;
      return rk !== null && rk <= 3;
    }).length ?? 4;

  // Upcoming Fase 1 & Gift Race
  const validasUp = upcoming?.validas ?? [];
  const explosiveValidas = validasUp.filter(v => v.preFvLevel === 'explosivo');
  const nobleValidas = validasUp.filter(v => v.preFvLevel === 'noble');
  const cleanCutValida =
    validasUp.find(v => v.factors?.some(f => f.id === 'corte_limpio' && f.active)) ?? validasUp[0];
  const giftHorses =
    cleanCutValida?.picksEco
      ?.slice(0, 2)
      .map(h => `#${h.dorsalNumber ?? '?'} ${h.horseName}`)
      .join(' + ') ?? 'Disponible en la 1ª y 2ª carrera abiertas';

  const vIdx = ((upcomingMeetingNumber || lastMNum) + styleVariant) % 4;

  // ── EMAIL 1: MIÉRCOLES EN LA MAÑANA (Balance Domingo + Inscritos Nuevos + Fase 1) ──
  const wedSubjects = [
    `🏇 Reunión ${upcomingMeetingNumber || lastMNum + 1} cargada en La Rinconada + lo que dejó el 5y6 de Bs. ${lastPayout6}`,
    `📊 Los ${lastTop5Count} ganadores estuvieron en el Top 5 FV (y ya están los inscritos de la R${upcomingMeetingNumber || lastMNum + 1})`,
    `🔥 Inscritos y Traqueos de la Reunión ${upcomingMeetingNumber || lastMNum + 1}: ojo con ${explosiveValidas.length || 3} válidas de este domingo`,
    `⚡ Radiografía de la R${lastMNum} (Bs. ${lastPayout6}) y programa oficial de este domingo en Caracas`,
  ];

  const wedBody = `
    <p style="margin:0 0 14px">Hola hípico,</p>
    <p style="margin:0 0 14px">
      Antes de entrar en la nueva jornada, mira el dato real que nos dejó la <strong>Reunión ${lastMNum}</strong> este domingo en La Rinconada (donde el 5y6 pagó <strong>Bs. ${lastPayout6}</strong> con 6 aciertos):
    </p>
    <div style="background:#18181b;border-left:3px solid #D4AF37;padding:12px 14px;border-radius:8px;margin:0 0 16px">
      <strong>📌 Balance transparente del Factor de Victoria (Reunión ${lastMNum}):</strong><br/>
      • <strong>${lastTop5Count} de los 6 ganadores del 5y6</strong> estuvieron dentro del Top 5 del Factor de Victoria (${lastTop3Count} dentro de las 3 primeras marcas).<br/>
      • Las únicas sorpresas que dispararon el dividendo salieron exactamente en las válidas que tenían encendidos <strong>3 o más Indicadores de Peligro</strong> en nuestro radar (carreras sin favorito de +40% o lotes de 10+ ejemplares).
    </div>
    <p style="margin:0 0 14px">
      <strong>🚨 Ya está cargada la Reunión ${upcomingMeetingNumber || lastMNum + 1} de este domingo:</strong><br/>
      Ya puedes consultar <strong>100% gratis</strong> en la web los <strong>Inscritos Oficiales, la Revista Digital y los Traqueos</strong>. Además, nuestro clasificador de Fase 1 (por lote, edad, distancia y cantidad de inscritos) ya detectó <strong>${explosiveValidas.length || 3} válidas con Alerta de Lote Explosivo</strong> y <strong>${nobleValidas.length || 2} válidas en Lote Noble</strong>.
    </p>
  `;

  // ── EMAIL 2: JUEVES EN LA TARDE (Regalo de Prueba + Alertas + Pase Semanal Bs. 6.000) ──
  const thuSubjects = [
    `🔓 Regalo del Factor de Victoria para la R${upcomingMeetingNumber || lastMNum + 1} + ${explosiveValidas.length || 3} alertas activas en el 5y6`,
    `🎯 Candado adelantado de la Reunión ${upcomingMeetingNumber || lastMNum + 1} (y las válidas donde se activó la alerta de batacazo)`,
    `👑 Así marca el Factor de Victoria hoy jueves para este domingo en La Rinconada`,
    `⚠️ Ojo antes de sellar la R${upcomingMeetingNumber || lastMNum + 1}: 1 dato abierto + el diagnóstico de las 6 válidas`,
  ];

  const thuBody = `
    <p style="margin:0 0 14px">Hola hípico,</p>
    <p style="margin:0 0 14px">
      Ya están cargados los primeros consensos del <strong>Factor de Victoria</strong> para la <strong>Reunión ${upcomingMeetingNumber || lastMNum + 1}</strong> de este domingo (y recuerda que en la web tienes abiertas gratis la <strong>1ª y 2ª carrera</strong> para que pruebes el sistema en vivo).
    </p>
    <div style="background:#18181b;border:1px solid #D4AF37;padding:14px;border-radius:12px;margin:0 0 16px">
      <div style="font-size:11px;font-weight:800;color:#D4AF37;text-transform:uppercase;margin-bottom:4px">🎁 Adelanto Abierto del Algoritmo</div>
      <strong>${cleanCutValida ? `${cleanCutValida.validaNumber}ª Válida (Carrera ${cleanCutValida.raceNumber} · ${cleanCutValida.distance}m):` : ' Selección Destacada:'}</strong><br/>
      Bloque líder actual en el Factor de Victoria: <strong style="color:#fde047">${giftHorses}</strong>.
    </div>
    <p style="margin:0 0 14px">
      <strong>🔍 ¿Qué pasa en el resto del 5y6 de este domingo?</strong><br/>
      Nuestro detector encendió <strong>3 o más Disparadores de Peligro</strong> en <strong>${explosiveValidas.length || 3} de las 6 válidas</strong> (donde históricamente cae el 78% de los favoritos y salen los dividendos millonarios).
    </p>
    <p style="margin:0 0 14px">
      Activa hoy tu <strong>Pase Semanal Nacional por Bs. 6.000</strong> (o el <strong>Pase Mensual por Bs. 20.000</strong>) y desbloquea automáticamente de lunes a domingo:<br/>
      ✅ <strong>Todas las carreras</strong> de La Rinconada y Valencia con el Factor de Victoria en vivo.<br/>
      ✅ <strong>La Leyenda de Disparadores</strong> arriba de cada carrera (para saber dónde jugar Línea, Candado o buscar el batacazo).<br/>
      ✅ <strong>El Cuadro 5y6 VIP del Algoritmo</strong> en el botón dorado flotante 👑.
    </p>
  `;

  return {
    hasUpcomingMeetingLoaded,
    upcomingMeetingNumber,
    upcomingDate,
    upcomingTotalRaces,
    upcomingForecastersCount,
    lastMNum,
    lastPayout6,
    lastTop5Count,
    wednesday: {
      subject: wedSubjects[vIdx],
      html: buildEmailHtmlWrapper(
        wedBody,
        '📖 Ver Inscritos, Revista y Traqueos Gratis →',
        'https://www.desafiohipico.com/pronosticos'
      ),
    },
    thursday: {
      subject: thuSubjects[vIdx],
      html: buildEmailHtmlWrapper(
        thuBody,
        '👑 Ver Carreras Abiertas y Activar Pase Semanal →',
        'https://www.desafiohipico.com/pronosticos'
      ),
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const roles: string[] = (session?.user as any)?.roles ?? [];
    if (!roles.includes('admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await dbConnect();
    void SiteConfig;

    const { searchParams } = new URL(req.url);
    const styleVariant = parseInt(searchParams.get('variant') ?? '0', 10) || 0;

    const suppressed = await getSiteConfig<string[]>('emailSuppressedList', []);
    const suppressedSet = new Set((suppressed ?? []).map(s => s.toLowerCase().trim()));
    const autoModeEnabled = await getSiteConfig<boolean>('emailAutoModeEnabled', false);
    const sentLog = await getSiteConfig<Record<string, string>>('emailCampaignSentLog', {});

    const allUsers = (await User.find({ email: { $exists: true, $ne: '' } })
      .select('email alias balance lastLoginDate createdAt unsubscribed')
      .lean()) as any[];

    const cutoff60d = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const cutoff30dMs = Date.now() - 30 * 24 * 3600 * 1000;

    let activeListCount = 0;
    let allValidCount = 0;

    for (const u of allUsers) {
      const em = (u.email ?? '').toLowerCase().trim();
      if (isJunkEmail(em) || suppressedSet.has(em) || u.unsubscribed === true) continue;
      allValidCount++;
      const isRecentLogin = u.lastLoginDate && u.lastLoginDate >= cutoff60d;
      const hasGolds = (u.balance?.golds ?? 0) > 0;
      const isNewUser = u.createdAt && new Date(u.createdAt).getTime() >= cutoff30dMs;
      if (isRecentLogin || hasGolds || isNewUser) {
        activeListCount++;
      }
    }

    const ctx = await buildCampaignContext(styleVariant);
    const wedKey = `wed_R${ctx.upcomingMeetingNumber}`;
    const thuKey = `thu_R${ctx.upcomingMeetingNumber}`;

    return NextResponse.json({
      adminEmail: session?.user?.email ?? '',
      lists: {
        activeListCount,
        allValidCount,
        suppressedCount: suppressedSet.size,
        sampleSuppressed: [...suppressedSet].slice(0, 30),
      },
      autoModeEnabled: Boolean(autoModeEnabled),
      context: {
        hasUpcomingMeetingLoaded: ctx.hasUpcomingMeetingLoaded,
        upcomingMeetingNumber: ctx.upcomingMeetingNumber,
        upcomingDate: ctx.upcomingDate,
        upcomingTotalRaces: ctx.upcomingTotalRaces,
        upcomingForecastersCount: ctx.upcomingForecastersCount,
        lastMNum: ctx.lastMNum,
        lastPayout6: ctx.lastPayout6,
      },
      wednesday: {
        ...ctx.wednesday,
        alreadySentAt: sentLog?.[wedKey] ?? null,
      },
      thursday: {
        ...ctx.thursday,
        alreadySentAt: sentLog?.[thuKey] ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const roles: string[] = (session?.user as any)?.roles ?? [];
    if (!roles.includes('admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await dbConnect();
    void SiteConfig;

    const body = await req.json();
    const { action } = body;
    const resendKey = process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY;

    // 1. Toggle Auto Mode
    if (action === 'toggle_auto') {
      const enabled = Boolean(body.enabled);
      await SiteConfig.findOneAndUpdate(
        { key: 'emailAutoModeEnabled' },
        { $set: { value: enabled } },
        { upsert: true }
      );
      return NextResponse.json({ ok: true, autoModeEnabled: enabled });
    }

    // 2. Sync & Clean Bounced / Unsubscribed from Resend
    if (action === 'sync_bounces') {
      if (!resendKey) return NextResponse.json({ error: 'Falta AUTH_RESEND_KEY' }, { status: 400 });
      const headers = { Authorization: `Bearer ${resendKey}` };
      const existing = await getSiteConfig<string[]>('emailSuppressedList', []);
      const set = new Set((existing ?? []).map(s => s.toLowerCase().trim()));
      let removedFromAudiences = 0;

      // Check recent emails for bounced/complained
      const emRes = await fetch('https://api.resend.com/emails?limit=100', { headers })
        .then(r => r.json())
        .catch(() => ({ data: [] }));
      for (const e of emRes?.data ?? []) {
        if (e.last_event === 'bounced' || e.last_event === 'complained') {
          for (const addr of e.to ?? []) set.add(String(addr).toLowerCase().trim());
        }
      }

      // Check all audiences for unsubscribed contacts
      const audRes = await fetch('https://api.resend.com/audiences', { headers })
        .then(r => r.json())
        .catch(() => ({ data: [] }));
      for (const aud of audRes?.data ?? []) {
        const cRes = await fetch(`https://api.resend.com/audiences/${aud.id}/contacts`, { headers })
          .then(r => r.json())
          .catch(() => ({ data: [] }));
        for (const c of cRes?.data ?? []) {
          if (c.unsubscribed && c.email) {
            set.add(String(c.email).toLowerCase().trim());
          }
        }
      }

      const updatedList = [...set];
      await SiteConfig.findOneAndUpdate(
        { key: 'emailSuppressedList' },
        { $set: { value: updatedList } },
        { upsert: true }
      );

      return NextResponse.json({
        ok: true,
        suppressedCount: updatedList.length,
        removedFromAudiences,
        sampleSuppressed: updatedList.slice(0, 30),
      });
    }

    // 2b. Manual opt-out / re-activation — when a user asks to be removed by email/WhatsApp
    if (action === 'add_suppression' || action === 'remove_suppression') {
      const em = String(body.email ?? '').toLowerCase().trim();
      if (!EMAIL_REGEX.test(em)) {
        return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
      }
      const existing = await getSiteConfig<string[]>('emailSuppressedList', []);
      const set = new Set((existing ?? []).map(s => s.toLowerCase().trim()));
      const adding = action === 'add_suppression';
      if (adding) set.add(em); else set.delete(em);
      await SiteConfig.findOneAndUpdate(
        { key: 'emailSuppressedList' },
        { $set: { value: [...set] } },
        { upsert: true }
      );
      // Keep the user's marketing flag in sync both ways
      await User.updateOne({ email: em }, { $set: { unsubscribed: adding } });
      return NextResponse.json({ ok: true, email: em, suppressed: adding, suppressedCount: set.size });
    }

    // 3. Regenerate with AI (persuasive copywriter — preserves the template's HTML structure)
    if (action === 'regenerate_ai') {
      const slot: 'wednesday' | 'thursday' = body.slot === 'thursday' ? 'thursday' : 'wednesday';
      const ctx = await buildCampaignContext(0);
      const customContext = String(body.customContext ?? '').trim().slice(0, 1000);
      const fallback = slot === 'wednesday' ? ctx.wednesday : ctx.thursday;

      const facts =
        slot === 'wednesday'
          ? `- El domingo pasado en la Reunión ${ctx.lastMNum} de La Rinconada el 5y6 pagó Bs. ${ctx.lastPayout6} y ${ctx.lastTop5Count} de los 6 ganadores estuvieron en el Top 5 del Factor de Victoria.
- Ya está cargada gratis en la web la Reunión ${ctx.upcomingMeetingNumber || ctx.lastMNum + 1} de este domingo con Inscritos, Revista Digital, Traqueos y la alerta de Fase 1 por lotes.`
          : `- Para la Reunión ${ctx.upcomingMeetingNumber || ctx.lastMNum + 1} de este domingo en La Rinconada están abiertas gratis la 1ª y 2ª carrera en la web.
- El Algoritmo ya encendió alertas de batacazo en las válidas de lote grande/tiro corto.
- Invita a activar el Pase Semanal Nacional por Bs. 6.000 (o Pase Mensual por Bs. 20.000) que desbloquea todas las carreras, la Leyenda de Disparadores de cada carrera y el Cuadro 5y6 VIP en el botón dorado flotante.`;

      const prompt = `Eres un copywriter senior de email marketing persuasivo, especializado en hipismo venezolano.

MARCA: Desafío Hípico — plataforma digital líder del hipismo venezolano (La Rinconada y Valencia). Su ventaja es el "Factor de Victoria", un algoritmo propio de pronósticos.
TONO: cercano, experto, con urgencia honesta. Habla de "tú". Usa venezolanismos hípicos naturales (válidas, batacazo, línea, candado, dividendo, ejemplares). Nunca suenes a spam genérico.

DATOS REALES OBLIGATORIOS (NO inventes ningún dato fuera de estos):
${facts}
${customContext ? `
INSTRUCCIONES ADICIONALES DEL ADMINISTRADOR (tienen prioridad sobre el enfoque):
${customContext}
` : ''}
TU TAREA: Reescribe el email de referencia de abajo con copy más persuasivo.
REGLAS DE ESTRUCTURA (innegociables):
- MANTÉN intacta la estructura HTML: mismos divs contenedores, estilos inline, cajas destacadas con borde/acento dorado (#D4AF37), bullets con ✅ o •, negritas <strong>, el botón CTA con su href y el pie de página.
- El PIE DE PÁGINA es intocable: el texto "Recibes este boletín...", el enlace "Gestionar cuenta" y el enlace "Darte de baja de estos correos" con href="{{UNSUB_URL}}" deben quedar EXACTAMENTE igual — es un placeholder legal obligatorio, nunca lo elimines, lo muevas ni cambies ese href.
- Solo reescribe el TEXTO. Puedes ajustar emojis, y agregar UNA caja destacada o <strong> extra si mejora la venta, pero nunca elimines la caja dorada, el botón ni el footer.
- No agregues imágenes, links nuevos, ni datos que no estén en la lista.

Devuelve SOLO un JSON válido sin markdown: {"subject": "asunto corto y atractivo, máx 9 palabras, sin clickbait en mayúsculas", "html": "<HTML completo del email>"}

EMAIL DE REFERENCIA (estructura a preservar):
${fallback.html}`;

      try {
        const raw = await callLLM(prompt, {
          model: process.env.OPENROUTER_EMAIL_MODEL ?? 'anthropic/claude-sonnet-4.5',
          temperature: 0.7,
        });
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          const aiHtml = String(parsed.html ?? '');
          // Sanity: keep the AI email only if it preserved CTA + footer structure
          if (parsed.subject && aiHtml.includes('desafiohipico.com') && aiHtml.includes('</a>')) {
            return NextResponse.json({ ok: true, subject: String(parsed.subject), html: aiHtml });
          }
        }
      } catch {
        // Fallback to rotated template if AI call fails
      }
      return NextResponse.json({ ok: true, subject: fallback.subject, html: fallback.html });
    }

    // 4. Send Test Email to Admin
    if (action === 'send_test') {
      if (!resendKey) return NextResponse.json({ error: 'Falta AUTH_RESEND_KEY' }, { status: 400 });
      const toEmail = (body.testEmail || session?.user?.email || '').trim().toLowerCase();
      if (!EMAIL_REGEX.test(toEmail)) {
        return NextResponse.json({ error: 'Email de prueba inválido' }, { status: 400 });
      }
      // Same unsubscribe treatment as the real campaign — the test email must be identical
      const { buildUnsubscribeUrl } = await import('@/lib/unsubscribe');
      const unsub = buildUnsubscribeUrl(toEmail);
      const testFooter = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center"><a href="${unsub}" style="font-size:11px;color:#9ca3af">Darte de baja de estos correos</a> · <span style="font-size:11px;color:#d1d5db">Desafío Hípico</span></div>`;
      const testHtml = String(body.html).includes('{{UNSUB_URL}}')
        ? String(body.html).replaceAll('{{UNSUB_URL}}', unsub)
        : String(body.html) + testFooter;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'Desafío Hípico <noreply@desafiohipico.com>',
          to: [toEmail],
          subject: `[PRUEBA] ${body.subject}`,
          html: testHtml,
          headers: {
            'List-Unsubscribe': `<${unsub}>`,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({ error: err.message ?? 'Error al enviar prueba en Resend' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, sentTo: toEmail });
    }

    // 5. Send Campaign to Selected List (`active` or `all_valid`)
    if (action === 'send_campaign') {
      if (!resendKey) return NextResponse.json({ error: 'Falta AUTH_RESEND_KEY' }, { status: 400 });
      const slot: 'wednesday' | 'thursday' = body.slot === 'thursday' ? 'thursday' : 'wednesday';
      const targetList: 'active' | 'all_valid' = body.targetList === 'all_valid' ? 'all_valid' : 'active';
      const ctx = await buildCampaignContext(0);

      if (!ctx.hasUpcomingMeetingLoaded) {
        return NextResponse.json(
          { error: 'Bloqueado por seguridad: Aún no se ha cargado la jornada nueva de esta semana en el sistema.' },
          { status: 400 }
        );
      }

      const suppressed = await getSiteConfig<string[]>('emailSuppressedList', []);
      const suppressedSet = new Set((suppressed ?? []).map(s => s.toLowerCase().trim()));
      const allUsers = (await User.find({ email: { $exists: true, $ne: '' } })
        .select('email balance lastLoginDate createdAt unsubscribed')
        .lean()) as any[];

      const cutoff60d = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const cutoff30dMs = Date.now() - 30 * 24 * 3600 * 1000;
      const recipients: string[] = [];

      for (const u of allUsers) {
        const em = (u.email ?? '').toLowerCase().trim();
        if (isJunkEmail(em) || suppressedSet.has(em) || u.unsubscribed === true) continue;
        if (targetList === 'active') {
          const isRecentLogin = u.lastLoginDate && u.lastLoginDate >= cutoff60d;
          const hasGolds = (u.balance?.golds ?? 0) > 0;
          const isNewUser = u.createdAt && new Date(u.createdAt).getTime() >= cutoff30dMs;
          if (!isRecentLogin && !hasGolds && !isNewUser) continue;
        }
        recipients.push(em);
      }

      const uniqueRecipients = [...new Set(recipients)];

      // Resend free plan = 100 emails/day. Track daily sends in SiteConfig and
      // cap the campaign so we never report 600 "sent" when only ~100 went out.
      const DAILY_LIMIT = 95; // small buffer for manual test sends
      const todayKey = new Date().toISOString().slice(0, 10);
      const quotaRec = (await getSiteConfig<Record<string, number>>('emailDailyQuota', {})) ?? {};
      const sentToday = quotaRec[todayKey] ?? 0;
      const remaining = Math.max(0, DAILY_LIMIT - sentToday);

      if (remaining === 0) {
        return NextResponse.json(
          { error: `Límite diario de Resend alcanzado (${sentToday}/${DAILY_LIMIT} enviados hoy). Reintenta mañana o sube de plan.` },
          { status: 429 }
        );
      }

      const toSend = uniqueRecipients.slice(0, remaining);
      const deferredCount = uniqueRecipients.length - toSend.length;
      let sentCount = 0;

      const { buildUnsubscribeUrl } = await import('@/lib/unsubscribe');

      // Send in batches of 100 via Resend Batch API
      for (let i = 0; i < toSend.length; i += 100) {
        const chunk = toSend.slice(i, i + 100);
        const batchPayload = chunk.map(to => {
          const unsub = buildUnsubscribeUrl(to);
          const footer = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;text-align:center"><a href="${unsub}" style="font-size:11px;color:#9ca3af">Darte de baja de estos correos</a> · <span style="font-size:11px;color:#d1d5db">Desafío Hípico</span></div>`;
          const html = String(body.html).includes('{{UNSUB_URL}}')
            ? String(body.html).replaceAll('{{UNSUB_URL}}', unsub)
            : String(body.html) + footer;
          return {
            from: 'Desafío Hípico <noreply@desafiohipico.com>',
            to: [to],
            subject: body.subject,
            html,
            headers: {
              'List-Unsubscribe': `<${unsub}>`,
            },
          };
        });

        const bRes = await fetch('https://api.resend.com/emails/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify(batchPayload),
        });
        if (bRes.ok) {
          sentCount += chunk.length;
        }
      }

      const sentLog = (await getSiteConfig<Record<string, string>>('emailCampaignSentLog', {})) ?? {};
      const logKey = `${slot === 'wednesday' ? 'wed' : 'thu'}_R${ctx.upcomingMeetingNumber}`;
      sentLog[logKey] = new Date().toISOString();
      await SiteConfig.findOneAndUpdate(
        { key: 'emailCampaignSentLog' },
        { $set: { value: sentLog } },
        { upsert: true }
      );
      quotaRec[todayKey] = sentToday + sentCount;
      await SiteConfig.findOneAndUpdate(
        { key: 'emailDailyQuota' },
        { $set: { value: quotaRec } },
        { upsert: true }
      );

      return NextResponse.json({
        ok: true,
        sentCount,
        deferredCount,
        dailyLimit: DAILY_LIMIT,
        sentToday: sentToday + sentCount,
        alreadySentAt: sentLog[logKey],
      });
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error interno' },
      { status: 500 }
    );
  }
}
