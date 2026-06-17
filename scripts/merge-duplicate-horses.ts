import mongoose from 'mongoose';
const URI = process.env.MONGODB_URI!;
async function main() {
  await mongoose.connect(URI);
  const db = mongoose.connection.db!;
  const horses = db.collection('horses');
  const entries = db.collection('entries');
  const all = await horses.find({}).toArray();
  const withCountry = all.filter(h => /\([A-Z]{2,4}\)\s*$/.test(h.name));
  const withoutCountry = all.filter(h => !/\([A-Z]{2,4}\)\s*$/.test(h.name));
  let merged = 0;
  for (const canon of withCountry) {
    const base = canon.name.replace(/\s*\([A-Z]{2,4}\)\s*$/, '').trim().toUpperCase();
    const dupe = withoutCountry.find(h => h.name.trim().toUpperCase() === base);
    if (!dupe) continue;
    const n = await entries.countDocuments({ horseId: dupe._id });
    if (n > 0) await entries.updateMany({ horseId: dupe._id }, { $set: { horseId: canon._id } });
    await horses.deleteOne({ _id: dupe._id });
    console.log(`MERGED "${dupe.name}" (${n} entries) -> "${canon.name}"`);
    merged++;
  }
  console.log(`Done: ${merged} merged.`);
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
