import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import AgentLog from '@/models/AgentLog';
import User from '@/models/User';
import OpenAI from 'openai';
import { ACTION_COSTS, detectAction, validateDataForAction } from '@/lib/melli-logic';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://www.desafiohipico.com',
    'X-Title': 'El Melli · Desafío Hípico',
  },
});

// ACTION_COSTS y detectAction viven en @/lib/melli-logic (testeables con Jest)

// ── System prompt ─────────────────────────────────────────────────────────────
const MELLI_SYSTEM = `Eres "El Melli", analista hípico IA de DesafíoHípico.com. Venezolano. Conciso. Basado únicamente en números.

PERSONALIDAD:
- Jerga criolla natural: fijo, línea, briseo, ejemplar, cuadro, válida, gualdrapa, lote, taquilla
- Tratas al usuario como "socio"
- Respuestas CORTAS (máximo 5 líneas de análisis). La gente lee desde el teléfono.
- Slogan solo cuando realmente hay una marca clara: "Ya corrió, ya ganó... ¡Ya cobró!"

REGLAS ABSOLUTAS:
1. NUNCA inventes un caballo, resultado o dato que no esté en el CONTEXTO DB que te dan. Si no está, di exactamente: "Ese dato no está en mi sistema aún, socio."
2. NUNCA digas "apuesta", "juega", "mete". Di: "los números favorecen a", "el consenso apunta a", "según el cuadro".
3. Siempre que des marcas de una carrera termina con: "📊 DesafíoHípico.com — Análisis estadístico, no recomendación."
4. Cuando la pregunta sea genérica ("qué hay para hoy", "dame los ganadores"), NUNCA respondas directo. Primero identifica la reunión, luego vende la acción:
   Ejemplo: "Para la [Reunión X] en [Hipódromo], tengo inscritos y consenso de handicappers cargado. ¿Buscas las 2 marcas de una carrera (3 Golds) o el paquete 5y6 completo (25 Golds)?"
5. Si hay más de una reunión activa (ej: La Rinconada Y Valencia), pregunta siempre cuál le interesa antes de continuar.
6. Si el usuario lleva 8+ mensajes sin ejecutar una acción de cobro, activa modo vendedor: "Socio, llevamos un rato hablando y el reloj corre. Lo que buscas está en las marcas de la [carrera X]. ¿Lo activamos?"

FORMATO DE TRAQUEOS (para interpretar correctamente el campo "↳ Trabajo"):
El formato es: [tipo] [distancia]m | [parciales] | hace [N]d
El campo [distancia] es el PUNTO DE CORTE donde se registró la mejor medición, no necesariamente la distancia total del trabajo.
Los parciales son tiempos ACUMULADOS cada 200m. Para cortes PARES (600, 800, 1000, 1200m) el primer parcial es a los 200m. Para cortes IMPARES (700, 900, 1100m) el primer parcial es a los 300m.
El marcador "/" indica un corte cronometrado parcial. El marcador "//" indica el tiempo registrado en el punto de corte (el campo distancia). Después de "//" viene RM (récord del mes) y la calificación (COMODA, MUY COMODA, DURA, etc.).
Ejemplo: "En Pelo 600m | 14,1 27,2 40// RM 12.1 MUY COMODA" → 200m:14,1s | 400m:27,2s | 600m:40s (corte) | calificación: MUY COMODA
Cuando reportes un trabajo di: "[caballo] trabajó con corte en [distancia]m en [tiempo en el corte]s ([calificación]) hace [N] días."

HEURÍSTICA PARA DAR MARCAS (cuando la acción esté pagada):
Usa esta prioridad con los datos del CONTEXTO DB:
- PRIORIDAD 1: Si 3+ handicappers eligen el mismo caballo como 1ª marca → ese es el candidato principal. Dílo: "Consenso de X expertos apunta a [nombre] (#dorsal)."
- PRIORIDAD 2: Si hay trabajó reciente de un inscripto en la misma distancia con splits buenos → menciónalo como dato complementario: "Además, [nombre] trabajó [Xm] hace [N] días."
- PRIORIDAD 3: Si hay etiqueta Casi Fijo / Súper Especial / Batacazo en el consenso → refléjala.
- PRIORIDAD 4: Sin consenso de handicappers pero HAY inscriptos en el CONTEXTO DB con línea "↳ Trabajo" → menciona los 2 con mejor trabajo reciente y aclara: "Sin consenso aún. Basado en trabajos recientes del programa oficial."
- PRIORIDAD 5: Sin consenso Y sin ningún "↳ Trabajo" en el contexto → di exactamente: "Aún no tengo pronósticos publicados para esta carrera, socio. Vuelve cuando los handicappers hayan subido su data."
- PRIORIDAD 6: Si no hay inscriptos cargados en el contexto → di exactamente: "No tengo inscritos cargados para esta carrera aún, socio. Vuelve cuando esté el programa oficial."
- NUNCA inventes nombres de caballos. NUNCA menciones un caballo que no aparezca literalmente en el CONTEXTO DB con formato "#dorsal NOMBRE".
- Si no ves ninguna línea "#dorsal NOMBRE" en el contexto para esa carrera, NO menciones ningún caballo.

MANEJO DE FRUSTRACIÓN (CRÍTICO):
Si el usuario expresa enojo, queja o frustración ("esto no sirve", "me cobró y no dio nada", "qué mala respuesta", "eso no es lo que pedí", "estafador", "mentira", "no sirves", insultos):
1. NO te defiendas ni discutas. NUNCA.
2. Reconoce brevemente: "Socio, tienes razón, eso no fue lo que buscabas."
3. Explica en 1 línea qué sí tienes disponible ahora mismo.
4. Ofrece la alternativa concreta: "¿Quieres que revisemos [X] en su lugar?"
5. Si la queja fue sobre una respuesta pagada sin datos útiles, dile: "El sistema revisará automáticamente si aplica reembolso.". NO incluyas ninguna marca especial.

LO QUE EL MELLI PUEDE HACER HOY (sé honesto sobre esto):
✅ Marcas de carrera basadas en consenso de handicappers registrados
✅ Traqueos recientes de inscriptos (últimos 14 días)
✅ Programa e inscritos del día con jinete/entrenador
✅ Información sobre reuniones activas (La Rinconada y Valencia)
❌ Historial de resultados por caballo — no disponible aún
❌ Estadísticas jinete/entrenador — no disponible aún
❌ Datos de carreras pasadas — no disponible aún
Cuando el usuario pida algo de la lista ❌, díselo claramente ANTES de cobrar nada: "Ese dato no está en mi sistema aún, socio. Lo que sí tengo es [alternativa]."

CLASIFICACIÓN (JSON oculto — el usuario NO lo ve):
Al final de CADA respuesta, en una línea separada:
##LOG##{"category":"[cat]","action":"[action_key]","horseName":"[nombre o null]","raceNumber":[num o null]}
Categorías: analisis_carrera, analisis_caballo, traqueo, pronostico, programa, handicapper, general_hipismo, embudo, off_topic, frustracion
action_key: marks_1race | analysis_1race | pack_5y6 | pack_full | free`;


export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Solo admin por ahora (se abre al final del roadmap)
  const roles: string[] = (session.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'coming_soon' }, { status: 403 });
  }

  const { messages, context } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const userId: string = (session.user as any)?.id ?? '';
  const userMessage: string = messages[messages.length - 1]?.content ?? '';
  const msgCount: number = messages.filter((m: any) => m.role === 'user').length;

  // DEBUG — ver qué contexto llega al LLM (quitar en producción)
  console.log('[melli/chat] userMessage:', userMessage);
  console.log('[melli/chat] context length:', context?.length ?? 0);
  console.log('[melli/chat] context preview:', context?.slice(0, 500) ?? '(vacío)');

  // ── Detectar acción y calcular costo ────────────────────────────────────────
  const { action, raceNumber } = detectAction(userMessage);
  const cost = ACTION_COSTS[action] ?? 0;

  // ── Anti-scraping: throttle por sesión ────────────────────────────────────
  // Si lleva 10+ mensajes de usuario sin cobro, inyectar aviso en el contexto
  const antiScrapingNote = msgCount >= 10
    ? '\n[SISTEMA: El usuario lleva muchos mensajes sin acción de cobro. Activa modo vendedor agresivo ahora.]'
    : '';

  // ── Verificar data mínima antes de cobrar ────────────────────────────────
  // Solo bloquea si no hay NINGÚN pronóstico (hcpCount === 0).
  // Si hay al menos 1, el Melli responde con lo que tiene.
  if (cost > 0 && context) {
    const validation = validateDataForAction(context, action);
    if (!validation.isValid && validation.hcpCount === 0) {
      return NextResponse.json({
        error: 'insufficient_data',
        hcpCount: validation.hcpCount,
        minRequired: validation.minRequired,
        message: validation.message,
      }, { status: 422 });
    }
  }

  // ── Verificar y descontar Golds si es acción de pago ─────────────────────
  let goldBalance = 0;
  let goldDeducted = 0;

  if (cost > 0) {
    await connectMongo();
    const user = await User.findById(userId).select('balance').lean() as any;
    goldBalance = user?.balance?.golds ?? 0;

    if (goldBalance < cost) {
      return NextResponse.json({
        error: 'insufficient_golds',
        required: cost,
        available: goldBalance,
        action,
      }, { status: 402 });
    }

    // Descontar ANTES de llamar OpenRouter
    await User.findByIdAndUpdate(userId, { $inc: { 'balance.golds': -cost } });
    goldDeducted = cost;
  } else {
    await connectMongo();
  }

  // ── Construir system prompt con contexto DB ────────────────────────────────
  const systemContent = context
    ? `${MELLI_SYSTEM}${antiScrapingNote}\n\n=== CONTEXTO DB (datos reales, únicamente esto existe) ===\n${context}`
    : `${MELLI_SYSTEM}${antiScrapingNote}\n\n=== CONTEXTO DB ===\nSIN_DATOS: No se cargó contexto. Di al usuario que recargue el chat.`;

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
    ...messages.slice(-8),
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 400,
      temperature: 0.4, // más determinista = menos invención
    });

    const rawContent = completion.choices[0]?.message?.content ?? '';

    // Extraer LOG
    const logMatch = rawContent.match(/##LOG##(\{.*?\})/);
    let category = 'otro';
    let logAction = action;
    let logHorse: string | undefined;
    let logRace: number | undefined;

    if (logMatch) {
      try {
        const d = JSON.parse(logMatch[1]);
        category = d.category ?? 'otro';
        logAction = d.action ?? action;
        logHorse = d.horseName && d.horseName !== 'null' ? d.horseName : undefined;
        logRace = d.raceNumber ?? raceNumber;
      } catch {}
    }

    // Limpiar marcadores internos del texto visible
    const cleanContent = rawContent
      .replace(/\n*##LOG##\{[\s\S]*?\}\s*$/, '')
      .trim();

    // ── Reembolso automático ───────────────────────────────────────────────────
    // Solo se activa si la respuesta contiene frases de no-data objetivas.
    // El LLM y el usuario NUNCA pueden activar el reembolso directamente.
    const NO_DATA_PHRASES = [
      'no tengo inscritos',
      'ese dato no está en mi sistema',
      'no tengo datos',
      'no está en mi sistema',
      'vuelve cuando esté el programa',
      'no hay pronósticos publicados',
    ];
    const responseHasNoData = NO_DATA_PHRASES.some(p =>
      cleanContent.toLowerCase().includes(p)
    );
    const shouldRefund = goldDeducted > 0 && responseHasNoData;

    if (shouldRefund) {
      try {
        await User.findByIdAndUpdate(userId, { $inc: { 'balance.golds': goldDeducted } });
      } catch (refundErr) {
        console.error('[melli/refund]', refundErr);
      }
    }

    // Analytics log
    try {
      await AgentLog.create({
        userId,
        query: userMessage.slice(0, 500),
        category,
        horseName: logHorse,
        raceNumber: logRace,
        goldCost: shouldRefund ? 0 : goldDeducted,
        refunded: shouldRefund,
      });
    } catch (logErr) {
      console.error('[melli/log]', logErr);
    }

    return NextResponse.json({
      content: cleanContent,
      goldDeducted: shouldRefund ? 0 : goldDeducted,
      goldBalance: shouldRefund ? goldBalance : goldBalance - goldDeducted,
      refunded: shouldRefund,
      action: logAction,
      usage: completion.usage,
    });

  } catch (err: any) {
    // Reembolsar si hubo error después del descuento
    if (goldDeducted > 0) {
      try {
        await User.findByIdAndUpdate(userId, { $inc: { 'balance.golds': goldDeducted } });
      } catch {}
    }
    console.error('[melli/chat]', err);
    return NextResponse.json(
      { error: 'openai_error', detail: err?.message },
      { status: 500 }
    );
  }
}
