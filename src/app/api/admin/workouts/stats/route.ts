import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import WorkoutEntry from '@/models/WorkoutEntry';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectMongo();

  const agg = await WorkoutEntry.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$workoutDate' } },
        count: { $sum: 1 },
        withRm: { $sum: { $cond: [{ $and: [{ $gt: ['$rm', null] }] }, 1, 0] } },
        withSplits: { $sum: { $cond: [{ $gt: ['$splits', ''] }, 1, 0] } },
        // Names matching jockey pattern X.APELLIDO (no space) = bad parse
        badNames: {
          $sum: {
            $cond: [
              { $regexMatch: { input: '$horseName', regex: /^[A-Z]{1,3}\.[A-Z][A-Z]+$/ } },
              1, 0,
            ],
          },
        },
        sourceFiles: { $addToSet: '$sourceFile' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const total = agg.reduce((s, r) => s + r.count, 0);
  const totalRm = agg.reduce((s, r) => s + r.withRm, 0);
  const totalBad = agg.reduce((s, r) => s + r.badNames, 0);

  // Sample of bad names
  const badSamples = await WorkoutEntry.find({
    horseName: { $regex: /^[A-Z]{1,3}\.[A-Z][A-Z]+$/ },
  }).limit(10).select('horseName workoutDate sourceFile').lean();

  // Sample workouts to check rm values
  const rmSamples = await WorkoutEntry.find({ rm: { $ne: null } })
    .limit(10).select('horseName splits workoutType rm sourceFile').lean();

  const noRmSamples = await WorkoutEntry.find({ rm: null })
    .limit(5).select('horseName splits workoutType rm sourceFile').lean();

  return NextResponse.json({ total, totalRm, totalBad, byDate: agg, badSamples, rmSamples, noRmSamples });
}
