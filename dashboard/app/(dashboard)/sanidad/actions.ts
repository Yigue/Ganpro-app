'use server';

import { z } from 'zod';
import {runOperation} from '@/lib/commands/rpc';
import {operationMessage} from '@/lib/commands/message';
import { check, crearAccion, fechaMs, fechaOperacionMs } from '@/lib/db/actions';

const RUTAS = ['/sanidad', '/stock', '/'];

export const registrarAplicacion = crearAccion(
  z.object({
    destino: z.enum(['lote', 'animal','rodeo']),
    lote_id: z.string().optional(),
    caravana: z.string().trim().optional(),
    operation_id: z.string().min(1, 'elegí el producto'),
    fecha: z.string().min(1),
    dosis: z.coerce.number().positive().optional(),
    insumo_id:z.string().optional(),partida_id:z.string().optional(),
    producto_lote: z.string().trim().optional(),
    acta_numero: z.string().trim().optional(),
    responsable: z.string().trim().optional(),
    scheduled_id: z.string().optional(),
  }),
  async (d,supabase)=>operationMessage(await runOperation(supabase,'health.apply',{...d,fecha:fechaOperacionMs(d.fecha)})),
  { name: 'sanidad.registrarAplicacion', revalidate: RUTAS },
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
  { name: 'sanidad.programarOperacion', revalidate: RUTAS },
);

export const cambiarEstadoProgramada = crearAccion(
  z.object({ id: z.string().min(1), estado: z.enum(['PENDIENTE', 'COMPLETADO', 'CANCELADO']) }),
  async(d,supabase)=>operationMessage(await runOperation(supabase,'health.schedule-status',d)),
  { name: 'sanidad.cambiarEstadoProgramada', revalidate: RUTAS },
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
  { name: 'sanidad.crearProducto', revalidate: ['/sanidad'] },
);
