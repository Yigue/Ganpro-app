import type { Animal, AnimalMovement, Evento, OperationLog } from '@/lib/db/types';

/** Fixed recipients survive transfers; legacy records use membership at application time. */
export function treatmentsForAnimal(
  animal: Animal, logs: OperationLog[], movements: AnimalMovement[], events: Evento[],
): OperationLog[] {
  const history = movements.filter(m => m.animal_id === animal.id)
    .sort((a, b) => a.fecha - b.fecha || a.created_at - b.created_at);
  const life = events.filter(e => e.animal_id === animal.id).sort((a, b) => a.timestamp - b.timestamp);
  const entries = life.filter(e => ['COMPRA', 'NACIMIENTO'].includes(e.tipo));
  const enteredAt = entries.length ? Math.min(...entries.map(e => e.timestamp)) : animal.created_at;
  return logs.filter(log => {
    if (log.receptores_fijados) return log.aplicacion_animales?.some(r => r.animal_id === animal.id) ?? false;
    if (log.animal_id) return log.animal_id === animal.id;
    const at = log.fecha_aplicacion;
    if (at < enteredAt) return false;
    let present = true;
    for (const event of life.filter(e => e.timestamp <= at)) {
      if (['VENTA', 'MUERTE'].includes(event.tipo)) present = false;
      if (['COMPRA', 'NACIMIENTO'].includes(event.tipo)) present = true;
      if (event.tipo === 'ANULACION' && event.valor != null) present = event.valor > 0;
    }
    if (!present) return false;
    const previous = history.filter(m => m.fecha <= at).at(-1);
    const next = history.find(m => m.fecha > at);
    const lot = previous ? previous.lote_destino_id : next ? next.lote_origen_id : animal.lote_id;
    return log.lote_id == null || log.lote_id === lot;
  }).map(log => log.receptores_fijados ? log : { ...log, animal_id: animal.id });
}
