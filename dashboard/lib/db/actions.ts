import 'server-only';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/commands/result';
import { executeCommand } from '@/lib/commands/execute';
import { databaseError, InputError } from '@/lib/commands/errors';
import { createClient } from '@/lib/supabase/server';
import { requireRol } from './auth';
import type { Rol } from './types';
/** Argentina is fixed explicitly; Vercel runs in UTC and must produce the same business date. */
export function fechaMs(v: string): number {
  const ms = new Date(`${v}T12:00:00-03:00`).getTime();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== v) throw new InputError({ fecha: ['Ingresá una fecha válida.'] });
  return ms;
}
export function formToObject(form: FormData): Record<string, string | string[] | undefined> {
  return Object.fromEntries([...new Set(form.keys())].filter(key => !key.startsWith('_')).map(key => {
    const values = form.getAll(key).map(String).filter(v => v.trim() !== '');
    return [key, values.length > 1 ? values : values[0]];
  }));
}
export function crearAccion<S extends z.ZodTypeAny>(
  schema: S,
  run: (data: z.infer<S>, supabase: Awaited<ReturnType<typeof createClient>>) => Promise<string | void>,
  options: { roles?: Rol[]; revalidate: string[]; name?: string },
) {
  return async (_prev: ActionState, form: FormData): Promise<ActionState> => {
    const raw = form.get('_commandKey');
    const key = z.string().uuid().safeParse(raw);
    return executeCommand({ name: options.name ?? 'dashboard.action', key: key.success ? key.data : randomUUID(), handle: async () => {
      await requireRol(...(options.roles ?? ['admin', 'campo']));
      if (raw && !key.success) throw new InputError();
      const parsed = schema.safeParse(formToObject(form));
      if (!parsed.success) throw new InputError(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join('.') || '_form', ['Ingresá un valor válido.']])));
      const message = await run(parsed.data, await createClient());
      for (const path of options.revalidate) {
        try { revalidatePath(path); }
        catch { console.warn(JSON.stringify({ message: 'Cache refresh failed after commit', command: options.name })); }
      }
      return message;
    } });
  };
}
export function check<T>(res: { data: T; error: { message?: string; code?: string } | null }): T {
  if (res.error) throw databaseError(res.error);
  return res.data;
}
