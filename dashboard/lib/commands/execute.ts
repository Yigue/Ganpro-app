import { randomUUID } from 'node:crypto';
import { commandContext } from './context';
import { emit, logFailure, type Observer } from './events';
import { publicFailure } from './errors';
import type { ActionState } from './result';
/** Next.js redirects/notFound remain control flow; unknown digest objects are not trusted. */
export function isControlFlow(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('digest' in error) || typeof error.digest !== 'string') return false;
  return error.digest.startsWith('NEXT_REDIRECT;') || error.digest.startsWith('NEXT_HTTP_ERROR_FALLBACK;');
}
export async function executeCommand(options: {
  name: string; key: string; handle: () => Promise<string | void>; observers?: readonly Observer[];
}): Promise<ActionState> {
  const requestId = randomUUID(), started = Date.now();
  return commandContext.run({ command: options.name, requestId, key: options.key }, async () => {
    const event = (type: 'started' | 'succeeded' | 'failed', code?: string) => emit({ type, command: options.name, requestId, durationMs: Date.now() - started, ...(code ? { code } : {}) }, options.observers);
    await event('started');
    try {
      const message = await options.handle();
      await event('succeeded');
      return { ok: true, message: message ?? 'Guardado', requestId };
    } catch (error) {
      if (isControlFlow(error)) throw error;
      const failure = publicFailure(error);
      logFailure(error, requestId, options.name);
      await event('failed', failure.code);
      return { ...failure, requestId };
    }
  });
}
