/**
 * POST /api/admin/fix-claim-names
 *
 * Script de limpieza ONE-TIME para caballos guardados con precio de reclamo
 * pegado al nombre: "MASTER SHOT Precio $: 18000,00" → "MASTER SHOT"
 *
 * Solo admin. Devuelve lista de nombres corregidos.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import connectMongo from '@/lib/mongodb';
import Horse from '@/models/Horse';

const PRECIO_REGEX = /\s+Precio\s+\$[\s:,.\d]+$/i;

export async function POST(req: NextRequest) {
  const session = await auth();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await connectMongo();

  // Buscar todos los caballos cuyo nombre contenga "Precio $"
  const dirty = await Horse.find({ name: /Precio\s+\$/i }).lean() as any[];

  if (dirty.length === 0) {
    return NextResponse.json({ message: 'No hay nombres con precio para limpiar.', fixed: [] });
  }

  const fixed: Array<{ id: string; oldName: string; newName: string }> = [];
  const errors: Array<{ id: string; oldName: string; error: string }> = [];

  for (const horse of dirty) {
    const oldName: string = horse.name;
    const newName = oldName.replace(PRECIO_REGEX, '').trim();

    if (newName === oldName) continue; // regex no matcheó, saltar

    try {
      // Verificar si ya existe un caballo con el nombre limpio
      const existing = await Horse.findOne({ name: newName, _id: { $ne: horse._id } }).lean() as any;

      if (existing) {
        // Ya existe con el nombre correcto — eliminar el duplicado con precio
        await Horse.findByIdAndDelete(horse._id);
        fixed.push({ id: horse._id.toString(), oldName, newName: `[ELIMINADO — ya existe ${newName}]` });
      } else {
        // Renombrar
        await Horse.findByIdAndUpdate(horse._id, { $set: { name: newName } });
        fixed.push({ id: horse._id.toString(), oldName, newName });
      }
    } catch (err) {
      errors.push({ id: horse._id.toString(), oldName, error: String(err) });
    }
  }

  return NextResponse.json({
    message: `Limpieza completada. ${fixed.length} nombres corregidos, ${errors.length} errores.`,
    fixed,
    errors,
  });
}

// GET: solo previsualizar qué se va a corregir, sin tocar la BD
export async function GET(req: NextRequest) {
  const session = await auth();
  const roles: string[] = (session?.user as any)?.roles ?? [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await connectMongo();

  const dirty = await Horse.find({ name: /Precio\s+\$/i }).lean() as any[];

  const preview = dirty.map((h: any) => ({
    id: h._id.toString(),
    currentName: h.name,
    cleanedName: h.name.replace(PRECIO_REGEX, '').trim(),
  }));

  return NextResponse.json({
    count: preview.length,
    preview,
  });
}
