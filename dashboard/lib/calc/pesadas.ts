import {herdGain} from '../../../src/shared/utils/herdMetrics';
import type { Animal, Evento } from '@/lib/db/types';
import { DAY_MS } from './fechas';

export interface Pesaje {
  timestamp: number;
  valor: number;
}

/** Ganancia diaria por regresión lineal: misma fórmula que calcularGDP de la app. */
export function gdp(pesajes: Pesaje[]): number | null {
  if (pesajes.length < 2) return null;
  const sorted = [...pesajes].sort((a, b) => a.timestamp - b.timestamp);
  const t0 = sorted[0].timestamp;
  const pts = sorted.map((p) => ({ x: (p.timestamp - t0) / DAY_MS, y: p.valor }));
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p.x, 0);
  const sy = pts.reduce((a, p) => a + p.y, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const sx2 = pts.reduce((a, p) => a + p.x * p.x, 0);
  const den = n * sx2 - sx * sx;
  if (den === 0) return null;
  return (n * sxy - sx * sy) / den;
}

export function pesajesPorAnimal(eventos: Evento[]): Map<string, Pesaje[]> {
  const out = new Map<string, Pesaje[]>();
  for (const e of eventos) {
    if (e.tipo !== 'PESAJE' || e.valor == null) continue;
    const list = out.get(e.animal_id) ?? [];
    list.push({ timestamp: e.timestamp, valor: e.valor });
    out.set(e.animal_id, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.timestamp - b.timestamp);
  return out;
}

export interface GdpLote {
  loteId: string | null;
  animales: number;
  gdpPromedio: number | null;
  animalesConPesadas:number;
}

export function gdpPorLote(animals: Animal[], pesajes: Map<string, Pesaje[]>,now=Date.now()): GdpLote[] {
  const grupos = new Map<string | null, Animal[]>();
  const conteo = new Map<string | null, number>();
  for (const a of animals) {
    conteo.set(a.lote_id, (conteo.get(a.lote_id) ?? 0) + 1);
    const list = grupos.get(a.lote_id) ?? [];
    list.push(a);
    grupos.set(a.lote_id, list);
  }
  return [...conteo.entries()].map(([loteId, animales]) => {
    const list = grupos.get(loteId) ?? [];
    const since=now-90*DAY_MS;
    const points=list.flatMap(a=>(pesajes.get(a.id)??[]).filter(p=>p.timestamp>=since&&p.timestamp<=now).map(p=>({...p,animalId:a.id})));
    const gain=herdGain(points);
    return { loteId, animales, gdpPromedio: gain.dailyGain, animalesConPesadas:gain.animals };
  });
}

/** Animales activos cuya última pesada es más vieja que `dias` (o nunca se pesaron). */
export function pesadasAtrasadas(animals: Animal[], pesajes: Map<string, Pesaje[]>, dias: number, ahora: number): Animal[] {
  const limite = ahora - dias * DAY_MS;
  return animals.filter((a) => {
    if (a.estado !== 'ACTIVO' || a.categoria === 'Toro') return false;
    const list = pesajes.get(a.id);
    const ultima = list?.[list.length - 1]?.timestamp;
    return ultima == null || ultima < limite;
  });
}

/** Kg ganados en el período a partir de pesadas (primer y último pesaje dentro del rango). */
export function kgGanados(pesajes: Map<string, Pesaje[]>, desde: number, hasta: number): number {
  let total = 0;
  for (const list of pesajes.values()) {
    const enRango = list.filter((p) => p.timestamp >= desde && p.timestamp <= hasta);
    if (enRango.length < 2) continue;
    const summary=herdGain(enRango.map(p=>({...p,animalId:"subject"})));
    if(summary.animals)total += summary.dailyGain!*summary.animalDays;
  }
  return total;
}
