import type { CommandEvent } from './result';
export type Observer = (event: Readonly<CommandEvent>) => void | Promise<void>;
/** Operational events only; financial/inventory audit is persisted inside the SQL transaction. */
export async function emit(event: CommandEvent, observers: readonly Observer[] = []) {
  console.info(JSON.stringify(event));
  for (const observer of observers) {
    try { await observer(Object.freeze({ ...event })); }
    catch { console.warn(JSON.stringify({ message: 'Observer failed', requestId: event.requestId, command: event.command })); }
  }
}
/** Log codes and correlation IDs, never credentials, request bodies or raw database text. */
export function logFailure(error: unknown, requestId: string, command: string) {
  const code = error && typeof error === 'object' && 'providerCode' in error ? String(error.providerCode) : undefined;
  console.error(JSON.stringify({ requestId, command, code, name: error instanceof Error ? error.name : 'UnknownError' }));
}
