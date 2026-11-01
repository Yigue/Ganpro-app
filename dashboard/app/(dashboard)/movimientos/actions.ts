'use server';

import { z } from 'zod';
import { animalesEnCarencia } from '@/lib/calc/sanidad';
import { check, crearAccion, fechaMs } from '@/lib/db/actions';
import type { Animal, OperationLog } from '@/lib/db/types';

const RUTAS = ['/movimientos', '/stock', '/', '/finanzas'];

const movimientoSchema = z.object({
  tipo: z.enum(['TRASLADO', 'VENTA', 'COMPRA', 'MUERTE', 'NACIMIENTO']),
  fecha: z.string().min(1, 'obligatoria'),
  caravanas: z.string().optional(),
  lote_destino_id: z.string().optional(),
  potrero_destino_id: z.string().optional(),
  categoria: z.string().optional(),
  sexo: z.enum(['M', 'H']).optional(),
  kg: z.coerce.number().positive().optional(),
  monto: z.coerce.number().positive().optional(),
  dte_numero: z.string().trim().optional(),
  renspa_destino: z.string().trim().optional(),
  fecha_cobro: z.string().optional(),
  notas: z.string().trim().optional(),
});

const listaCaravanas = (s: string | undefined) =>
  (s ?? '')
    .split(/[\s,;]+/)
    .map((c) => c.trim())
    .filter(Boolean);

export const registrarMovimiento = crearAccion(
  movimientoSchema,
  async (d, supabase) => {
    const fecha = fechaMs(d.fecha);
    const caravanas = listaCaravanas(d.caravanas);

    if (d.tipo === 'NACIMIENTO' || d.tipo === 'COMPRA') {
      if (!caravanas.length) throw new Error('Indicá las caravanas de los animales que ingresan');
      const categoria = d.categoria ?? (d.sexo === 'M' ? 'Ternero' : 'Ternera');
      const pesoCabeza = d.kg ? d.kg / caravanas.length : null;
      const nuevos = caravanas.map((c) => ({
        id: crypto.randomUUID(),
        id_caravana: c,
        sexo: d.sexo ?? 'H',
        categoria,
        estado: 'ACTIVO',
        fecha_nacimiento: d.tipo === 'NACIMIENTO' ? fecha : null,
        peso_actual: pesoCabeza,
        lote_id: d.lote_destino_id ?? null,
        potrero_id: d.potrero_destino_id ?? null,
      }));
      check(await supabase.from('animals').insert(nuevos));
      if (pesoCabeza) {
        check(await supabase.from('eventos').insert(nuevos.map((n) => ({ animal_id: n.id, tipo: 'PESAJE', valor: pesoCabeza, timestamp: fecha }))));
      }
      if (d.tipo === 'COMPRA' && d.monto) {
        check(
          await supabase.from('movimientos_financieros').insert({
            tipo: 'GASTO',
            categoria: 'COMPRA',
            lote_id: d.lote_destino_id ?? null,
            monto: d.monto,
            fecha,
            descripcion: d.notas ?? `Compra ${caravanas.length} ${categoria}`,
            dte_numero: d.dte_numero ?? null,
            cabezas: caravanas.length,
            kg: d.kg ?? null,
            categoria_animal: categoria,
            dte_estado: d.dte_numero ? 'EMITIDO' : null,
          }),
        );
      }
      return `${caravanas.length} animales ingresados`;
    }

    if (!caravanas.length) throw new Error('Indicá las caravanas');
    const { data: encontrados } = await supabase.from('animals').select('*').in('id_caravana', caravanas);
    const animals = (encontrados ?? []) as Animal[];
    const faltan = caravanas.filter((c) => !animals.some((a) => a.id_caravana === c));
    if (faltan.length) throw new Error(`No existen las caravanas: ${faltan.join(', ')}`);
    const ids = animals.map((a) => a.id);

    if (d.tipo === 'TRASLADO') {
      if (!d.lote_destino_id && !d.potrero_destino_id) throw new Error('Elegí lote o potrero de destino');
      check(
        await supabase.from('animal_movements').insert(
          animals.map((a) => ({
            animal_id: a.id,
            lote_origen_id: a.lote_id,
            lote_destino_id: d.lote_destino_id ?? a.lote_id,
            potrero_origen_id: a.potrero_id,
            potrero_destino_id: d.potrero_destino_id ?? a.potrero_id,
            fecha,
          })),
        ),
      );
      const cambios: Partial<Animal> = {};
      if (d.lote_destino_id) cambios.lote_id = d.lote_destino_id;
      if (d.potrero_destino_id) cambios.potrero_id = d.potrero_destino_id;
      check(await supabase.from('animals').update(cambios).in('id', ids));
      return `${animals.length} animales trasladados`;
    }

    if (d.tipo === 'VENTA') {
      const lotes = [...new Set(animals.map((a) => a.lote_id).filter(Boolean))] as string[];
      const { data: logs } = await supabase
        .from('operation_logs')
        .select('*')
        .gt('fecha_fin_carencia', fecha)
        .or(`animal_id.in.(${ids.join(',')})${lotes.length ? `,lote_id.in.(${lotes.join(',')})` : ''}`);
      const bloqueados = animalesEnCarencia(animals, (logs ?? []) as OperationLog[], fecha);
      if (bloqueados.length) {
        throw new Error(`En período de retiro, no se pueden vender: ${bloqueados.map((b) => b.animal.id_caravana).join(', ')}`);
      }
      check(await supabase.from('animals').update({ estado: 'VENDIDO' }).in('id', ids));
      check(
        await supabase.from('eventos').insert(
          animals.map((a) => ({ animal_id: a.id, tipo: 'VENTA', timestamp: fecha, dte_numero: d.dte_numero ?? null, notas: d.notas ?? null })),
        ),
      );
      if (d.monto) {
        const categorias = [...new Set(animals.map((a) => a.categoria))];
        check(
          await supabase.from('movimientos_financieros').insert({
            tipo: 'INGRESO',
            categoria: 'VENTA',
            lote_id: lotes.length === 1 ? lotes[0] : null,
            monto: d.monto,
            fecha,
            descripcion: d.notas ?? `Venta ${animals.length} ${categorias.join('/')}`,
            dte_numero: d.dte_numero ?? null,
            renspa_destino: d.renspa_destino ?? null,
            cabezas: animals.length,
            kg: d.kg ?? null,
            categoria_animal: categorias.length === 1 ? categorias[0] : null,
            dte_estado: d.dte_numero ? 'EMITIDO' : null,
            fecha_cobro: d.fecha_cobro ? fechaMs(d.fecha_cobro) : fecha,
            cobrado: d.fecha_cobro ? fechaMs(d.fecha_cobro) <= Date.now() : true,
          }),
        );
      }
      return `Venta de ${animals.length} animales registrada`;
    }

    // MUERTE
    check(await supabase.from('animals').update({ estado: 'MUERTO' }).in('id', ids));
    check(
      await supabase.from('eventos').insert(
        animals.map((a) => ({ animal_id: a.id, tipo: 'MUERTE', timestamp: fecha, notas: d.notas ?? null, dte_numero: d.dte_numero ?? null })),
      ),
    );
    return `${animals.length} bajas registradas`;
  },
  { revalidate: RUTAS },
);

export const cargarActaSigsa = crearAccion(
  z
    .object({
      fecha: z.string().min(1),
      acta_numero: z.string().trim().optional(),
      fuente: z.enum(['ACTA', 'HISTORICO', 'CSV']),
    })
    .passthrough(),
  async (d, supabase) => {
    const fecha = fechaMs(d.fecha);
    const filas = Object.entries(d)
      .filter(([k, v]) => k.startsWith('cab_') && v !== undefined && v !== '')
      .map(([k, v]) => ({ categoria: k.slice(4), cabezas: Math.round(Number(v)) }))
      .filter((f) => Number.isFinite(f.cabezas) && f.cabezas >= 0);
    if (!filas.length) throw new Error('Cargá al menos una categoría');
    check(
      await supabase
        .from('sigsa_stock')
        .insert(filas.map((f) => ({ ...f, fecha, fuente: d.fuente, acta_numero: d.acta_numero ?? null }))),
    );
    return `Acta del ${d.fecha} cargada`;
  },
  { revalidate: ['/movimientos', '/'] },
);

export const actualizarEstadoDte = crearAccion(
  z.object({ id: z.string().min(1), dte_estado: z.enum(['EMITIDO', 'ANULADO', 'RETORNO']) }),
  async (d, supabase) => {
    check(await supabase.from('movimientos_financieros').update({ dte_estado: d.dte_estado }).eq('id', d.id));
  },
  { revalidate: ['/movimientos'] },
);
