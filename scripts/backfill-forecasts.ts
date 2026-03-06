/**
 * Backfill: evaluate all forecasts that have raceId pointing to a finished race
 * but don't yet have result.evaluated = true.
 *
 * Run: npx tsx scripts/backfill-forecasts.ts
 */
import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env / .env.local manually
for (const envFile of ['.env', '.env.local']) {
  try {
    const lines = readFileSync(resolve(process.cwd(), envFile), 'utf-8').split('\n');
    for (const line of lines) {
      const idx = line.indexOf('=');
      if (idx < 0 || line.trimStart().startsWith('#')) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (key) process.env[key] = val;
    }
  } catch { /* skip */ }
}

const MONGODB_URI = process.env.MONGODB_URI!;

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const forecastsColl = db.collection('forecasts');
  const entriesColl = db.collection('entries');
  const racesColl = db.collection('races');

  // Find all forecasts not yet evaluated
  const forecasts = await forecastsColl.find({
    $or: [
      { 'result.evaluated': { $ne: true } },
      { result: { $exists: false } },
    ],
  }).toArray();

  console.log(`Found ${forecasts.length} unevaluated forecasts`);

  let evaluated = 0;
  let skipped = 0;

  for (const fc of forecasts) {
    const raceId = fc.raceId;
    if (!raceId) { skipped++; continue; }

    // Get finished entries for this race
    const entries = await entriesColl.find({
      raceId,
      'result.finishPosition': { $exists: true },
      'result.isScratched': { $ne: true },
    }).toArray();

    if (entries.length === 0) { skipped++; continue; }

    // Build posMap: dorsalNumber → finishPosition
    const posMap: Record<number, number> = {};
    for (const e of entries) {
      if (e.result?.finishPosition) posMap[e.dorsalNumber] = e.result.finishPosition;
    }

    const winner1st = Object.entries(posMap).find(([, p]) => p === 1)?.[0];
    const winner2nd = Object.entries(posMap).find(([, p]) => p === 2)?.[0];
    const winner3rd = Object.entries(posMap).find(([, p]) => p === 3)?.[0];

    if (!winner1st) { skipped++; continue; }

    // Sort marks by preferenceOrder
    const marks: { preferenceOrder: number; dorsalNumber?: number }[] = fc.marks ?? [];
    const sorted = [...marks].sort((a, b) => a.preferenceOrder - b.preferenceOrder);
    const dorsals = sorted.map(m => m.dorsalNumber?.toString());

    const hasOrder = sorted.some(m => m.dorsalNumber != null);
    const hit1st = hasOrder && dorsals[0] === winner1st;
    const hit2nd = hasOrder && dorsals.slice(0, 2).includes(winner1st);
    const hit3rd = hasOrder && dorsals.slice(0, 3).includes(winner1st);
    const hitAny = dorsals.includes(winner1st);

    await forecastsColl.updateOne(
      { _id: fc._id },
      {
        $set: {
          'result.evaluated': true,
          'result.evaluatedAt': new Date(),
          'result.hit1st': hasOrder ? hit1st : false,
          'result.hit2nd': hasOrder ? hit2nd : false,
          'result.hit3rd': hasOrder ? hit3rd : false,
          'result.hitAny': hitAny,
        },
      }
    );
    evaluated++;

    // Progress
    if (evaluated % 20 === 0) process.stdout.write(`  ${evaluated} evaluated...\r`);
  }

  console.log(`\nDone. Evaluated: ${evaluated}, Skipped (no race data): ${skipped}`);

  // Summary per handicapper
  const pipeline = [
    { $match: { 'result.evaluated': true } },
    {
      $group: {
        _id: '$handicapperId',
        total: { $sum: 1 },
        hit1st: { $sum: { $cond: ['$result.hit1st', 1, 0] } },
        hitAny: { $sum: { $cond: ['$result.hitAny', 1, 0] } },
      },
    },
  ];
  const summary = await forecastsColl.aggregate(pipeline).toArray();
  console.log('\n── Resumen por handicapper ──────────────────');
  for (const s of summary) {
    const e1 = s.total > 0 ? ((s.hit1st / s.total) * 100).toFixed(1) : '—';
    const eg = s.total > 0 ? ((s.hitAny / s.total) * 100).toFixed(1) : '—';
    console.log(`  ${s._id} → ${s.total} carreras | E1: ${e1}% | E-Gral: ${eg}%`);
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
