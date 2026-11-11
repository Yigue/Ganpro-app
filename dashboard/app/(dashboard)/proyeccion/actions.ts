'use server';
import {InputError} from '@/lib/commands/errors';

import { z } from 'zod';
import {DomainError} from '@/lib/commands/errors';
import {runOperation} from '@/lib/commands/rpc';
import {operationMessage} from '@/lib/commands/message';
import { check, crearAccion, fechaMs } from '@/lib/db/actions';

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
  async(d,supabase)=>{
    const lines=d.lineas===undefined?undefined:z.array(lineaSchema).safeParse(d.lineas);
    if(lines&&!lines.success)throw new InputError({lineas:['Revisá las líneas del plan.']});
    return operationMessage(await runOperation(supabase,'scenario.save',{...d,lineas:lines?.success?lines.data:undefined}));
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
  async(d,supabase)=>operationMessage(await runOperation(supabase,'scenario.close',{...d,desde:fechaMs(d.desde),hasta:fechaMs(d.hasta)})),
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
