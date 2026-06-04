/**
 * fix-annual-race-numbers.ts
 *
 * Migración: corrige annualRaceNumber erróneos en la colección Race.
 * El parser Gemini anterior concatenaba raceNumber + annualRaceNumber.
 * Los anuales válidos son 1-999. Cualquier valor > 999 es incorrecto.
 *
 * Estrategia: para valores > 999, el número correcto son los últimos 3 dígitos.
 * Ej: 28254 → 254, 12255 → 255, 1266 → 266
 *
 * Uso: npx ts-node -e "require('dotenv').config({path:'.env.local'})" scripts/fix-annual-race-numbers.ts
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('MONGODB_URI no está definida');

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Conectado a MongoDB');

  const db = mongoose.connection.db!;
  const races = db.collection('races');

  // Buscar todas las carreras con annualRaceNumber > 999 (claramente erróneos)
  const badRaces = await races.find({ annualRaceNumber: { $gt: 999 } }).toArray();
  console.log(`Carreras con annualRaceNumber erróneos: ${badRaces.length}`);

  if (badRaces.length === 0) {
    console.log('Nada que corregir.');
    await mongoose.disconnect();
    return;
  }

  let fixed = 0;
  let skipped = 0;

  for (const race of badRaces) {
    const bad = race.annualRaceNumber as number;
    // Tomar los últimos 3 dígitos
    const corrected = bad % 1000;

    if (corrected === 0 || corrected > 999) {
      console.warn(`  SKIP _id=${race._id} annualRaceNumber=${bad} → corrected=${corrected} (inválido)`);
      skipped++;
      continue;
    }

    await races.updateOne({ _id: race._id }, { $set: { annualRaceNumber: corrected } });
    console.log(`  FIX  _id=${race._id} raceNumber=${race.raceNumber} ${bad} → ${corrected}`);
    fixed++;
  }

  console.log(`\nResultado: ${fixed} corregidas, ${skipped} saltadas.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
