/**
 * Elimina reuniones con meetingNumber=0 o sin carreras asociadas que sean basura de pruebas.
 * Usage: MONGODB_URI=... node scripts/clean-meetings.mjs
 *        o simplemente: node scripts/clean-meetings.mjs  (lee .env)
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoClient, ObjectId } from 'mongodb';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env
let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  try {
    const envPath = join(__dirname, '../.env');
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && m[1].trim() === 'MONGODB_URI') MONGODB_URI = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
}
if (!MONGODB_URI) { console.error('❌ MONGODB_URI no encontrado'); process.exit(1); }

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db();

// 1. Listar todas las reuniones
const meetings = await db.collection('meetings').find({}).toArray();
console.log(`\n📋 Total reuniones en DB: ${meetings.length}`);
for (const m of meetings) {
  const raceCount = await db.collection('races').countDocuments({ meetingId: m._id });
  console.log(`  • _id=${m._id} | meetingNumber=${m.meetingNumber} | date=${m.date?.toISOString?.()?.slice(0,10)} | carreras=${raceCount}`);
}

// 2. Identificar basura: meetingNumber=0 o meetingNumber=5 con 0-1 carreras en fechas no reales
// Pregunta: ¿eliminar automáticamente meetingNumber=0?
const trash = meetings.filter(m => m.meetingNumber === 0);
const suspicious = meetings.filter(m => {
  if (m.meetingNumber === 0) return false; // ya en trash
  // Reuniones con 0 carreras
  return false; // las listamos pero no borramos automáticamente
});

if (trash.length === 0) {
  console.log('\n✅ No hay reuniones con meetingNumber=0');
} else {
  console.log(`\n🗑️  Eliminando ${trash.length} reunión(es) con meetingNumber=0...`);
  for (const m of trash) {
    // Eliminar carreras asociadas
    const raceDel = await db.collection('races').deleteMany({ meetingId: m._id });
    // Eliminar forecasts asociados
    const fcDel = await db.collection('forecasts').deleteMany({ meetingId: m._id });
    // Eliminar la reunión
    await db.collection('meetings').deleteOne({ _id: m._id });
    console.log(`  ✓ Eliminada reunión _id=${m._id} | ${raceDel.deletedCount} carreras | ${fcDel.deletedCount} forecasts`);
  }
}

// 3. Listar reuniones con 0 carreras para revisión manual
console.log('\n🔍 Reuniones con 0 carreras (para revisión):');
let found = false;
for (const m of meetings) {
  if (trash.find(t => t._id.equals(m._id))) continue;
  const raceCount = await db.collection('races').countDocuments({ meetingId: m._id });
  if (raceCount === 0) {
    console.log(`  ⚠️  _id=${m._id} | meetingNumber=${m.meetingNumber} | date=${m.date?.toISOString?.()?.slice(0,10)} — SIN CARRERAS`);
    found = true;
  }
}
if (!found) console.log('  Ninguna.');

await client.close();
console.log('\n✅ Listo.');
