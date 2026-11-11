'use server';
import {InputError} from '@/lib/commands/errors';

import { z } from 'zod';
import { check, crearAccion, fechaMs } from '@/lib/db/actions';

const RUTAS = ['/reproduccion', '/'];

const caravanas = (s: string) => s.split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);

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
    if(d.fecha_salida&&fechaMs(d.fecha_salida)<fechaMs(d.fecha_entrada))throw new InputError({fecha_salida:['La salida debe ser posterior a la entrada.']});
    const lista = caravanas(d.toros);
    const data=check(await supabase.from('animals').select('id, id_caravana').in('id_caravana',lista).eq('sexo','M').eq('categoria','Toro').eq('estado','ACTIVO'));
    const faltan = lista.filter((c) => !(data ?? []).some((a) => a.id_caravana === c));
    if (faltan.length) throw new InputError({_form:[`No existen los toros: ${faltan.join(', ')}`]});
    let vientres = d.vientres;
    if (!vientres) {
      const countResult = await supabase
        .from('animals')
        .select('id', { count: 'exact', head: true })
        .eq('lote_id', d.lote_id)
        .eq('estado', 'ACTIVO')
        .eq('sexo', 'H')
        .in('categoria', ['Vaca', 'Vaquillona']);
      check(countResult);vientres = countResult.count ?? undefined;
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
  { name: 'reproduccion.crearServicio', revalidate: RUTAS },
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
    const data=check(await supabase.from('animals').select('id').eq('id_caravana',d.caravana).maybeSingle());
    if (!data) throw new InputError({_form:[`No existe la caravana ${d.caravana}`]});
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
  { name: 'reproduccion.registrarRevisacion', revalidate: RUTAS },
);

export const completarEtapa = crearAccion(
  z.object({ id: z.string().min(1) }),
  async (d, supabase) => {
    check(await supabase.from('etapas_protocolo').update({ completada: true, fecha_completada: Date.now() }).eq('id', d.id));
  },
  { name: 'reproduccion.completarEtapa', revalidate: RUTAS },
);
