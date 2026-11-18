'use server';
import {InputError} from '@/lib/commands/errors';

import { z } from 'zod';
import {runOperation} from '@/lib/commands/rpc';
import {operationMessage} from '@/lib/commands/message';
import { check, crearAccion, fechaMs } from '@/lib/db/actions';

const num = z.coerce.number().min(0).optional();

export const guardarEstablecimiento = crearAccion(
  z.object({
    nombre: z.string().trim().min(1),
    renspa: z.string().trim().optional(),
    localidad: z.string().trim().optional(),
    provincia: z.string().trim().optional(),
    hectareas_ganaderas: num,
    inicio_ejercicio_mes: z.coerce.number().int().min(1).max(12),
    dias_alerta_pesada: z.coerce.number().int().min(1),
    dias_alerta_sanidad: z.coerce.number().int().min(1),
  }),
  async (d, supabase) => {
    check(
      await supabase
        .from('establecimiento')
        .update({
          ...d,
          renspa: d.renspa ?? null,
          localidad: d.localidad ?? null,
          provincia: d.provincia ?? null,
          hectareas_ganaderas: d.hectareas_ganaderas ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1),
    );
  },
  { name: 'config.guardarEstablecimiento', roles: ['admin'], revalidate: ['/', '/config'] },
);

export const guardarPotrero = crearAccion(
  z.object({
    id: z.string().optional(),
    nombre: z.string().trim().min(1),
    hectareas: num,
    recurso_forrajero: z.string().trim().optional(),
    capacidad_ev: num,
  }),
  async ({ id, ...d }, supabase) => {
    const fila = { nombre: d.nombre, hectareas: d.hectareas ?? null, recurso_forrajero: d.recurso_forrajero ?? null, capacidad_ev: d.capacidad_ev ?? null };
    check(id ? await supabase.from('potreros').update(fila).eq('id', id) : await supabase.from('potreros').insert(fila));
    return `Potrero ${d.nombre} guardado`;
  },
  { name: 'config.guardarPotrero', revalidate: ['/config', '/nutricion', '/'] },
);

export const guardarLote=crearAccion(z.object({id:z.string().optional(),expected_version:z.coerce.number().int().nonnegative().optional(),nombre:z.string().trim().min(1).max(200),descripcion:z.string().trim().max(1000).optional(),ubicacion:z.string().trim().optional(),hectareas:num,costo_alquiler_ha:num}),async(d,c)=>operationMessage(await runOperation(c,'stock.lot-save',d)),{name:'stock.lot-save',revalidate:['/config','/stock','/stock/manga','/movimientos','/gestion','/mapa','/reproduccion','/costos','/']});

export const cambiarRol = crearAccion(
  z.object({ id: z.string().uuid(), rol: z.enum(['admin', 'campo', 'asesor']) }),
  async (d, supabase) => {
    check(await supabase.from('perfiles').update({ rol: d.rol }).eq('id', d.id));
  },
  { name: 'config.cambiarRol', roles: ['admin'], revalidate: ['/config'] },
);

export const guardarCategorias = crearAccion(
  z.record(z.string(), z.union([z.string(), z.array(z.string())]).optional()),
  async (d, supabase) => {
    const categorias = Object.keys(d)
      .filter((k) => k.startsWith('ev__'))
      .map((k) => k.slice(4));
    const changes=categorias.map(categoria=>{
      const value=(field:string)=>{const raw=d[`${field}__${categoria}`];return typeof raw==='string'&&raw!==''?raw:null;};
      const ev=Number(value('ev'));if(!Number.isFinite(ev)||ev<=0)throw new InputError({_form:[`EV inválido para ${categoria}`]});
      return {categoria,ev,recategoriza_a:value('recat'),edad_recategorizacion_meses:value('edad')?Number(value('edad')):null,consumo_sal_g_dia:value('sal')?Number(value('sal')):null};
    });
    return operationMessage(await runOperation(supabase,'config.categories',changes));
  },
  { name: 'config.guardarCategorias', roles: ['admin'], revalidate: ['/config', '/', '/stock', '/nutricion'] },
);

export const cargarPrecios = crearAccion(
  z.object({
    fecha: z.string().min(1),
    novillo_kg: num,
    ternero_kg: num,
    ternera_kg: num,
    vaquillona_kg: num,
    vaca_kg: num,
    vaca_descarte_kg: num,
    toro_kg: num,
    dolar_oficial: num,
    dolar_mep: num,
  }),
  async ({ fecha, ...precios }, supabase) => {
    const fila = Object.fromEntries(Object.entries(precios).map(([k, v]) => [k, v ?? null]));
    check(await supabase.from('precios_mercado').insert({ ...fila, fecha: fechaMs(fecha), fuente: 'MANUAL' }));
    return 'Precios cargados';
  },
  { name: 'config.cargarPrecios', revalidate: ['/config', '/finanzas', '/'] },
);
