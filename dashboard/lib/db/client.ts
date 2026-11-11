import {databaseError} from '@/lib/commands/errors';
import 'server-only';
import {getManagement} from '@/lib/management/data';
import {consumptionExpenses} from '@/lib/management/economic';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { TableMap, TableName } from './types';

const PAGE = 1000;

// Sin tipos generados del proyecto, el builder de PostgREST no infiere bien las
// columnas; los filtros se escriben con la API normal (eq, gte, in...).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Query = any;
type Filter = (q: Query) => Query;

/** Lee todas las filas de una tabla, paginando de a 1000 (límite por defecto de Supabase). */
export async function selectAll<T extends TableName>(
  table: T,
  options: { columns?: string; filter?: Filter; order?: string; ascending?: boolean } = {},
): Promise<TableMap[T][]> {
  const supabase = await createClient();
  const rows: TableMap[T][] = [];
  for (let from = 0; ; from += PAGE) {
    let q: Query = supabase.from(table).select(options.columns ?? '*');
    if (options.filter) q = options.filter(q);
    if (options.order) q = q.order(options.order, { ascending: options.ascending ?? true });
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw databaseError(error);
    rows.push(...((data ?? []) as unknown as TableMap[T][]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

export async function selectOne<T extends TableName>(table: T, id: string | number): Promise<TableMap[T] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw databaseError(error);
  return data as TableMap[T] | null;
}

// Tablas de referencia que usan casi todas las pantallas; cache() evita repetir
// la consulta dentro del mismo request.
export const getLotes = cache(() => selectAll('lotes', { order: 'nombre' }));
export const getPotreros = cache(() => selectAll('potreros', { order: 'nombre' }));
export const getAnimals = cache(() => selectAll('animals', { order: 'id_caravana' }));
export const getCategoriasConfig = cache(() => selectAll('categorias_config', { order: 'orden' }));
export const getEventos = cache(() => selectAll('eventos', { order: 'timestamp' }));
export const getPrecios = cache(() => selectAll('precios_mercado', { order: 'fecha', ascending: false }));
export const getMovimientosFinancieros = cache(async()=>{const [documents,data]=await Promise.all([selectAll('movimientos_financieros',{order:'fecha',ascending:false,filter:q=>q.is('anulado_en',null).eq('es_inventario',false)}),getManagement()]);return [...documents,...consumptionExpenses(data)];});
export const getCatalogo = cache(() => selectAll('operations_catalog', { order: 'nombre' }));
export const getSuplementos = cache(() => selectAll('suplementos', { order: 'nombre' }));

export const getEstablecimiento = cache(async () => {
  const supabase = await createClient();
  const { data,error } = await supabase.from('establecimiento').select('*').eq('id', 1).maybeSingle();
  if(error)throw databaseError(error);
  if(!data)throw databaseError({code:'MISSING_ESTABLISHMENT'});
  return (data as TableMap['establecimiento']);

});

export function byId<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]));
}
