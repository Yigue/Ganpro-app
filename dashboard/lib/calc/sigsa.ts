import type { Animal, SigsaStock } from '@/lib/db/types';
import { contarPor } from './stock';

export interface ConciliacionFila {
  categoria: string;
  propio: number;
  sigsa: number;
  diferencia: number;
}

/** Filas de la última fecha cargada en sigsa_stock. */
export function ultimaActa(registros: SigsaStock[]): { fecha: number | null; acta: string | null; filas: SigsaStock[] } {
  if (!registros.length) return { fecha: null, acta: null, filas: [] };
  const fecha = Math.max(...registros.map((r) => r.fecha));
  const filas = registros.filter((r) => r.fecha === fecha);
  return { fecha, acta: filas.find((f) => f.acta_numero)?.acta_numero ?? null, filas };
}

export function conciliar(animals: Animal[], acta: SigsaStock[]): ConciliacionFila[] {
  const propio = contarPor(animals.filter((a) => a.estado === 'ACTIVO'), (a) => a.categoria);
  const sigsa: Record<string, number> = {};
  for (const r of acta) sigsa[r.categoria] = (sigsa[r.categoria] ?? 0) + r.cabezas;
  const cats = new Set([...Object.keys(propio), ...Object.keys(sigsa)]);
  return [...cats]
    .map((categoria) => ({
      categoria,
      propio: propio[categoria] ?? 0,
      sigsa: sigsa[categoria] ?? 0,
      diferencia: (propio[categoria] ?? 0) - (sigsa[categoria] ?? 0),
    }))
    .sort((a, b) => b.propio - a.propio);
}
