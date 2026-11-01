import type { Lote, MovimientoFinanciero, OperationCatalog, OperationLog, Animal } from '@/lib/db/types';
import { DAY_MS } from './fechas';
import { tipoCosto } from './finanzas';

export interface CostoLote {
  loteId: string | null;
  nombre: string;
  sanidad: number;
  nutricion: number;
  alquiler: number;
  otrosDirectos: number;
  total: number;
  cabezas: number;
  porCabeza: number | null;
}

/**
 * Costo por lote en el período. Sanidad y nutrición salen de los gastos cargados;
 * si no hay gasto de sanidad cargado, se estima con aplicaciones × costo unitario.
 * El alquiler usa costo_alquiler_ha (ARS/ha/año) prorrateado por días.
 */
export function costosPorLote(params: {
  lotes: Lote[];
  animals: Animal[];
  movs: MovimientoFinanciero[];
  logs: OperationLog[];
  catalogo: Map<string, OperationCatalog>;
  desde: number;
  hasta: number;
}): CostoLote[] {
  const { lotes, animals, movs, logs, catalogo, desde, hasta } = params;
  const dias = Math.max(1, (hasta - desde) / DAY_MS);
  return lotes.map((lote) => {
    const cabezas = animals.filter((a) => a.estado === 'ACTIVO' && a.lote_id === lote.id).length;
    const delLote = movs.filter((m) => m.tipo === 'GASTO' && m.lote_id === lote.id && m.fecha >= desde && m.fecha <= hasta);
    const suma = (cat: string) => delLote.filter((m) => m.categoria === cat).reduce((a, m) => a + m.monto, 0);

    let sanidad = suma('SANIDAD');
    if (!sanidad) {
      sanidad = logs
        .filter((l) => l.lote_id === lote.id && l.fecha_aplicacion >= desde && l.fecha_aplicacion <= hasta)
        .reduce((a, l) => a + (catalogo.get(l.operation_id)?.costo_unitario ?? 0) * (l.dosis ?? 1) * cabezas, 0);
    }
    const nutricion = suma('NUTRICION');
    const alquilerCargado = suma('ALQUILER');
    const alquiler = alquilerCargado || ((lote.costo_alquiler_ha ?? 0) * (lote.hectareas ?? 0) * dias) / 365;
    const otrosDirectos = delLote
      .filter((m) => !['SANIDAD', 'NUTRICION', 'ALQUILER'].includes(m.categoria) && tipoCosto(m.categoria) === 'directo')
      .reduce((a, m) => a + m.monto, 0);
    const total = sanidad + nutricion + alquiler + otrosDirectos;
    return { loteId: lote.id, nombre: lote.nombre, sanidad, nutricion, alquiler, otrosDirectos, total, cabezas, porCabeza: cabezas ? total / cabezas : null };
  });
}

export function costoPorKg(costoTotal: number, kgProducidos: number): number | null {
  if (kgProducidos <= 0) return null;
  return costoTotal / kgProducidos;
}

export interface SimulacionInput {
  vientres: number;
  prenezPct: number;
  destetePct: number;
  pesoDesteteKg: number;
  costoTotal: number;
  otrosKg: number;
}

/** Simulador de cría: kg producidos y costo por kg / por ternero según preñez y destete. */
export function simularCria(i: SimulacionInput) {
  const terneros = i.vientres * (i.prenezPct / 100) * (i.destetePct / 100);
  const kgDestetados = terneros * i.pesoDesteteKg;
  const kg = kgDestetados + i.otrosKg;
  return {
    terneros,
    kgDestetados,
    kgPorVaca: i.vientres ? kgDestetados / i.vientres : 0,
    costoPorKg: kg > 0 ? i.costoTotal / kg : null,
    costoPorTernero: terneros > 0 ? i.costoTotal / terneros : null,
  };
}
