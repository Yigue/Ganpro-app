'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Button, type ButtonProps } from './button';

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

type Accion = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** useActionState + refresco de la pantalla cuando la acción termina bien. */
export function useAccion(action: Accion) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {});
  const last = useRef(state);
  useEffect(() => {
    if (state !== last.current && state.ok) router.refresh();
    last.current = state;
  }, [state, router]);
  return [state, formAction, pending] as const;
}

/**
 * Botón que abre un panel con un formulario conectado a una Server Action.
 * Se cierra solo cuando la acción devuelve ok.
 */
export function FormDialog({
  title,
  description,
  trigger,
  triggerVariant = 'default',
  action,
  children,
  submitLabel = 'Guardar',
  disabled,
}: {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  triggerVariant?: ButtonProps['variant'];
  action: Accion;
  children: React.ReactNode;
  submitLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useAccion(action);
  const lastState = useRef(state);

  useEffect(() => {
    if (state !== lastState.current && state.ok) setOpen(false);
    lastState.current = state;
  }, [state]);

  return (
    <>
      <Button variant={triggerVariant} size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        {trigger}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-lg border bg-card p-5 shadow-xl sm:rounded-lg">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-muted" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form action={formAction} className="flex flex-col gap-4">
              {children}
              {state.error && <p className="text-sm text-danger">{state.error}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Guardando…' : submitLabel}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function ActionMessage({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm text-danger">{state.error}</p>;
  if (state.message) return <p className="text-sm text-success">{state.message}</p>;
  return null;
}
