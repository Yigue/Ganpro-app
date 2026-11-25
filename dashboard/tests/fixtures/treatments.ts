import type { Animal, Lote, MovimientoFinanciero, OperationLog } from '@/lib/db/types';
const base = { id: 'a', created_at: 1, updated_at: 1 };
export const tratamientosFixture = {
  animal: (patch: Partial<Animal>): Animal => ({ ...base, id_caravana: 'A', rfid: null, sexo: 'H', categoria: 'Vaca', raza: null,
    fecha_nacimiento: null, peso_actual: null, estado: 'ACTIVO', lote_id: 'l1', potrero_id: null, synced_at: null, ...patch }),
  log: (patch: Partial<OperationLog>): OperationLog => ({ ...base, id: 'log', animal_id: null, lote_id: 'l1', operation_id: 'vaccine',
    fecha_aplicacion: 100, fecha_fin_carencia: 300, dosis: 1, responsable: null, acta_numero: null, producto_lote: null, ...patch }),
  lote: { ...base, id: 'l1', nombre: 'Cría', ubicacion: null, descripcion: null, hectareas: null, costo_alquiler_ha: null,
    geo_json: null, densidad_carga: null } satisfies Lote,
  expense: (patch: Partial<MovimientoFinanciero>): MovimientoFinanciero => ({ ...base, tipo: 'GASTO', categoria: 'SANIDAD', lote_id: 'l1',
    animal_id: null, monto: 0, fecha: 100, descripcion: null, comprobante: null, dte_numero: null, cabezas: null, kg: null,
    categoria_animal: null, renspa_destino: null, dte_estado: null, fecha_cobro: null, cobrado: null, ...patch }),
};
