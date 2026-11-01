'use server';

import { z } from 'zod';
import { finCarencia } from '@/lib/calc/sanidad';
import { check, crearAccion, fechaMs } from '@/lib/db/actions';

const RUTAS = ['/sanidad', '/stock', '/'];

export const registrarAplicacion = crearAccion(
  z.object({
    destino: z.enum(['lote', 'animal']),
    lote_id: z.string().optional(),
    caravana: z.string().trim().optional(),
    operation_id: z.string().min(1, 'elegí el producto'),
    fecha: z.string().min(1),
    dosis: z.coerce.number().positive().optional(),
    producto_lote: z.string().trim().optional(),
    acta_numero: z.string().trim().optional(),
    responsable: z.string().trim().optional(),
    scheduled_id: z.string().optional(),
  }),
  async (d, supabase) => {
    let animal_id: string | null = null;
    let lote_id: string | null = null;
    if (d.destino === 'animal') {
      if (!d.caravana) throw new Error('Indicá la caravana');
      const { data } = await supabase.from('animals').select('id').eq('id_caravana', d.caravana).maybeSingle();
      if (!data) throw new Error(`No existe la caravana ${d.caravana}`);
      animal_id = data.id;
    } else {
      if (!d.lote_id) throw new Error('Elegí el lote');
      lote_id = d.lote_id;
    }
    const { data: op } = await supabase.from('operations_catalog').select('dias_carencia').eq('id', d.operation_id).single();
    const fecha = fechaMs(d.fecha);
    check(
      await supabase.from('operation_logs').insert({
        animal_id,
        lote_id,
        operation_id: d.operation_id,
        fecha_aplicacion: fecha,
        fecha_fin_carencia: finCarencia(fecha, op?.dias_carencia),
        dosis: d.dosis ?? null,
        producto_lote: d.producto_lote ?? null,
        acta_numero: d.acta_numero ?? null,
        responsable: d.responsable ?? null,
      }),
    );
    if (d.scheduled_id) {
      check(await supabase.from('scheduled_operations').update({ estado: 'COMPLETADO' }).eq('id', d.scheduled_id));
    }
    return 'Aplicación registrada';
  },
  { revalidate: RUTAS },
);

export const programarOperacion = crearAccion(
  z.object({
    operation_id: z.string().min(1),
    lote_id: z.string().optional(),
    fecha: z.string().min(1),
  }),
  async (d, supabase) => {
    check(
      await supabase
        .from('scheduled_operations')
        .insert({ operation_id: d.operation_id, lote_id: d.lote_id ?? null, fecha_programada: fechaMs(d.fecha), estado: 'PENDIENTE' }),
    );
    return 'Operación programada';
  },
  { revalidate: RUTAS },
);

export const cambiarEstadoProgramada = crearAccion(
  z.object({ id: z.string().min(1), estado: z.enum(['PENDIENTE', 'COMPLETADO', 'CANCELADO']) }),
  async (d, supabase) => {
    check(await supabase.from('scheduled_operations').update({ estado: d.estado }).eq('id', d.id));
  },
  { revalidate: RUTAS },
);

export const crearProducto = crearAccion(
  z.object({
    nombre: z.string().trim().min(1),
    tipo: z.enum(['VACUNA', 'TRATAMIENTO', 'IATF']),
    dias_carencia: z.coerce.number().min(0).optional(),
    costo_unitario: z.coerce.number().min(0).optional(),
    notas: z.string().trim().optional(),
  }),
  async (d, supabase) => {
    check(
      await supabase.from('operations_catalog').insert({
        ...d,
        dias_carencia: d.dias_carencia ?? null,
        costo_unitario: d.costo_unitario ?? null,
        notas: d.notas ?? null,
      }),
    );
    return `${d.nombre} agregado`;
  },
  { revalidate: ['/sanidad'] },
);
