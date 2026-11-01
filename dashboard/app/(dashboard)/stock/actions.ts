'use server';

import { z } from 'zod';
import { check, crearAccion, fechaMs } from '@/lib/db/actions';
import { parseCsvRFID } from '@/lib/calc/csv';
import type { Animal } from '@/lib/db/types';

const animalSchema = z.object({
  id_caravana: z.string().trim().min(1, 'obligatorio'),
  rfid: z.string().trim().optional(),
  sexo: z.enum(['M', 'H']),
  categoria: z.string().min(1),
  raza: z.string().trim().optional(),
  fecha_nacimiento: z.string().optional(),
  peso_actual: z.coerce.number().positive().optional(),
  lote_id: z.string().optional(),
  potrero_id: z.string().optional(),
});

export const crearAnimal = crearAccion(
  animalSchema,
  async (d, supabase) => {
    const ahora = Date.now();
    const { data, error } = await supabase
      .from('animals')
      .insert({
        ...d,
        rfid: d.rfid ?? null,
        raza: d.raza ?? null,
        fecha_nacimiento: d.fecha_nacimiento ? fechaMs(d.fecha_nacimiento) : null,
        lote_id: d.lote_id ?? null,
        potrero_id: d.potrero_id ?? null,
        estado: 'ACTIVO',
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    if (d.peso_actual) {
      check(await supabase.from('eventos').insert({ animal_id: data.id, tipo: 'PESAJE', valor: d.peso_actual, timestamp: ahora }));
    }
    return `Animal ${d.id_caravana} creado`;
  },
  { revalidate: ['/stock', '/'] },
);

export const editarAnimal = crearAccion(
  animalSchema.extend({
    id: z.string().min(1),
    estado: z.enum(['ACTIVO', 'VENDIDO', 'MUERTO', 'DESCARTE']),
  }),
  async (d, supabase) => {
    const { data: prev } = await supabase.from('animals').select('lote_id, potrero_id, peso_actual').eq('id', d.id).single();
    check(
      await supabase
        .from('animals')
        .update({
          id_caravana: d.id_caravana,
          rfid: d.rfid ?? null,
          sexo: d.sexo,
          categoria: d.categoria,
          raza: d.raza ?? null,
          fecha_nacimiento: d.fecha_nacimiento ? fechaMs(d.fecha_nacimiento) : null,
          peso_actual: d.peso_actual ?? null,
          estado: d.estado,
          lote_id: d.lote_id ?? null,
          potrero_id: d.potrero_id ?? null,
        })
        .eq('id', d.id),
    );
    const ahora = Date.now();
    if (prev && (prev.lote_id !== (d.lote_id ?? null) || prev.potrero_id !== (d.potrero_id ?? null))) {
      check(
        await supabase.from('animal_movements').insert({
          animal_id: d.id,
          lote_origen_id: prev.lote_id,
          lote_destino_id: d.lote_id ?? null,
          potrero_origen_id: prev.potrero_id,
          potrero_destino_id: d.potrero_id ?? null,
          fecha: ahora,
        }),
      );
    }
    if (d.peso_actual && prev?.peso_actual !== d.peso_actual) {
      check(await supabase.from('eventos').insert({ animal_id: d.id, tipo: 'PESAJE', valor: d.peso_actual, timestamp: ahora }));
    }
  },
  { revalidate: ['/stock', '/stock/[id]', '/'] },
);

export const confirmarRecategorizacion = crearAccion(
  z.object({ cambio: z.union([z.string(), z.array(z.string())]) }),
  async (d, supabase) => {
    // Cada valor viene como "animalId|categoriaNueva".
    const cambios = (Array.isArray(d.cambio) ? d.cambio : [d.cambio]).map((c) => c.split('|'));
    for (const [id, categoria] of cambios) {
      check(await supabase.from('animals').update({ categoria }).eq('id', id));
    }
    return `${cambios.length} animales recategorizados`;
  },
  { revalidate: ['/stock', '/'] },
);

export const importarCsvRFID = crearAccion(
  z.object({
    csv: z.string().min(1, 'pegá o subí el archivo'),
    sexo: z.enum(['M', 'H']),
    categoria: z.string().min(1),
    lote_id: z.string().optional(),
    potrero_id: z.string().optional(),
  }),
  async (d, supabase) => {
    const { filas, errores } = parseCsvRFID(d.csv);
    if (!filas.length) throw new Error(errores[0] ?? 'No se encontraron filas válidas');

    const { data: existentes } = await supabase.from('animals').select('id, rfid, id_caravana');
    const porRfid = new Map((existentes ?? []).filter((a) => a.rfid).map((a) => [a.rfid as string, a.id as string]));
    const porCaravana = new Map((existentes ?? []).map((a) => [a.id_caravana as string, a.id as string]));

    let nuevos = 0;
    let pesadas = 0;
    const ahora = Date.now();
    const eventos: { animal_id: string; tipo: string; valor: number; timestamp: number }[] = [];
    const nuevosAnimales: Partial<Animal>[] = [];

    for (const f of filas) {
      const id = (f.rfid && porRfid.get(f.rfid)) || (f.caravana && porCaravana.get(f.caravana)) || null;
      if (id) {
        if (f.peso) {
          eventos.push({ animal_id: id, tipo: 'PESAJE', valor: f.peso, timestamp: f.fecha ?? ahora });
          check(await supabase.from('animals').update({ peso_actual: f.peso }).eq('id', id));
          pesadas++;
        }
        continue;
      }
      const nuevoId = crypto.randomUUID();
      nuevosAnimales.push({
        id: nuevoId,
        id_caravana: f.caravana ?? f.rfid!.slice(-6),
        rfid: f.rfid,
        sexo: f.sexo ?? d.sexo,
        categoria: f.categoria ?? d.categoria,
        raza: f.raza,
        peso_actual: f.peso,
        estado: 'ACTIVO',
        lote_id: d.lote_id ?? null,
        potrero_id: d.potrero_id ?? null,
      });
      if (f.rfid) porRfid.set(f.rfid, nuevoId);
      if (f.peso) eventos.push({ animal_id: nuevoId, tipo: 'PESAJE', valor: f.peso, timestamp: f.fecha ?? ahora });
      nuevos++;
    }
    if (nuevosAnimales.length) check(await supabase.from('animals').insert(nuevosAnimales));
    if (eventos.length) check(await supabase.from('eventos').insert(eventos));
    return `${nuevos} animales nuevos, ${pesadas} pesadas registradas${errores.length ? `, ${errores.length} líneas ignoradas` : ''}`;
  },
  { revalidate: ['/stock', '/'] },
);
