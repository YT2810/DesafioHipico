/**
 * One-time migration: fix POOL_4 → POOL_DE_4 and DOBLE_SELECCION/QUINELA → remove
 * in Race.games array for all existing documents.
 *
 * Run: npx tsx scripts/migrate-pool4.ts
 */
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env / .env.local manually (handles values with = signs)
for (const envFile of ['.env', '.env.local']) {
  try {
    const envPath = resolve(process.cwd(), envFile);
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const idx = line.indexOf('=');
      if (idx < 0 || line.trimStart().startsWith('#')) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key) process.env[key] = val;
    }
  } catch { /* file not present, skip */ }
}

const MONGODB_URI = process.env.MONGODB_URI!;

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const races = db.collection('races');

  // 1. Rename POOL_4 → POOL_DE_4
  const r1 = await races.updateMany(
    { games: 'POOL_4' },
    { $set: { 'games.$[el]': 'POOL_DE_4' } },
    { arrayFilters: [{ el: 'POOL_4' }] }
  );
  console.log(`POOL_4 → POOL_DE_4: ${r1.modifiedCount} docs`);

  // 2. Remove stale values that no longer exist in enum
  const r2 = await races.updateMany(
    { games: { $in: ['QUINELA', 'DOBLE_SELECCION'] } },
    { $pull: { games: { $in: ['QUINELA', 'DOBLE_SELECCION'] } } } as any
  );
  console.log(`Removed QUINELA/DOBLE_SELECCION: ${r2.modifiedCount} docs`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
