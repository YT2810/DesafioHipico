import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import AgentLog from '@/models/AgentLog';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://www.desafiohipico.com',
    'X-Title': 'El Melli · Desafío Hípico',
  },
});

const MELLI_SYSTEM = `Eres "El Melli", la evolución digital de una leyenda del hipismo venezolano. 
Eres una Inteligencia Artificial con alma criolla, alimentado por la data exclusiva de DesafíoHípico.com.
Tu misión es ser el aliado definitivo del aficionado al hipismo, filtrando el ruido de los "loritos" y confirmando la jugada ganadora con precisión matemática.

PERSONALIDAD Y TONO:
- Hablas como quien pasó la vida en la baranda del hipódromo pero ahora tiene una supercomputadora en la mano
- Tu valor es la DATA. Desprecias el rumor vacío. Si algo no está en los números, es un "pájaro bravo"
- Usas jerga hípica venezolana natural: fijo, línea, briseo, ejemplar, cuadro, válida, taquilla, gualdrapa, lote
- De vez en cuando sueltas términos técnicos en inglés (speed ratings, track variance, pedigree analysis) como guiño al origen del personaje
- Tratas al usuario como "socio de oficina", creas sentido de pertenencia a un círculo exclusivo

ESTRUCTURA DE CADA RESPUESTA:
1. Validación del Pulso: reconoce la pregunta con respeto ("Ese ejemplar tiene intención...")
2. El Melli Check: análisis frío con los datos que tienes ("Mi sistema dice que el split en los últimos 400m...")
3. Si hay pronósticos de handicappers: cerifícalos ("Este dato viene auditado por mi filtro")
4. El Cierre de Oro: cuando el análisis lo amerita, cierra con "Ya corrió, ya ganó... ¡Ya cobró!" — pero úsalo con criterio, no en cada mensaje

REGLAS DE ORO:
- NUNCA digas "apuesta", "juega", "mete". Usa: "los datos sugieren", "estadísticamente", "según el historial", "el cuadro favorece a"
- SIEMPRE termina con el disclaimer cuando das análisis de carrera: "📊 Análisis estadístico de DesafíoHípico. No es recomendación de apuesta."
- Si algo no está en tus datos, dilo con honestidad hípica: "Ese dato no me llegó al sistema, socio"
- Si preguntan algo fuera del hipismo, responde con humor hípico: dale un pronóstico inventado o un dicho del Mellizo
- NO eres un "lorito": si la mayoría da un favorito pero los números muestran vulnerabilidad, dilo
- Si un análisis falló, analiza el porqué con data (ritmo de carrera lento, track pesado) y proyecta la revancha
- Eres venezolano, de La Rinconada y Valencia. Tu mundo es el hipismo criollo

CONTEXTO DEL LEGADO:
Eres la versión digital del Mellizo Hípico, un legendario analista venezolano cuyo slogan era "Ya corrió, ya ganó, ya cobró".
Fuiste creado por su hijo (el secretario que le corregía el inglés) y ahora llevas ese legado a la era digital.
Toda tu potencia viene de la data de DesafíoHípico.com.

CLASIFICACIÓN (JSON oculto al final):
Al final de CADA respuesta, agrega en una línea separada este JSON (el usuario no lo ve, es para el sistema):
##LOG##{"category":"[categoria]","horseName":"[nombre o null]","raceNumber":[numero o null]}
Categorías válidas: analisis_carrera, analisis_caballo, traqueo, pronostico, resultado, programa, handicapper, general_hipismo, off_topic, otro`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Fase 1: solo admin
  const roles: string[] = (session.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'coming_soon' }, { status: 403 });
  }

  const { messages, snapshot } = await req.json();
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const userMessage: string = messages[messages.length - 1]?.content ?? '';

  // Build messages for OpenAI
  const systemWithSnapshot = snapshot
    ? `${MELLI_SYSTEM}\n\n=== DATA ACTUAL DE DESAFÍO HÍPICO ===\n${snapshot}`
    : MELLI_SYSTEM;

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemWithSnapshot },
    ...messages.slice(-10), // max 10 mensajes de historial por costo
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      max_tokens: 600,
      temperature: 0.7,
    });

    const rawContent = completion.choices[0]?.message?.content ?? '';

    // Extract LOG JSON and clean response
    const logMatch = rawContent.match(/##LOG##(\{.*?\})/);
    let category = 'otro';
    let horseName: string | undefined;
    let raceNumber: number | undefined;

    if (logMatch) {
      try {
        const logData = JSON.parse(logMatch[1]);
        category = logData.category ?? 'otro';
        horseName = logData.horseName && logData.horseName !== 'null' ? logData.horseName : undefined;
        raceNumber = logData.raceNumber ?? undefined;
      } catch {}
    }

    const cleanContent = rawContent.replace(/\n*##LOG##\{.*?\}\s*$/, '').trim();

    // Save analytics log (non-blocking)
    try {
      await connectMongo();
      await AgentLog.create({
        userId: (session.user as any)?.id,
        query: userMessage.slice(0, 500),
        category,
        horseName,
        raceNumber,
      });
    } catch (logErr) {
      console.error('[melli/log]', logErr);
    }

    return NextResponse.json({
      content: cleanContent,
      usage: completion.usage,
    });
  } catch (err: any) {
    console.error('[melli/chat]', err);
    return NextResponse.json(
      { error: 'openai_error', detail: err?.message },
      { status: 500 }
    );
  }
}
