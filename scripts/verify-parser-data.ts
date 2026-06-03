import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI env var');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const db = mongoose.connection.db!;

  // 1. Horses con nationality separada
  const horsesWithNationality = await db
    .collection('horses')
    .find({ nationality: { $exists: true, $ne: null } })
    .sort({ updatedAt: -1 })
    .limit(10)
    .toArray();
  console.log('\n--- 1. Horses con nationality ---');
  console.log('Count:', horsesWithNationality.length);
  horsesWithNationality.forEach((h) => console.log(`  ${h.name} -> nationality: "${h.nationality}"`));

  // 1b. Horses creados en últimas 48h
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentHorses = await db
    .collection('horses')
    .find({ createdAt: { $gte: cutoff } })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
  console.log('\n--- 1b. Horses creados últimas 48h ---');
  console.log('Count:', recentHorses.length);
  recentHorses.forEach((h) => console.log(`  ${h.name} | nationality: ${h.nationality || '(null)'} | createdAt: ${h.createdAt}`));

  // 2. Horses con precio reclamo en el nombre
  const priceInName = await db
    .collection('horses')
    .countDocuments({ name: { $regex: /PRECIO|\$/i } });
  console.log('\n--- 2. Horses con precio en nombre ---');
  console.log('Count (debe ser 0):', priceInName);

  // 3. Horses con país en el nombre
  const countryInName = await db
    .collection('horses')
    .countDocuments({ name: { $regex: /\(USA\)|\(CHI\)|\(ARG\)|\(PAN\)|\(PER\)/i } });
  console.log('\n--- 3. Horses con país en nombre ---');
  console.log('Count (debe ser 0 para nuevos):', countryInName);

  // 4. Entries recientes: weightRaw vs weight
  const recentEntries = await db
    .collection('entries')
    .find()
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
  console.log('\n--- 4. Recent entries (weightRaw vs weight) ---');
  recentEntries.forEach((e) =>
    console.log(`  ${e.horseName || e.name || '(no name)'}: weightRaw="${e.weightRaw}" weight=${e.weight} implements="${e.implements || ''}" createdAt=${e.createdAt}`)
  );

  // 5. Entries con implements separado
  const entriesWithImplements = await db
    .collection('entries')
    .countDocuments({ implements: { $exists: true, $ne: null } });
  console.log('\n--- 5. Entries con implements separado ---');
  console.log('Count:', entriesWithImplements);

  // 6. Totales
  const totalHorses = await db.collection('horses').countDocuments();
  const totalEntries = await db.collection('entries').countDocuments();
  console.log('\n--- Totals ---');
  console.log('Total horses:', totalHorses);
  console.log('Total entries:', totalEntries);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
