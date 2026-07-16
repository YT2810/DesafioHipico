# Plan: MeetingSnapshot — Optimización Revista

## Objetivo
Evitar que cada visita a /revista/[meetingId] recalcule todo desde MongoDB.
En vez de eso, guardar el resultado ya calculado (snapshot) y servirlo directamente.

## Estado actual de implementación
- [ ] snapshot_1: src/models/MeetingSnapshot.ts — MODELO
- [ ] snapshot_2: src/lib/generateMeetingSnapshot.ts — GENERADOR
- [ ] snapshot_3: src/app/api/revista/[meetingId]/route.ts — leer snapshot primero
- [ ] snapshot_4: src/app/api/admin/ingest/route.ts — llamar generateMeetingSnapshot al final
- [ ] snapshot_5: tsc --noEmit + git commit + git push

## Paso 1 — src/models/MeetingSnapshot.ts (CREAR NUEVO)
```ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IMeetingSnapshot extends Document {
  meetingId: mongoose.Types.ObjectId;
  generatedAt: Date;
  data: any; // el JSON completo que devuelve el API de revista
}

const MeetingSnapshotSchema = new Schema<IMeetingSnapshot>({
  meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, unique: true },
  generatedAt: { type: Date, default: Date.now },
  data: { type: Schema.Types.Mixed, required: true },
});

MeetingSnapshotSchema.index({ meetingId: 1 }, { unique: true });

export default mongoose.models.MeetingSnapshot ||
  mongoose.model<IMeetingSnapshot>('MeetingSnapshot', MeetingSnapshotSchema);
```

## Paso 2 — src/lib/generateMeetingSnapshot.ts (CREAR NUEVO)
- Copiar TODA la lógica de cálculo de /api/revista/[meetingId]/route.ts
- Envolver en función: `export async function generateMeetingSnapshot(meetingId: string): Promise<any>`
- Al final: guardar con `MeetingSnapshot.findOneAndUpdate({ meetingId }, { data: result, generatedAt: new Date() }, { upsert: true })`
- Retornar el objeto `{ meeting, races, hasWorkouts }`

## Paso 3 — Modificar /api/revista/[meetingId]/route.ts
Reemplazar TODO el código de cálculo por:
```ts
import MeetingSnapshot from '@/models/MeetingSnapshot';
import { generateMeetingSnapshot } from '@/lib/generateMeetingSnapshot';

// 1. Buscar snapshot existente
const snap = await MeetingSnapshot.findOne({ meetingId }).lean() as any;
if (snap) {
  // Meetings pasados: servir snapshot cacheado (datos ya no cambian)
  // Meetings futuros/hoy: si el snapshot tiene menos de 30 min, servirlo; si no, regenerar
  const ageMinutes = (Date.now() - new Date(snap.generatedAt).getTime()) / 60000;
  const meetingDate = new Date(snap.data.meeting.date).toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  const isPast = meetingDate < todayStr;
  if (isPast || ageMinutes < 30) {
    return NextResponse.json(snap.data, { headers: { 'Cache-Control': 'no-store' } });
  }
}
// 2. No existe o expiró: generar y guardar
const result = await generateMeetingSnapshot(meetingId);
return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
```

## Paso 4 — Modificar /api/admin/ingest/route.ts
Al final del handler de ingestión de inscritos, agregar:
```ts
import { generateMeetingSnapshot } from '@/lib/generateMeetingSnapshot';
// ... al final, después de guardar entries:
try { await generateMeetingSnapshot(meetingId); } catch (e) { console.error('Snapshot error:', e); }
```

## Paso 5 — Deploy
```bash
cd /home/ai/DesafioHipico
npx tsc --noEmit
git add -A
git commit -m "perf: MeetingSnapshot — pre-compute revista data on ingest, serve from DB"
git push origin main
```

## Token GitHub
Token guardado en el remote URL — usar `git remote set-url` con el PAT cuando sea necesario.
Usuario: YT2810
Repo: YT2810/DesafioHipico

## Archivos clave a conocer
- /src/app/api/revista/[meetingId]/route.ts — API actual (344 líneas, toda la lógica pesada)
- /src/app/api/admin/ingest/route.ts — donde el admin sube inscritos
- /src/models/Entry.ts — colección de inscritos por carrera
- /src/models/MeetingSnapshot.ts — NUEVO (a crear)
- /src/lib/generateMeetingSnapshot.ts — NUEVO (a crear)
