'use server';

import { z } from 'zod';
import { check, crearAccion, fechaMs } from '@/lib/db/actions';

const RUTAS = ['/nutricion', '/costos', '/'];

export const guardarFormula = crearAccion(
  z.object({ racion_id: z.string().min(1), formula: z.string().min(2) }),
  async (d, supabase) => {
    const items = z
      .array(z.object({ suplemento_id: z.string().min(1), porcentaje: z.number().positive().max(100) }))
      .parse(JSON.parse(d.formula));
    const total = items.reduce((a, i) => a + i.porcentaje, 0);
    if (Math.abs(total - 100) > 0.5) throw new Error(`Los porcentajes suman ${total.toFixed(1)} %, tienen que sumar 100 %`);
    check(await supabase.from('racion_ingredientes').delete().eq('racion_id', d.racion_id));
    check(await supabase.from('racion_ingredientes').insert(items.map((i) => ({ ...i, racion_id: d.racion_id }))));
    return 'Fórmula guardada';
  },
  { revalidate: RUTAS },
);

export const crearRacion = crearAccion(
  z.object({ nombre: z.string().trim().min(1), descripcion: z.string().trim().optional() }),
  async (d, supabase) => {
    check(await supabase.from('raciones').insert({ nombre: d.nombre, descripcion: d.descripcion ?? null, activa: true }));
    return `Ración ${d.nombre} creada`;
  },
  { revalidate: RUTAS },
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
  { revalidate: RUTAS },
);

export const registrarEntrega = crearAccion(
  z.object({
    potrero_id: z.string().min(1),
    racion_id: z.string().min(1),
    cantidad_kg: z.coerce.number().positive(),
    fecha: z.string().min(1),
    descontar_stock: z.string().optional(),
    notas: z.string().trim().optional(),
  }),
  async (d, supabase) => {
    check(
      await supabase.from('potrero_feeding_logs').insert({
        potrero_id: d.potrero_id,
        racion_id: d.racion_id,
        cantidad_kg: d.cantidad_kg,
        fecha: fechaMs(d.fecha),
        notas: d.notas ?? null,
      }),
    );
    if (d.descontar_stock) {
      const { data: ings } = await supabase.from('racion_ingredientes').select('suplemento_id, porcentaje').eq('racion_id', d.racion_id);
      for (const ing of ings ?? []) {
        const { data: s } = await supabase.from('suplementos').select('stock_kg').eq('id', ing.suplemento_id).single();
        const nuevo = Math.max(0, (s?.stock_kg ?? 0) - (d.cantidad_kg * ing.porcentaje) / 100);
        check(await supabase.from('suplementos').update({ stock_kg: nuevo }).eq('id', ing.suplemento_id));
      }
    }
    return 'Entrega registrada';
  },
  { revalidate: RUTAS },
);
