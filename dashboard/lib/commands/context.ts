import { AsyncLocalStorage } from 'node:async_hooks';
export const commandContext = new AsyncLocalStorage<{ command: string; requestId: string; key: string }>();
