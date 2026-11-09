import type { Animal, CategoriaConfig, Evento } from '@/lib/db/types';
import { mesesEntre } from './fechas';

export const activos = (animals: Animal[]) => animals.filter((a) => a.estado === 'ACTIVO');

export function contarPor<T>(items: T[], key: (t: T) => string | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = key(it) ?? 'Sin dato';
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function coefEV(config: CategoriaConfig[]): Map<string, number> {
  return new Map(config.map((c) => [c.categoria, c.ev]));
}

/** Suma de equivalentes vaca. Categorías sin coeficiente cuentan como 1. */
export function totalEV(animals: Animal[], config: CategoriaConfig[]): number {
  const ev = coefEV(config);
  return animals.reduce((acc, a) => acc + (ev.get(a.categoria) ?? 1), 0);
}

export function cargaEVha(ev: number, hectareas: number | null | undefined): number | null {
  if (!hectareas) return null;
  return ev / hectareas;
}

export function pesoPromedio(animals: Animal[]): number | null {
  const pesos = animals.map((a) => a.peso_actual).filter((p): p is number => p != null && p > 0);
  if (!pesos.length) return null;
  return pesos.reduce((a, b) => a + b, 0) / pesos.length;
}

export function edadMeses(a: Animal, ahora: number): number | null {
  if (!a.fecha_nacimiento) return null;
  return mesesEntre(a.fecha_nacimiento, ahora);
}

export interface Recategorizacion {
  animal: Animal;
  de: string;
  a: string;
  edadMeses: number;
}

/** Animales que por edad ya deberían pasar a la categoría siguiente (ternero → novillito, etc.). */
export function recategorizacionesPendientes(
  animals: Animal[],
  config: CategoriaConfig[],
  ahora: number,
): Recategorizacion[] {
  const reglas = new Map(config.filter((c) => c.recategoriza_a && c.edad_recategorizacion_meses).map((c) => [c.categoria, c]));
  const out: Recategorizacion[] = [];
  for (const a of activos(animals)) {
    const regla = reglas.get(a.categoria);
    const edad = edadMeses(a, ahora);
    if (!regla || edad == null) continue;
    if (edad >= (regla.edad_recategorizacion_meses ?? Infinity)) {
      out.push({ animal: a, de: a.categoria, a: regla.recategoriza_a!, edadMeses: edad });
    }
  }
  return out.sort((x, y) => y.edadMeses - x.edadMeses);
}

/** Fecha de baja: el evento MUERTE/VENTA del animal, o su updated_at si no hay evento. */
export function fechasBaja(animals: Animal[], eventos: Evento[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of eventos) {
    if (e.tipo === 'MUERTE' || e.tipo === 'VENTA') out.set(e.animal_id, e.timestamp);
  }
  for (const a of animals) {
    if (a.estado !== 'ACTIVO' && !out.has(a.id)) out.set(a.id, a.updated_at);
  }
  return out;
}

/** Cabezas por categoría al cierre de cada mes (usa la categoría actual del animal). */
export function historicoCabezas(
  animals: Animal[],
  eventos: Evento[],
  meses: { key: string; fin: number }[],
): { mes: string; [categoria: string]: number | string }[] {
  const histories = new Map(animals.map(a => [a.id, eventos.filter(e => e.animal_id === a.id).sort((a,b) => a.timestamp-b.timestamp)]));
  return meses.map(({key,fin}) => {
    const fila: {mes:string;[categoria:string]:number|string} = {mes:key};
    for(const a of animals){
      const history=histories.get(a.id)??[];
      const entries=history.filter(e=>['COMPRA','NACIMIENTO'].includes(e.tipo));
      const alta=entries.length?Math.min(...entries.map(e=>e.timestamp)):a.created_at;
      let present=alta<=fin;
      for(const e of history.filter(e=>e.timestamp<=fin)){
        if(['VENTA','MUERTE'].includes(e.tipo))present=false;
        if(e.tipo==='ANULACION'&&e.valor!=null)present=e.valor>0;
      }
      if(a.estado!=='ACTIVO'&&a.updated_at<=fin&&!history.some(e=>['VENTA','MUERTE','ANULACION'].includes(e.tipo)))present=false;
      if(present)fila[a.categoria]=((fila[a.categoria] as number)??0)+1;
    }
    return fila;
  });
}

export function mortandad(animals: Animal[], eventos: Evento[], desde: number, hasta: number, ahora: number): number | null {
  const muertes = eventos.filter((e) => e.tipo === 'MUERTE' && e.timestamp >= desde && e.timestamp <= hasta).length;
  const bajas = fechasBaja(animals, eventos);
  const vivosEn = (t: number) =>
    animals.filter((a) => a.created_at <= t && (bajas.get(a.id) == null || bajas.get(a.id)! > t)).length;
  const promedio = (vivosEn(desde) + vivosEn(Math.min(hasta, ahora))) / 2;
  if (!promedio) return null;
  return (muertes / promedio) * 100;
}
