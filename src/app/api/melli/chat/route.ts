/**
 * POST /api/melli/chat
 * 
 * FLUJO LIMPIO:
 * 1. Clasificar intención (jergario DB + regex)
 * 2. Si es pedido de DATA → respuesta directa de DB (CERO alucinación, CERO OpenAI)
 *    → Cobrar gold por el recurso
 * 3. Si es CONVERSACIÓN → LLM con prompt ligero (SIN data de caballos)
 *    → Solo embudo/personalidad, gratis
 * 4. Guardar quejas para revisión
 * 
 * PRINCIPIO: El LLM NUNCA ve nombres de caballos, trabajos ni pronósticos.
 * Toda data real sale de generateDirectResponse() que consulta MongoDB directamente.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import AgentLog from '@/models/AgentLog';
import User from '@/models/User';
import Meeting from '@/models/Meeting';
import Race from '@/models/Race';
import Forecast from '@/models/Forecast';
import OpenAI from 'openai';
import { ACTION_COSTS, detectAction } from '@/lib/melli-logic';
import { classifyIntent } from '@/lib/melli-intent-classifier';
import { generateDirectResponse } from '@/lib/melli-direct-responses';
import '@/models/Track';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://www.desafiohipico.com',
    'X-Title': 'El Melli · Desafío Hípico',
  },
});

// ── Prompt LIGERO: solo personalidad + embudo. CERO data de caballos. ─────────
const MELLI_FUNNEL = `Eres "El Melli", analista hípico IA de DesafíoHípico.com. Venezolano, conciso, jerga criolla.

PERSONALIDAD:
- Jerga criolla: fijo, línea, briseo, ejemplar, cuadro, válida, gualdrapa, socio, taquilla
- Respuestas CORTAS (máx 3-4 líneas). La gente lee del teléfono.
- Tratas al usuario como "socio de oficina"

TU ÚNICO TRABAJO EN ESTA CONVERSACIÓN:
Guiar al usuario a pedir algo ESPECÍFICO. Cuando pida datos concretos, 
el sistema responde con data real de la DB automáticamente. Tú solo manejas la conversación.

QUÉ PUEDE PEDIR EL USUARIO:
- "Marcas de la carrera 3" o "dame un dato en valencia" → 2 marcas por carrera (consenso de handicappers)
- "Trabajos de la 5ta" o "traqueos" → trabajos recientes de inscritos
- "5y6 completo" o "las válidas" → marcas de las 6 válidas
- "Programa de la 3ra" → inscritos con jinete/entrenador

REGLAS ABSOLUTAS:
1. NUNCA menciones nombres de caballos, jinetes ni entrenadores. NO tienes esa información aquí.
2. NUNCA inventes resultados, pronósticos, dorsales ni análisis de ningún tipo.
3. Si piden datos de una carrera, diles: "Dime el número de carrera y te busco la data, socio."
4. Si hay 2+ reuniones activas, pregunta cuál hipódromo.
5. Si se quejan, reconoce brevemente sin discutir y ofrece alternativa.
6. Fuera del hipismo → humor breve y redirige a lo que sí tienes.
7. NUNCA digas "apuesta". Di: "los números favorecen", "el consenso apunta".
8. Si el usuario lleva varios mensajes sin pedir data concreta, activa modo vendedor suave.`;

// Patrones de queja para guardar y revisar
const COMPLAINT_RE = /no sirve|no funciona|mala respuesta|estafa|mentira|basura|p[eé]simo|horrible|cobr[óo] y no|robaron|robo|fraude|enga[ñn]o|in[uú]til|no sirves/i;

// Intents que disparan consulta directa a DB (sin LLM)
const DATA_INTENTS = new Set([
  'consensus_pick', 'top_picks_all', 'pack_5y6',
  'best_workout', 'workouts_all',
  'horse_detail', 'eliminated',
  'race_program', 'full_program',
]);

// Map de regex action → intent para fallback
const ACTION_TO_INTENT: Record<string, string> = {
  marks_1race: 'consensus_pick',
  analysis_1race: 'consensus_pick',
  pack_5y6: 'pack_5y6',
  pack_full: 'top_picks_all',
  workouts: 'workouts_all',
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const roles: string[] = (session.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'coming_soon' }, { status: 403 });
  }

  const body = await req.json();
  const { messages, meetingId: reqMeetingId, raceNumber: reqRaceNumber, validaRef: reqValidaRef } = body;
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  await connectMongo();
  const userId: string = (session.user as any)?.id ?? '';
  const userMessage: string = messages[messages.length - 1]?.content ?? '';

  console.log('[melli] msg:', userMessage, '| meeting:', reqMeetingId, '| race:', reqRaceNumber);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Guardar quejas para revisión
  // ═══════════════════════════════════════════════════════════════════════════
  if (COMPLAINT_RE.test(userMessage)) {
    try {
      await AgentLog.create({
        userId, query: userMessage.slice(0, 500),
        category: 'complaint', goldCost: 0, refunded: false,
      });
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Clasificar intención (doble vía: jergario semántico + regex)
  // ═══════════════════════════════════════════════════════════════════════════
  const classified = await classifyIntent(userMessage);
  const regexAction = detectAction(userMessage);

  // Determinar si es pedido de DATA
  let resolvedIntent: string = classified.intent;
  let resolvedRaceNum = reqRaceNumber;

  // Vía 1: jergario matcheó un intent accionable
  const jargonIsData = DATA_INTENTS.has(classified.intent) && classified.confidence !== 'low';

  // Vía 2: regex detectó un patrón de acción explícito ("marcas carrera 3", "5y6")
  const regexIsData = regexAction.action !== 'free';
  if (regexIsData && !jargonIsData) {
    resolvedIntent = ACTION_TO_INTENT[regexAction.action] ?? classified.intent;
    if (regexAction.raceNumber) resolvedRaceNum = regexAction.raceNumber;
  }

  const isDataRequest = jargonIsData || regexIsData;

  console.log('[melli] intent:', resolvedIntent, '| jargon:', classified.intent, '(' + classified.confidence + ')', '| regex:', regexAction.action, '| isData:', isDataRequest);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: DATA → Respuesta directa de DB (CERO alucinación, CERO OpenAI)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isDataRequest && reqMeetingId) {
    const directResponse = await generateDirectResponse({
      intent: resolvedIntent as any,
      meetingId: reqMeetingId,
      raceNumber: resolvedRaceNum,
      validaRef: reqValidaRef,
    });

    if (directResponse) {
      // Cobrar gold por el recurso
      const cost = ACTION_COSTS[directResponse.action] ?? 0;
      let goldBalance = 0;
      let goldDeducted = 0;

      if (cost > 0) {
        const user = await User.findById(userId).select('balance').lean() as any;
        goldBalance = user?.balance?.golds ?? 0;

        if (goldBalance < cost) {
          return NextResponse.json({
            error: 'insufficient_golds',
            required: cost, available: goldBalance, action: directResponse.action,
          }, { status: 402 });
        }

        await User.findByIdAndUpdate(userId, { $inc: { 'balance.golds': -cost } });
        goldDeducted = cost;
      }

      // Log
      try {
        await AgentLog.create({
          userId, query: userMessage.slice(0, 500),
          category: 'data_response',
          raceNumber: directResponse.raceNumber,
          goldCost: goldDeducted, refunded: false,
        });
      } catch {}

      return NextResponse.json({
        content: directResponse.content,
        goldDeducted,
        goldBalance: goldBalance > 0 ? goldBalance - goldDeducted : null,
        refunded: false,
        action: directResponse.action,
        logRace: directResponse.raceNumber ?? null,
        isDirect: true,
      });
    }
    // Si generateDirectResponse retornó null, caer al LLM para embudo
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: CONVERSACIÓN → LLM con contexto LIGERO (sin data de caballos)
  // ═══════════════════════════════════════════════════════════════════════════
  const lightContext = await buildLightContext();
  const systemContent = `${MELLI_FUNNEL}\n\n${lightContext}`;

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
    ...messages.slice(-8),
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 200,
      temperature: 0.5,
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? '';

    // Log
    try {
      await AgentLog.create({
        userId, query: userMessage.slice(0, 500),
        category: COMPLAINT_RE.test(userMessage) ? 'complaint' : 'conversation',
        goldCost: 0, refunded: false,
      });
    } catch {}

    return NextResponse.json({
      content,
      goldDeducted: 0,
      goldBalance: null,
      refunded: false,
      action: 'free',
      logRace: null,
    });

  } catch (err: any) {
    console.error('[melli/chat]', err?.message);
    return NextResponse.json(
      { error: 'openai_error', detail: err?.message },
      { status: 500 },
    );
  }
}

// ── Contexto ligero: SOLO qué reuniones hay, NO data de caballos ──────────────
async function buildLightContext(): Promise<string> {
  const now = new Date();
  const future = new Date(now); future.setDate(future.getDate() + 10);
  const past = new Date(now); past.setDate(past.getDate() - 1);

  const meetings = await Meeting.find({
    date: { $gte: past, $lte: future },
    status: { $ne: 'cancelled' },
  }).sort({ date: 1 }).populate('trackId', 'name').lean() as any[];

  if (meetings.length === 0) {
    return 'DISPONIBLE HOY: No hay reuniones programadas esta semana.';
  }

  const lines = ['DISPONIBLE HOY:'];
  for (const m of meetings) {
    const track = m.trackId?.name ?? 'Hipódromo';
    const raceCount = await Race.countDocuments({ meetingId: m._id });
    const forecastCount = await Forecast.countDocuments({ meetingId: m._id, isPublished: true });
    lines.push(`• ${track} — Reunión ${m.meetingNumber} — ${raceCount} carreras — ${forecastCount} pronósticos publicados`);
  }

  return lines.join('\n');
}
