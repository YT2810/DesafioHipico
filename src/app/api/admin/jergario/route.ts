import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import JargonEntry from '@/models/JargonEntry';

// GET — listar todas las entradas del jergario
export async function GET() {
  const session = await auth();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await connectMongo();
  const entries = await JargonEntry.find({}).sort({ hitCount: -1, phrase: 1 }).lean();
  return NextResponse.json({ entries });
}

// POST — crear nueva entrada manual
export async function POST(req: NextRequest) {
  const session = await auth();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { phrase, intent, keywords, description, example, synonyms } = body;

  if (!phrase || !intent || !description) {
    return NextResponse.json({ error: 'Faltan campos: phrase, intent, description' }, { status: 400 });
  }

  await connectMongo();

  const existing = await JargonEntry.findOne({ phrase: phrase.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json({ error: 'Ya existe una entrada con esa frase' }, { status: 409 });
  }

  const entry = await JargonEntry.create({
    phrase: phrase.toLowerCase().trim(),
    intent,
    keywords: keywords ?? [phrase.toLowerCase().trim()],
    description,
    example: example ?? '',
    synonyms: synonyms ?? [],
    source: 'manual',
    public: true,
  });

  return NextResponse.json({ entry });
}

// PUT — actualizar entrada existente
export async function PUT(req: NextRequest) {
  const session = await auth();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Falta id' }, { status: 400 });
  }

  await connectMongo();
  const entry = await JargonEntry.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
  if (!entry) {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  }

  return NextResponse.json({ entry });
}

// DELETE — eliminar entrada
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Falta id' }, { status: 400 });
  }

  await connectMongo();
  await JargonEntry.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
