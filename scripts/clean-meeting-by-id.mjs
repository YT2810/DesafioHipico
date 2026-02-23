/**
 * Elimina una reunión específica por _id junto con sus carreras y forecasts.
 * Usage: node scripts/clean-meeting-by-id.mjs <meetingId>
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoClient, ObjectId } from 'mongodb';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const meetingId = process.argv[2]?.trim();
if (!meetingId) { console.error('❌ Uso: node scripts/clean-meeting-by-id.mjs <meetingId>'); process.exit(1); }

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db();

const oid = new ObjectId(meetingId);
const meeting = await db.collection('meetings').findOne({ _id: oid });
if (!meeting) { console.error(`❌ Reunión ${meetingId} no encontrada`); await client.close(); process.exit(1); }

console.log(`\n📋 Reunión a eliminar:`);
console.log(`  meetingNumber=${meeting.meetingNumber} | date=${meeting.date?.toISOString?.()?.slice(0,10)}`);

const raceDel = await db.collection('races').deleteMany({ meetingId: oid });
const fcDel = await db.collection('forecasts').deleteMany({ meetingId: oid });
const expertFcDel = await db.collection('expertforecasts').deleteMany({ meetingId: oid }).catch(() => ({ deletedCount: 0 }));
await db.collection('meetings').deleteOne({ _id: oid });

console.log(`✅ Eliminada: ${raceDel.deletedCount} carreras | ${fcDel.deletedCount} forecasts | ${expertFcDel.deletedCount} expertForecasts`);
await client.close();
