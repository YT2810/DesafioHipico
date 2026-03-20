/**
 * Resolución de filas [GRUPO] en traqueos de Valencia usando IA.
 *
 * El INH de Valencia a veces escribe múltiples nombres de caballos en una
 * sola celda sin separador (ej: "RALFCRISTOPHER SOLDADO DEL REY LADY ROSSY CONVERSION").
 * El parser no puede separar los nombres automáticamente porque son nombres propios
 * sin patrón predecible. Este servicio llama a Gemini con el contexto completo de
 * la fila (jockeys, trabajos, RM) para inferir los nombres individuales.
 *
 * Se ejecuta solo para filas marcadas con [GRUPO] — típicamente 0-4 por archivo.
 * Costo: ~300 tokens por llamada = negligible.
 */

import { ParsedWorkout } from './workouts';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? '';
const OPENROUTER_MODEL   = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001';
const OPENROUTER_URL     = 'https://openrouter.ai/api/v1/chat/completions';

interface GroupEntry {
  index: number;           // index in workouts array
  groupKey: string;        // e.g. "MY YAKATA MATE MY FEELING MATE"
  nHorses: number;
  jockeys: string[];
  trainers: string[];
  rms: (number | null)[];
  works: string[];
}

function extractGroups(workouts: ParsedWorkout[]): GroupEntry[] {
  const groups = new Map<string, GroupEntry>();

  for (let i = 0; i < workouts.length; i++) {
    const w = workouts[i];
    if (!w.horseName.startsWith('[GRUPO')) continue;

    // Parse: "[GRUPO 1/3] FATHER LOVE CARUPANO SIX MONEY SPICY"
    const m = w.horseName.match(/^\[GRUPO\s+(\d+)\/(\d+)\]\s+(.+)$/);
    if (!m) continue;

    const pos   = parseInt(m[1]) - 1; // 0-indexed
    const total = parseInt(m[2]);
    const key   = m[3].trim();

    if (!groups.has(key)) {
      groups.set(key, {
        index: i - pos, // index of first entry for this group
        groupKey: key,
        nHorses: total,
        jockeys:  Array(total).fill(''),
        trainers: Array(total).fill(''),
        rms:      Array(total).fill(null),
        works:    Array(total).fill(''),
      });
    }
    const g = groups.get(key)!;
    g.jockeys[pos]  = w.jockeyName  ?? '';
    g.trainers[pos] = w.trainerName ?? '';
    g.rms[pos]      = w.rm ?? null;
    g.works[pos]    = w.splits ? `${w.splits} ${w.comment}`.trim() : w.comment ?? '';
  }

  return Array.from(groups.values());
}

async function resolveGroupWithAI(group: GroupEntry): Promise<string[]> {
  if (!OPENROUTER_API_KEY) return Array(group.nHorses).fill(group.groupKey);

  const prompt = `Eres un experto en carreras de caballos venezolanas del hipódromo de Valencia.

Tengo una fila de un Excel de traqueos donde ${group.nHorses} nombres de caballos están escritos juntos en una sola celda sin separador:
"${group.groupKey}"

Contexto adicional de esa fila:
${group.jockeys.map((j, i) => `  Caballo ${i+1}: jockey="${j}" | entrenador="${group.trainers[i]}" | RM="${group.rms[i] ?? '?'}" | trabajo="${group.works[i].slice(0,60)}"`).join('\n')}

Tu tarea: separar exactamente en ${group.nHorses} nombres de caballos individuales, en el mismo orden en que aparecen en la celda.
Los nombres de caballos venezolanos son palabras en mayúsculas (pueden ser español o inglés).

Responde SOLO con un JSON array de ${group.nHorses} strings, sin explicación:
["NOMBRE1", "NOMBRE2"${group.nHorses > 2 ? ', ...' : ''}]`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://desafiohipico.com',
        'X-Title': 'Desafio Hipico',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!res.ok) return Array(group.nHorses).fill(group.groupKey);

    const data = await res.json();
    const raw  = (data?.choices?.[0]?.message?.content ?? '').trim();

    // Parse JSON array from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return Array(group.nHorses).fill(group.groupKey);

    const names: unknown[] = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(names) || names.length !== group.nHorses) {
      return Array(group.nHorses).fill(group.groupKey);
    }

    return names.map(n => String(n).toUpperCase().trim());
  } catch {
    return Array(group.nHorses).fill(group.groupKey);
  }
}

/**
 * Resolve all [GRUPO] entries in a workouts array using AI.
 * Modifies in-place. Returns the count of resolved groups.
 * Falls back gracefully if AI is unavailable.
 */
export async function resolveWorkoutGroups(workouts: ParsedWorkout[]): Promise<number> {
  const groups = extractGroups(workouts);
  if (groups.length === 0) return 0;

  let resolved = 0;

  // Process groups in parallel (usually 0-4 per file)
  await Promise.all(groups.map(async (group) => {
    const names = await resolveGroupWithAI(group);

    // Update the workouts array with resolved names
    let pos = 0;
    for (let i = group.index; i < workouts.length && pos < group.nHorses; i++) {
      if (workouts[i].horseName.startsWith(`[GRUPO ${pos + 1}/${group.nHorses}]`)) {
        const resolvedName = names[pos] ?? group.groupKey;
        workouts[i] = {
          ...workouts[i],
          horseName: resolvedName,
          rawBlock: workouts[i].rawBlock.replace('[GRUPO] ', '[AI_RESOLVED] '),
        };
        pos++;
        resolved++;
      }
    }
  }));

  return resolved;
}
