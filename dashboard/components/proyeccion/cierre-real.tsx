'use client';

import { CheckCircle2 } from 'lucide-react';
import { cerrarConReal } from '@/app/(dashboard)/proyeccion/actions';
import { FormDialog } from '@/components/ui/form-dialog';
import { Field, Input, Select } from '@/components/ui/input';
import type { Lote } from '@/lib/db/types';

export function CierreReal({ id, lotes, loteId, desde }: { id: string; lotes: Lote[]; loteId: string | null; desde: string }) {
  return (
    <FormDialog
      title="Comparar con el resultado real"
      description="Suma ventas, compras y gastos del lote cargados en Finanzas entre las dos fechas."
      trigger={
        <>
          <CheckCircle2 className="h-4 w-4" /> Cerrar con lo real
        </>
      }
      triggerVariant="outline"
      action={cerrarConReal}
      submitLabel="Calcular"
    >
      <input type="hidden" name="id" value={id} />
      <Field label="Lote">
        <Select name="lote_id" defaultValue={loteId ?? ''} required>
          <option value="">Elegí…</option>
          {lotes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Desde">
          <Input name="desde" type="date" defaultValue={desde} required />
        </Field>
        <Field label="Hasta">
          <Input name="hasta" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </Field>
      </div>
    </FormDialog>
  );
}
