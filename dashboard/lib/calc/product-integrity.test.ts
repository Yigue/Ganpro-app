import { describe, expect, it } from 'vitest';
import type { AnimalMovement, MovimientoFinanciero, OperationLog } from '@/lib/db/types';
import { tratamientosFixture } from '../../tests/fixtures/treatments';
import { treatmentsForAnimal } from './treatment-history';
import { animalesEnCarencia } from './sanidad';
import { costosPorLote } from './costos';
import { healthExpenses } from '@/lib/management/health-expenses';
import { operationTimestamp } from './business-date';

const { animal, log, lote, expense } = tratamientosFixture;
describe('recipient and economic integrity', () => {
  it('keeps a fixed withdrawal after a transfer and excludes later arrivals', () => {
    const treated = log({ receptores_fijados: true, aplicacion_animales: [{ animal_id: 'a' }] });
    const moved = animal({ lote_id: 'other' });
    const history = treatmentsForAnimal(moved, [treated], [], []);
    expect(animalesEnCarencia([moved], history, 200)).toHaveLength(1);
    expect(treatmentsForAnimal(animal({ id: 'later' }), [treated], [], [])).toEqual([]);
  });
  it('includes whole-herd records and reconstructs legacy lot membership', () => {
    const moved = animal({ lote_id: 'other' });
    const movement: AnimalMovement = { id: 'move', animal_id: 'a', fecha: 150, created_at: 150, updated_at: 150,
      lote_origen_id: 'l1', lote_destino_id: 'other', potrero_origen_id: null, potrero_destino_id: null };
    expect(treatmentsForAnimal(moved, [log({}), log({ id: 'whole', lote_id: null })], [movement], [])).toHaveLength(2);
    expect(treatmentsForAnimal(animal({ created_at: 110 }), [log({ lote_id: null })], [], [])).toEqual([]);
  });
  it('adds distinct veterinary fees and applications instead of hiding one source', () => {
    expect(cost([expense({ monto: 100 })], [log({ costo_total: 200 })]).sanidad).toBe(300);
  });
  it('counts a linked supply consumption once and preserves other applications', () => {
    expect(cost([expense({ monto: 200, aplicacion_id: 'log' })], [log({ costo_total: 200 }), log({ id: 'second', costo_total: 50 })]).sanidad).toBe(250);
    expect(cost([], [log({ costo_total: 200 })]).sanidad).toBe(200);
  });
  it('uses the same application expense in totals and lot breakdowns without creating cash', () => {
    const logs = [log({ costo_total: 200 })];
    const fees = [expense({ monto: 100 })];
    const economic = [...fees, ...healthExpenses(logs, fees)];
    expect(economic.reduce((total, m) => total + m.monto, 0)).toBe(300);
    expect(cost(economic, logs).sanidad).toBe(300);
    expect(healthExpenses(logs, [expense({ monto: 200, aplicacion_id: 'log' })])).toEqual([]);
  });
  it('does not replace an afternoon operation with noon on the same business day', () => {
    const now = Date.parse('2026-11-18T18:00:00-03:00');
    expect(operationTimestamp('2026-11-18', Date.parse('2026-11-18T12:00:00-03:00'), now)).toBe(now);
    expect(operationTimestamp('2026-11-17', 123, now)).toBe(123);
  });
});
function cost(movs: MovimientoFinanciero[], logs: OperationLog[]) {
  return costosPorLote({ lotes: [lote], animals: [animal({})], movs, logs, catalogo: new Map(), desde: 1, hasta: 300 })[0];
}
