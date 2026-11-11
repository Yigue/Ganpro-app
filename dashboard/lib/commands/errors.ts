import { TECHNICAL_ERROR } from './result';
export class InputError extends Error {
  constructor(public readonly fields: Record<string, string[]> = {}) { super('VALIDATION'); }
}
export class DataError extends Error {
  constructor(public readonly providerCode: string) { super('DEPENDENCY_FAILURE'); }
}
const messages: Record<string, string> = {
  INSUFFICIENT_STOCK: 'No hay existencias suficientes. No se guardó ningún descuento parcial.',
  EXPIRED_BATCH: 'La partida está vencida o falta informar su vencimiento.',
  MANAGED_STOCK: 'Ese stock se gestiona desde Insumos. Registrá una compra o consumo.',
  UNMANAGED_SUPPLY: 'Incorporá el insumo y su saldo inicial en Gestión antes de consumirlo.',
  GRAZING_CONFLICT: 'El lote o potrero ya tiene una ocupación o planificación que se superpone.',
  REST_PERIOD: 'El potrero todavía debe completar su período de descanso.',
  FORAGE_CAPACITY: 'El lote supera la capacidad o el forraje disponible para esos días.',
  CURRENT_SNAPSHOT: 'El corte físico debe corresponder a hoy. No se reconstruyen inventarios antiguos con datos actuales.',
  MISSING_WEIGHT: 'Faltan pesos en animales activos. Completalos antes del corte.',
  STATEMENT_BALANCE: 'El saldo inicial más los movimientos no coincide con el saldo final del extracto.',
  DUPLICATE_BANK_REF: 'El extracto contiene referencias ya importadas para esa cuenta. Revisá el archivo para no duplicarlas.',
  BANK_MISMATCH: 'La cuenta o el importe no coincide con el asiento seleccionado.',
  STORAGE_UNAVAILABLE: 'No pudimos acceder al almacenamiento de comprobantes. Reintentá más tarde.',
  LAST_ADMIN: 'Debe quedar al menos un administrador. Asigná otro antes de cambiar este rol.',
  FORBIDDEN: 'No tenés permiso para realizar esta operación.',
  UNAUTHORIZED: 'Tu sesión venció. Volvé a ingresar.',
  INVALID_GEOMETRY: 'El polígono debe estar cerrado, sin cruces y con al menos 3 puntos distintos.',
  INVALID_INPUT: 'Revisá los datos ingresados.',
  NOT_FOUND: 'No se encontró el registro. Actualizá la pantalla.',
  DUPLICATE_TAG: 'Esa caravana ya está asignada en el stock actual o ese RFID ya está registrado.',
  REUSED_TAG_REVIEW: 'Esa caravana figura en una baja anterior. Revisá la identidad y registrá el nuevo animal desde Alta individual o Compra; no se creó otro desde el CSV.',
  TAG_REUSE_CONFLICT: 'No se puede reactivar el animal: su caravana está asignada a otro en stock. Revisá las identidades antes de anular la venta.',
  CONFLICT: 'Los datos cambiaron. Actualizá la pantalla antes de volver a guardar.',
  WITHDRAWAL: 'Hay animales en período de retiro. No se puede registrar la venta.',
  INACTIVE_ANIMAL: 'La operación requiere animales activos y sin bajas anteriores.',
  INVALID_REFERENCE: 'Revisá el lote, potrero y las referencias seleccionadas.',
  SEX_CATEGORY: 'La categoría no corresponde al sexo del animal.',
  INSUFFICIENT_BALANCE: 'El importe supera el saldo pendiente.',
  CLOSED_PERIOD: 'El período está cerrado. Usá una fecha posterior al cierre.',
  DATE_ORDER: 'La fecha no puede anteceder al comprobante ni a sus últimos pagos.',
  IDEMPOTENCY_CONFLICT: 'Esta operación ya fue enviada con otros datos. Actualizá la pantalla.',
  MAP_CONFLICT: 'Otro usuario editó el potrero. Recargá el mapa antes de guardar.',
  REVERSAL_REQUIRED: 'Revertí los pagos asociados y conciliá el ganado antes de anular.',
  ALREADY_REVERSED: 'Ese pago ya fue revertido.',
  PLAN_REQUIRES_STOCK: 'Registrá la compra o venta en Movimientos con sus caravanas para afectar stock y finanzas juntos.',
};
export class DomainError extends Error {
  constructor(public readonly code: string) { super(code); }
}
/** Dependency text is never returned, even when it resembles a public message. */
export function databaseError(error: { code?: string; message?: string }): Error {
  const match = error.message?.match(/^GANPRO_([A-Z_]+)$/);
  if (match && messages[match[1]]) return new DomainError(match[1]);
  if (error.code === '23505') return new DomainError('DUPLICATE_TAG');
  if (error.code === '23503') return new DomainError('INVALID_REFERENCE');
  if (['40001', '40P01'].includes(error.code ?? '')) return new DomainError('CONFLICT');
  return new DataError(error.code ?? 'UNKNOWN');
}
export function publicFailure(error: unknown) {
  if (error instanceof InputError) return { error: 'Revisá los datos ingresados.', code: 'VALIDATION', fieldErrors: error.fields };
  if (error instanceof DomainError && messages[error.code]) return { error: messages[error.code], code: error.code };
  return { error: TECHNICAL_ERROR, code: 'SERVICE_UNAVAILABLE' };
}
