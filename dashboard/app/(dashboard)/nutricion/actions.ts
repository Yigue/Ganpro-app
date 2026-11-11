'use server';
import {InputError} from '@/lib/commands/errors';

import { z } from 'zod';
import {runOperation} from '@/lib/commands/rpc';
import {operationMessage} from '@/lib/commands/message';
import { check, crearAccion, fechaMs } from '@/lib/db/actions';

const RUTAS = ['/nutricion', '/costos', '/'];

export const guardarFormula = crearAccion(
  z.object({ racion_id: z.string().min(1), formula: z.string().min(2) }),
  async (d, supabase) => {
    let raw:unknown;try{raw=JSON.parse(d.formula);}catch{throw new InputError({formula:['Revisá la fórmula.']});}
    const result=z.array(z.object({suplemento_id:z.string().min(1),porcentaje:z.number().positive().max(100)})).safeParse(raw);
    if(!result.success)throw new InputError({formula:['Revisá los ingredientes y porcentajes.']});
    return operationMessage(await runOperation(supabase,'nutrition.formula',{racion_id:d.racion_id,items:result.data}));
  },
  { name: 'nutricion.guardarFormula', revalidate: RUTAS },
);

export const crearRacion = crearAccion(
  z.object({ nombre: z.string().trim().min(1), descripcion: z.string().trim().optional() }),
  async (d, supabase) => {
    check(await supabase.from('raciones').insert({ nombre: d.nombre, descripcion: d.descripcion ?? null, activa: true }));
    return `Ración ${d.nombre} creada`;
  },
  { name: 'nutricion.crearRacion', revalidate: RUTAS },
);

export const guardarSuplemento = crearAccion(
  z.object({
    id: z.string().optional(),
    nombre: z.string().trim().min(1),
    tipo: z.enum(['MAIZ', 'SILO', 'HENO', 'PELLET', 'UREA', 'OTRO']),
    materia_seca_pct: z.coerce.number().min(0).max(100),
    proteina_bruta_pct: z.coerce.number().min(0).optional(),
    precio_por_tonelada: z.coerce.number().min(0).optional(),
    stock_kg: z.coerce.number().min(0).optional(),
    stock_minimo_kg: z.coerce.number().min(0).optional(),
    proveedor: z.string().trim().optional(),
  }),
  async ({ id, ...d }, supabase) => {
    const fila = {
      ...d,
      proteina_bruta_pct: d.proteina_bruta_pct ?? null,
      precio_por_tonelada: d.precio_por_tonelada ?? null,
      stock_kg: d.stock_kg ?? null,
      stock_minimo_kg: d.stock_minimo_kg ?? null,
      proveedor: d.proveedor ?? null,
    };
    check(id ? await supabase.from('suplementos').update(fila).eq('id', id) : await supabase.from('suplementos').insert(fila));
    return `${d.nombre} guardado`;
  },
  { name: 'nutricion.guardarSuplemento', revalidate: RUTAS },
);

export const registrarEntrega = crearAccion(
  z.object({
    potrero_id: z.string().min(1),
    lote_id:z.string().min(1),
    racion_id: z.string().min(1),
    cantidad_kg: z.coerce.number().positive(),
    fecha: z.string().min(1),
    descontar_stock: z.string().optional(),
    notas: z.string().trim().optional(),
  }),
  async(d,supabase)=>operationMessage(await runOperation(supabase,'nutrition.deliver',{...d,fecha:fechaMs(d.fecha)})),
  { name: 'nutricion.registrarEntrega', revalidate: RUTAS },
);
