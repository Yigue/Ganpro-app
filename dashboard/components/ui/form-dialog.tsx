'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type {ActionState} from '@/lib/commands/result';
import {ActionMessage} from './action-state';
export type {ActionState} from '@/lib/commands/result';
export {ActionMessage} from './action-state';
import { Button, type ButtonProps } from './button';

type Accion = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** useActionState + refresco de la pantalla cuando la acción termina bien. */
export function useAccion(action: Accion,localError=false) {
  const router = useRouter();
  const commandKey=useRef<string|null>(null);
  const [state, formAction, pending] = useActionState(async(prev:ActionState,form:FormData)=>{
    commandKey.current??=crypto.randomUUID();
    form.set('_commandKey',commandKey.current);
    try {const result=await action(prev,form);if(result.ok)commandKey.current=null;return result;}
    catch {return {error:'No pudimos completar la operación. Intentá nuevamente más tarde.'};}
  }, {});
  const last = useRef(state);
  useEffect(() => {
    if (state !== last.current && state.ok) router.refresh();
    if(state !== last.current && state.error && !localError)window.dispatchEvent(new CustomEvent('ganpro:action-error',{detail:state}));
    last.current = state;
  }, [state, router,localError]);
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
  disabled,onSuccess,
}: {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  triggerVariant?: ButtonProps['variant'];
  action: Accion;
  children: React.ReactNode;
  submitLabel?: string;
  disabled?: boolean;onSuccess?:()=>void;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useAccion(action,true);
  const lastState = useRef(state);

  useEffect(() => {
    if (state !== lastState.current && state.ok) {setOpen(false);onSuccess?.();}
    lastState.current = state;
  }, [state,onSuccess]);

  return (
    <>
      <Button variant={triggerVariant} size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        {trigger}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label={title} className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-lg border bg-card p-5 shadow-xl sm:rounded-lg">
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
              <ActionMessage state={state}/>
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
