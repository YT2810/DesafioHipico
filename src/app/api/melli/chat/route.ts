import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import AgentLog from '@/models/AgentLog';
import User from '@/models/User';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://www.desafiohipico.com',
    'X-Title': 'El Melli · Desafío Hípico',
  },
});

// ── Costos por acción (en Golds) ────────────────────────────────────────────
export const ACTION_COSTS: Record<string, number> = {
  marks_1race:       3,  // 2 marcas para 1 carrera
  analysis_1race:    5,  // Análisis completo 1 carrera
  pack_5y6:         25,  // Paquete 5y6 (6 carreras válidas)
  pack_full:        50,  // Reunión completa (todas las carreras)
  free:              0,  // Chat libre, embudo
};

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

HEURÍSTICA PARA DAR MARCAS (cuando la acción esté pagada):
Usa esta prioridad con los datos del CONTEXTO DB:
- PRIORIDAD 1: Si 3+ handicappers eligen el mismo caballo como 1ª marca → ese es el candidato principal. Dílo: "Consenso de X expertos apunta a [nombre] (#dorsal)."
- PRIORIDAD 2: Si hay traqueo reciente de un inscripto en la misma distancia con splits buenos → menídnalo como dato complementario: "Además, [nombre] trabeó [Xm] hace [N] días."
- PRIORIDAD 3: Si hay etiqueta Casi Fijo / Súper Especial / Batacazo en el consenso → refléjala.
- PRIORIDAD 4: Sin consenso de handicappers → busca en los inscriptos del CONTEXTO DB: elige los 2 que tengan traqueo reciente mencionado (↳ Trabajo). Si ninguno tiene traqueo, menciona los 2 primeros inscriptos del programa (menor dorsal) y aclara: "Sin consenso aún. Basado en inscritos del programa oficial."
- PRIORIDAD 5: Si no hay absolutamente ningún dato de inscriptos ni traqueos → di exactamente: "No tengo inscritos cargados para esta carrera aún, socio. Vuelve cuando esté el programa oficial."
- NUNCA elijas un caballo random ni inventes nombres. Siempre basa la respuesta en el CONTEXTO DB.

CLASIFICACIÓN (JSON oculto — el usuario NO lo ve):
Al final de CADA respuesta, en una línea separada:
##LOG##{"category":"[cat]","action":"[action_key]","horseName":"[nombre o null]","raceNumber":[num o null]}
Categorías: analisis_carrera, analisis_caballo, traqueo, pronostico, programa, handicapper, general_hipismo, embudo, off_topic
action_key: marks_1race | analysis_1race | pack_5y6 | pack_full | free`;

// ── Detectar si un mensaje activa una acción de cobro ───────────────────────
function detectAction(content: string): { action: string; raceNumber?: number; racesCount?: number } {
  const c = content.toLowerCase();
  // Paquete completo
  if (/reunión completa|todas las carreras|paquete completo/.test(c)) {
    return { action: 'pack_full' };
  }
  // Paquete 5y6
  if (/5 ?y ?6|válidas|paquete 5y6|cinco y seis/.test(c) && !/carrera \d/.test(c)) {
    return { action: 'pack_5y6' };
  }
  // Análisis completo 1 carrera
  if (/análisis.*carrera ?(\d+)|carrera ?(\d+).*análisis completo/.test(c)) {
    const m = c.match(/carrera ?(\d+)/);
    return { action: 'analysis_1race', raceNumber: m ? parseInt(m[1]) : undefined };
  }
  // 2 marcas 1 carrera
  if (/marcas?.*carrera ?(\d+)|carrera ?(\d+).*marcas?|2 marcas|dos marcas/.test(c)) {
    const m = c.match(/carrera ?(\d+)/);
    return { action: 'marks_1race', raceNumber: m ? parseInt(m[1]) : undefined };
  }
  return { action: 'free' };
}

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

  // ── Detectar acción y calcular costo ────────────────────────────────────────
  const { action, raceNumber } = detectAction(userMessage);
  const cost = ACTION_COSTS[action] ?? 0;

  // ── Anti-scraping: throttle por sesión ────────────────────────────────────
  // Si lleva 10+ mensajes de usuario sin cobro, inyectar aviso en el contexto
  const antiScrapingNote = msgCount >= 10
    ? '\n[SISTEMA: El usuario lleva muchos mensajes sin acción de cobro. Activa modo vendedor agresivo ahora.]'
    : '';

  // ── Verificar y descontar Golds si es acción de pago ─────────────────────
  let goldBalance = 0;
  let goldDeducted = 0;

  if (cost > 0) {
    await connectMongo();
    const user = await User.findById(userId).select('balance').lean() as any;
    goldBalance = user?.balance?.golds ?? 0;

    if (goldBalance < cost) {
      // No tiene suficientes tokens — devolver CTA para compartir
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

    const cleanContent = rawContent.replace(/\n*##LOG##\{.*?\}\s*$/, '').trim();

    // Analytics log
    try {
      await AgentLog.create({
        userId,
        query: userMessage.slice(0, 500),
        category,
        horseName: logHorse,
        raceNumber: logRace,
        goldCost: goldDeducted,
      });
    } catch (logErr) {
      console.error('[melli/log]', logErr);
    }

    return NextResponse.json({
      content: cleanContent,
      goldDeducted,
      goldBalance: goldBalance - goldDeducted,
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
