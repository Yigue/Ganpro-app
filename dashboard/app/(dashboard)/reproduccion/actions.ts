'use server';
import {applyBatch} from '@/lib/commands/batch';
import {runOperation} from '@/lib/commands/rpc';
import {operationMessage} from '@/lib/commands/message';

import { z } from 'zod';
import {commandContext} from '@/lib/commands/context';
import {InputError} from '@/lib/commands/errors';
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
  async(d,supabase)=>operationMessage(await runOperation(supabase,'repro.service',{...d,toros:caravanas(d.toros),fecha_entrada:fechaMs(d.fecha_entrada),fecha_salida:d.fecha_salida?fechaMs(d.fecha_salida):undefined})),
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
    const data=check(await supabase.from('animals').select('id').eq('id_caravana',d.caravana.trim().toUpperCase()).eq('estado','ACTIVO').eq('sexo','M').eq('categoria','Toro').maybeSingle());
    if (!data) throw new InputError({_form:[`No existe la caravana ${d.caravana}`]});
    await applyBatch(supabase,[{table:'revisacion_toros',mode:'insert',data:{animal_id:data.id,fecha:fechaMs(d.fecha),apto:d.apto==='si',sanitaria:d.sanitaria??null,circunferencia_escrotal_cm:d.circunferencia_escrotal_cm??null,notas:d.notas??null}}]);
    return 'Revisación registrada';
  },
  { name: 'reproduccion.registrarRevisacion', revalidate: RUTAS },
);

export const completarEtapa = crearAccion(
  z.object({ id: z.string().min(1) }),
  async (d, supabase) => {
    await applyBatch(supabase,[{table:'etapas_protocolo',mode:'update',id:d.id,data:{completada:true,fecha_completada:commandContext.getStore()?.operationAt??Date.now()}}]);
  },
  { name: 'reproduccion.completarEtapa', revalidate: RUTAS },
);
