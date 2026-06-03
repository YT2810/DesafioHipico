import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Horse from '@/models/Horse';
import Entry from '@/models/Entry';

export async function GET() {
  await connectDB();

  const report: Record<string, unknown> = {};

  // 1. Horses con nationality separada
  const horsesWithNationality = await Horse.find({ nationality: { $exists: true, $ne: null } })
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();
  report.horsesWithNationality = horsesWithNationality.map((h) => ({
    name: h.name,
    nationality: h.nationality,
  }));
  report.horsesWithNationalityCount = await Horse.countDocuments({
    nationality: { $exists: true, $ne: null },
  });

  // 2. Horses con precio reclamo en el nombre (debería ser 0)
  report.horsesWithPriceInName = await Horse.countDocuments({
    name: { $regex: /PRECIO|\$/i },
  });

  // 3. Horses con país en el nombre (debería ser 0 si Gemini funciona bien)
  report.horsesWithCountryInName = await Horse.countDocuments({
    name: { $regex: /\(USA\)|\(CHI\)|\(ARG\)|\(PAN\)|\(PER\)/i },
  });

  // 4. Entries recientes: weightRaw vs weight
  const recentEntries = await Entry.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  report.recentEntries = recentEntries.map((e) => ({
    horseName: e.horseName,
    weightRaw: e.weightRaw,
    weight: e.weight,
    implements: e.implements,
    medication: e.medication,
  }));

  // 5. Entries con implements separado
  report.entriesWithImplements = await Entry.countDocuments({
    implements: { $exists: true, $ne: null },
  });

  // 6. Total horses para contexto
  report.totalHorses = await Horse.countDocuments();
  report.totalEntries = await Entry.countDocuments();

  return NextResponse.json(report);
}
