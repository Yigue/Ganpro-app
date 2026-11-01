'use server';

import { z } from 'zod';
import { check, crearAccion, fechaMs } from '@/lib/db/actions';

const RUTAS = ['/reproduccion', '/'];

const caravanas = (s: string) => s.split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean);

export const crearServicio = crearAccion(
  z.object({
    temporada: z.string().trim().min(1),
    lote_id: z.string().min(1, 'elegí el lote'),
    toros: z.string().min(1, 'indicá las caravanas de los toros'),
    vientres: z.coerce.number().int().positive().optional(),
    fecha_entrada: z.string().min(1),
    fecha_salida: z.string().optional(),
    notas: z.string().trim().optional(),
  }),
  async (d, supabase) => {
    const lista = caravanas(d.toros);
    const { data } = await supabase.from('animals').select('id, id_caravana').in('id_caravana', lista);
    const faltan = lista.filter((c) => !(data ?? []).some((a) => a.id_caravana === c));
    if (faltan.length) throw new Error(`No existen los toros: ${faltan.join(', ')}`);
    let vientres = d.vientres;
    if (!vientres) {
      const { count } = await supabase
        .from('animals')
        .select('id', { count: 'exact', head: true })
        .eq('lote_id', d.lote_id)
        .eq('estado', 'ACTIVO')
        .eq('sexo', 'H')
        .in('categoria', ['Vaca', 'Vaquillona']);
      vientres = count ?? undefined;
    }
    check(
      await supabase.from('servicios').insert({
        temporada: d.temporada,
        lote_id: d.lote_id,
        toros: (data ?? []).map((a) => a.id),
        vientres: vientres ?? null,
        fecha_entrada: fechaMs(d.fecha_entrada),
        fecha_salida: d.fecha_salida ? fechaMs(d.fecha_salida) : null,
        notas: d.notas ?? null,
      }),
    );
    return 'Servicio registrado';
  },
  { revalidate: RUTAS },
);

export const registrarRevisacion = crearAccion(
  z.object({
    caravana: z.string().trim().min(1),
    fecha: z.string().min(1),
    apto: z.enum(['si', 'no']),
    sanitaria: z.string().trim().optional(),
    circunferencia_escrotal_cm: z.coerce.number().positive().optional(),
    notas: z.string().trim().optional(),
  }),
  async (d, supabase) => {
    const { data } = await supabase.from('animals').select('id').eq('id_caravana', d.caravana).maybeSingle();
    if (!data) throw new Error(`No existe la caravana ${d.caravana}`);
    check(
      await supabase.from('revisacion_toros').insert({
        animal_id: data.id,
        fecha: fechaMs(d.fecha),
        apto: d.apto === 'si',
        sanitaria: d.sanitaria ?? null,
        circunferencia_escrotal_cm: d.circunferencia_escrotal_cm ?? null,
        notas: d.notas ?? null,
      }),
    );
    return 'Revisación registrada';
  },
  { revalidate: RUTAS },
);

export const completarEtapa = crearAccion(
  z.object({ id: z.string().min(1) }),
  async (d, supabase) => {
    check(await supabase.from('etapas_protocolo').update({ completada: true, fecha_completada: Date.now() }).eq('id', d.id));
  },
  { revalidate: RUTAS },
);
