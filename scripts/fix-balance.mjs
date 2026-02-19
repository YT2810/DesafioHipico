/**
 * One-time migration: fix users where balance=0 (number) instead of {golds:0, diamonds:0}
 * Run: node scripts/fix-balance.mjs
 */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;

const result = await db.collection('users').updateMany(
  { balance: { $not: { $type: 'object' } } },
  { $set: { balance: { golds: 0, diamonds: 0 } } }
);

console.log(`Fixed ${result.modifiedCount} users with invalid balance field.`);
await mongoose.disconnect();
