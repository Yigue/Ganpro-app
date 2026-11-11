import type { Animal, OperationLog, ScheduledOperation } from '@/lib/db/types';
import { DAY_MS } from './fechas';

export interface Carencia {
  animal: Animal;
  hasta: number;
  operationId: string;
}

/**
 * Animales con período de retiro vigente. Una aplicación por lote alcanza a los
 * animales que hoy están en ese lote. Mientras dure, el animal no se puede vender.
 */
export function animalesEnCarencia(animals: Animal[], logs: OperationLog[], ahora: number): Carencia[] {
  const out = new Map<string, Carencia>();
  const vigentes = logs.filter((l) => l.fecha_aplicacion<=ahora && l.fecha_fin_carencia != null && l.fecha_fin_carencia > ahora);
  for (const log of vigentes) {
    const alcanzados = log.receptores_fijados ? animals.filter(a=>log.aplicacion_animales?.some(r=>r.animal_id===a.id)) : log.animal_id
      ? animals.filter((a) => a.id === log.animal_id)
      : animals.filter((a) => log.lote_id && a.lote_id === log.lote_id);
    for (const a of alcanzados) {
      if (a.estado !== 'ACTIVO') continue;
      const prev = out.get(a.id);
      if (!prev || prev.hasta < log.fecha_fin_carencia!) {
        out.set(a.id, { animal: a, hasta: log.fecha_fin_carencia!, operationId: log.operation_id });
      }
    }
  }
  return [...out.values()].sort((a, b) => b.hasta - a.hasta);
}

export function proximasOperaciones(ops: ScheduledOperation[], ahora: number, dias: number): ScheduledOperation[] {
  const limite = ahora + dias * DAY_MS;
  return ops
    .filter((o) => o.estado === 'PENDIENTE' && o.fecha_programada <= limite)
    .sort((a, b) => a.fecha_programada - b.fecha_programada);
}

export function vencidas(ops: ScheduledOperation[], ahora: number): ScheduledOperation[] {
  return ops.filter((o) => o.estado === 'PENDIENTE' && o.fecha_programada < ahora);
}

export function finCarencia(fechaAplicacion: number, diasCarencia: number | null | undefined): number | null {
  if (!diasCarencia) return null;
  return fechaAplicacion + diasCarencia * DAY_MS;
}
