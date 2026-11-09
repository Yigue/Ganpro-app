import { TECHNICAL_ERROR } from './result';
export class InputError extends Error {
  constructor(public readonly fields: Record<string, string[]> = {}) { super('VALIDATION'); }
}
export class DataError extends Error {
  constructor(public readonly providerCode: string) { super('DEPENDENCY_FAILURE'); }
}
const messages: Record<string, string> = {
  LAST_ADMIN: 'Debe quedar al menos un administrador. Asigná otro antes de cambiar este rol.',
  FORBIDDEN: 'No tenés permiso para realizar esta operación.',
  UNAUTHORIZED: 'Tu sesión venció. Volvé a ingresar.',
  INVALID_GEOMETRY: 'El polígono debe estar cerrado, sin cruces y con al menos 3 puntos distintos.',
  INVALID_INPUT: 'Revisá los datos ingresados.',
  NOT_FOUND: 'No se encontró el registro. Actualizá la pantalla.',
  DUPLICATE_TAG: 'Esa caravana o RFID ya está registrado.',
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
