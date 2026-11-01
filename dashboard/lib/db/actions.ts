import 'server-only';
import { revalidatePath } from 'next/cache';
import type { z } from 'zod';
import type { ActionState } from '@/components/ui/form-dialog';
import { createClient } from '@/lib/supabase/server';
import { requireRol } from './auth';
import type { Rol } from './types';

/** Convierte 'YYYY-MM-DD' de un <input type="date"> a ms (mediodía local, evita saltos por huso). */
export function fechaMs(v: string): number {
  return new Date(`${v}T12:00:00`).getTime();
}

/** Vacíos a undefined para que z.coerce y .optional() funcionen con FormData. */
export function formToObject(formData: FormData): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key).map(String).filter((v) => v.trim() !== '');
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

/**
 * Esqueleto común de las Server Actions: valida rol y datos con Zod, ejecuta y
 * revalida las rutas afectadas.
 */
export function crearAccion<S extends z.ZodTypeAny>(
  schema: S,
  run: (data: z.infer<S>, supabase: Awaited<ReturnType<typeof createClient>>) => Promise<string | void>,
  options: { roles?: Rol[]; revalidate: string[] },
) {
  return async (_prev: ActionState, formData: FormData): Promise<ActionState> => {
    try {
      await requireRol(...(options.roles ?? ['admin', 'campo']));
      const parsed = schema.safeParse(formToObject(formData));
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return { error: `${issue.path.join('.') || 'Dato'}: ${issue.message}` };
      }
      const supabase = await createClient();
      const message = await run(parsed.data, supabase);
      options.revalidate.forEach((p) => revalidatePath(p));
      return { ok: true, message: message ?? 'Guardado' };
    } catch (e) {
      if (e && typeof e === 'object' && 'digest' in e) throw e; // redirect()
      return { error: e instanceof Error ? e.message : 'Error inesperado' };
    }
  };
}

export function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
