/**
 * Usage: node scripts/make-admin.mjs tu@correo.com
 * Creates or updates the user with that email to have roles: ['admin', 'customer']
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoClient } from 'mongodb';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env manually
const envPath = join(__dirname, '../.env');
const envVars = {};
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
}

const MONGODB_URI = envVars.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌  MONGODB_URI no encontrado en .env'); process.exit(1); }

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('❌  Uso: node scripts/make-admin.mjs tu@correo.com');
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);
await client.connect();

const db = client.db();
const users = db.collection('users');

const result = await users.findOneAndUpdate(
  { email },
  {
    $set:         { email, roles: ['admin', 'customer'], alias: email.split('@')[0] },
    $setOnInsert: { balance: { golds: 0, diamonds: 0 }, meetingConsumptions: [], followedHandicappers: [], createdAt: new Date() },
  },
  { upsert: true, returnDocument: 'after' }
);

console.log(`✅  Usuario admin listo:`);
console.log(`   _id   : ${result._id}`);
console.log(`   email : ${result.email}`);
console.log(`   roles : ${JSON.stringify(result.roles)}`);

await client.close();
