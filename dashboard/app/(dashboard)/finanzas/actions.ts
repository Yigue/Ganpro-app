'use server';

import { z } from 'zod';
import { check, crearAccion, fechaMs } from '@/lib/db/actions';

const RUTAS = ['/finanzas', '/costos', '/'];

export const crearMovimientoFinanciero = crearAccion(
  z.object({
    tipo: z.enum(['GASTO', 'INGRESO']),
    categoria: z.string().min(1),
    monto: z.coerce.number().positive(),
    fecha: z.string().min(1),
    lote_id: z.string().optional(),
    descripcion: z.string().trim().optional(),
    comprobante: z.string().trim().optional(),
    fecha_cobro: z.string().optional(),
  }),
  async (d, supabase) => {
    const cobro = d.tipo === 'INGRESO' && d.fecha_cobro ? fechaMs(d.fecha_cobro) : null;
    check(
      await supabase.from('movimientos_financieros').insert({
        tipo: d.tipo,
        categoria: d.categoria,
        monto: d.monto,
        fecha: fechaMs(d.fecha),
        lote_id: d.lote_id ?? null,
        descripcion: d.descripcion ?? null,
        comprobante: d.comprobante ?? null,
        fecha_cobro: cobro,
        cobrado: d.tipo === 'INGRESO' ? (cobro == null || cobro <= Date.now()) : null,
      }),
    );
    return d.tipo === 'GASTO' ? 'Gasto cargado' : 'Ingreso cargado';
  },
  { revalidate: RUTAS },
);

export const marcarCobrado = crearAccion(
  z.object({ id: z.string().min(1) }),
  async (d, supabase) => {
    check(await supabase.from('movimientos_financieros').update({ cobrado: true }).eq('id', d.id));
  },
  { revalidate: RUTAS },
);
