'use client';
import { guardarLote,guardarPotrero } from '@/app/(dashboard)/config/actions';
import { FormDialog } from '@/components/ui/form-dialog';
import { Field,Input } from '@/components/ui/input';
import type { Lote,Potrero } from '@/lib/db/types';
import { Plus } from 'lucide-react';
export function PotreroForm({ potrero }: { potrero?: Potrero }) {
  return (
    <FormDialog
      title={potrero ? `Editar ${potrero.nombre}` : 'Nuevo potrero'}
      trigger={potrero ? 'Editar' : <><Plus className="h-4 w-4" /> Potrero</>}
      triggerVariant={potrero ? 'ghost' : 'outline'}
      action={guardarPotrero}
    >
      {potrero && <input type="hidden" name="id" value={potrero.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre">
          <Input name="nombre" defaultValue={potrero?.nombre} required />
        </Field>
        <Field label="Hectáreas">
          <Input name="hectareas" type="number" min="0" step="0.1" defaultValue={potrero?.hectareas ?? ''} />
        </Field>
        <Field label="Recurso forrajero">
          <Input name="recurso_forrajero" defaultValue={potrero?.recurso_forrajero ?? ''} placeholder="Campo natural, pastura, verdeo…" />
        </Field>
        <Field label="Capacidad (EV)">
          <Input name="capacidad_ev" type="number" min="0" defaultValue={potrero?.capacidad_ev ?? ''} />
        </Field>
      </div>
    </FormDialog>
  );
}

export function LoteForm({ lote }: { lote?: Lote }) {
  return (
    <FormDialog
      title={lote ? `Editar ${lote.nombre}` : 'Nuevo lote'}
      trigger={lote ? 'Editar' : <><Plus className="h-4 w-4" /> Lote</>}
      triggerVariant={lote ? 'ghost' : 'outline'}
      action={guardarLote}
    >
      {lote && <input type="hidden" name="id" value={lote.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre">
          <Input name="nombre" defaultValue={lote?.nombre} required />
        </Field>
        <Field label="Ubicación">
          <Input name="ubicacion" defaultValue={lote?.ubicacion ?? ''} />
        </Field>
        <Field label="Hectáreas">
          <Input name="hectareas" type="number" min="0" step="0.1" defaultValue={lote?.hectareas ?? ''} />
        </Field>
        <Field label="Alquiler (ARS/ha/año)">
          <Input name="costo_alquiler_ha" type="number" min="0" defaultValue={lote?.costo_alquiler_ha ?? ''} />
        </Field>
      </div>
    </FormDialog>
  );
}
