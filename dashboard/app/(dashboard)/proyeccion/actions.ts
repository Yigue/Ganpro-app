'use server';
import {InputError} from '@/lib/commands/errors';

import { z } from 'zod';
import {DomainError} from '@/lib/commands/errors';
import {databaseError} from '@/lib/commands/errors';
import { check, crearAccion, fechaMs } from '@/lib/db/actions';
import type { MovimientoFinanciero } from '@/lib/db/types';

const RUTAS = ['/proyeccion', '/proyeccion/negocio', '/proyeccion/peso', '/proyeccion/plan', '/proyeccion/cria', '/proyeccion/precios'];

const json = z.string().transform((s, ctx) => {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    ctx.addIssue({ code: 'custom', message: 'JSON inválido' });
    return z.NEVER;
  }
});

const lineaSchema = z.object({
  mes: z.string().regex(/^\d{4}-\d{2}$/),
  tipo: z.enum(['VENTA', 'COMPRA']),
  categoria: z.string().min(1),
  cabezas: z.number().int().positive(),
  kg: z.number().nonnegative(),
  precioKg: z.number().nonnegative(),
});

export const guardarEscenario = crearAccion(
  z.object({
    id: z.string().optional(),
    tipo: z.enum(['negocio', 'peso', 'plan', 'cria']),
    nombre: z.string().trim().min(1, 'poné un nombre'),
    lote_id: z.string().optional(),
    supuestos: json,
    resultado: json,
    lineas: json.optional(),
  }),
  async (d, supabase) => {
    const fila = { tipo: d.tipo, nombre: d.nombre, lote_id: d.lote_id ?? null, supuestos: d.supuestos, resultado: d.resultado };
    let id = d.id;
    if (id) {
      check(await supabase.from('escenarios').update(fila).eq('id', id));
    } else {
      const { data, error } = await supabase.from('escenarios').insert(fila).select('id').single();
      if (error) throw databaseError(error);
      id = data.id as string;
    }
    if (d.lineas !== undefined) {
      const lineas = z.array(lineaSchema).parse(d.lineas);
      // Las líneas ya convertidas en reales se conservan.
      check(await supabase.from('escenario_lineas').delete().eq('escenario_id', id).is('movimiento_id', null));
      if (lineas.length) {
        check(
          await supabase.from('escenario_lineas').insert(
            lineas.map((l) => ({
              escenario_id: id,
              mes: l.mes,
              tipo: l.tipo,
              categoria: l.categoria,
              cabezas: l.cabezas,
              kg: l.kg,
              precio_kg: l.precioKg,
              monto: l.cabezas * l.kg * l.precioKg,
            })),
          ),
        );
      }
    }
    return `Escenario "${d.nombre}" guardado`;
  },
  { name: 'proyeccion.guardarEscenario', revalidate: RUTAS },
);

export const eliminarEscenario = crearAccion(
  z.object({ id: z.string().min(1) }),
  async (d, supabase) => {
    check(await supabase.from('escenarios').delete().eq('id', d.id));
    return 'Escenario eliminado';
  },
  { name: 'proyeccion.eliminarEscenario', revalidate: RUTAS },
);

/**
 * Cierra un escenario de negocio con lo que pasó de verdad: suma los
 * movimientos financieros del lote entre las dos fechas.
 */
export const cerrarConReal = crearAccion(
  z.object({ id: z.string().min(1), lote_id: z.string().min(1, 'elegí el lote'), desde: z.string().min(1), hasta: z.string().min(1) }),
  async (d, supabase) => {
    const { data, error } = await supabase
      .from('movimientos_financieros')
      .select('*')
      .eq('lote_id', d.lote_id)
      .is('anulado_en',null)
      .gte('fecha', fechaMs(d.desde))
      .lte('fecha', fechaMs(d.hasta));
    if (error) throw databaseError(error);
    const movs = (data ?? []) as MovimientoFinanciero[];
    const ventas = movs.filter((m) => m.tipo === 'INGRESO');
    const compras = movs.filter((m) => m.tipo === 'GASTO' && m.categoria === 'COMPRA');
    const directos = movs.filter((m) => m.tipo === 'GASTO' && m.categoria !== 'COMPRA');
    const suma = (l: MovimientoFinanciero[], k: 'monto' | 'kg' | 'cabezas') => l.reduce((a, m) => a + ((m[k] as number | null) ?? 0), 0);
    const ingreso = suma(ventas, 'monto');
    const compra = suma(compras, 'monto');
    const costos = suma(directos, 'monto');
    const kgVendidos = suma(ventas, 'kg');
    const real = {
      desde: fechaMs(d.desde),
      hasta: fechaMs(d.hasta),
      ingreso,
      compra,
      costosDirectos: costos,
      margenBruto: ingreso - compra - costos,
      cabezasVendidas: suma(ventas, 'cabezas'),
      kgVendidos,
      precioVentaKg: kgVendidos ? ingreso / kgVendidos : null,
      movimientos: movs.length,
    };
    check(await supabase.from('escenarios').update({ resultado_real: real, estado: 'CERRADO', lote_id: d.lote_id }).eq('id', d.id));
    return movs.length ? `Cerrado con ${movs.length} movimientos reales` : 'Cerrado, pero el lote no tiene movimientos en esas fechas';
  },
  { name: 'proyeccion.cerrarConReal', revalidate: RUTAS },
);

/** Pasa una venta o compra proyectada a movimiento financiero real, con su DTE. */
export const convertirLineaEnReal=crearAccion(z.object({id:z.string().min(1)}),async()=>{throw new DomainError('PLAN_REQUIRES_STOCK');},{name:'projection.legacy-real',revalidate:RUTAS});

const COLUMNAS_PRECIO = ['novillo_kg', 'ternero_kg', 'ternera_kg', 'vaquillona_kg', 'vaca_kg', 'vaca_descarte_kg', 'toro_kg', 'dolar_oficial', 'dolar_mep'] as const;

/**
 * Carga histórica de precios por CSV. Primera columna: fecha (dd/mm/aaaa o aaaa-mm-dd);
 * el resto se identifica por encabezado (novillo, ternero, ternera, vaquillona, vaca,
 * vaca_descarte, toro, dolar_oficial, dolar_mep).
 */
export const importarPrecios = crearAccion(
  z.object({ csv: z.string().min(1, 'pegá el CSV'), fuente: z.enum(['MANUAL', 'API_MAG']) }),
  async (d, supabase) => {
    const lineas = d.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const sep = [';', '\t', ','].find((s) => lineas[0]?.includes(s)) ?? ';';
    const header = lineas[0].split(sep).map((h) => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z_]/g, ''));
    const mapa = header.map((h) => COLUMNAS_PRECIO.find((c) => c === h || c === `${h}_kg` || c.replace('_kg', '') === h) ?? null);
    if (!mapa.slice(1).some(Boolean)) throw new InputError({_form:['No reconozco las columnas. Ejemplo de encabezado: fecha;novillo;ternero;vaca;dolar_oficial']});
    const filas = [];
    for (const linea of lineas.slice(1)) {
      const cel = linea.split(sep).map((c) => c.trim());
      const m = cel[0].match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      const fecha = m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12).getTime() : Date.parse(`${cel[0]}T12:00:00`);
      if (!Number.isFinite(fecha)) continue;
      const fila: Record<string, number | string | null> = { fecha, fuente: d.fuente };
      mapa.forEach((col, j) => {
        if (!col || j === 0) return;
        const raw = cel[j] ?? '';
        const n = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw);
        fila[col] = Number.isFinite(n) && n > 0 ? n : null;
      });
      filas.push(fila);
    }
    if (!filas.length) throw new InputError({_form:['No hay filas con fecha válida']});
    check(await supabase.from('precios_mercado').insert(filas));
    return `${filas.length} fechas de precios cargadas`;
  },
  { name: 'proyeccion.importarPrecios', revalidate: [...RUTAS, '/finanzas', '/config'] },
);
