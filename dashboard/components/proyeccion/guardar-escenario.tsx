'use client';

import { Save } from 'lucide-react';
import { guardarEscenario } from '@/app/(dashboard)/proyeccion/actions';
import { FormDialog } from '@/components/ui/form-dialog';
import { Field, Input, Select } from '@/components/ui/input';
import type { Lote, TipoEscenario } from '@/lib/db/types';

/** Guarda los supuestos y el resultado de la herramienta como escenario. */
export function GuardarEscenario({
  tipo,
  id,
  nombre,
  supuestos,
  resultado,
  lineas,
  lotes,
  loteId,
}: {
  tipo: TipoEscenario;
  id?: string;
  nombre?: string;
  supuestos: unknown;
  resultado: unknown;
  lineas?: unknown;
  lotes?: Lote[];
  loteId?: string | null;
}) {
  return (
    <FormDialog
      title={id ? 'Guardar cambios del escenario' : 'Guardar escenario'}
      description="Queda en la lista para compararlo con otros y, después, con el resultado real."
      trigger={
        <>
          <Save className="h-4 w-4" /> {id ? 'Guardar cambios' : 'Guardar escenario'}
        </>
      }
      action={guardarEscenario}
    >
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="supuestos" value={JSON.stringify(supuestos)} />
      <input type="hidden" name="resultado" value={JSON.stringify(resultado)} />
      {lineas !== undefined && <input type="hidden" name="lineas" value={JSON.stringify(lineas)} />}
      <Field label="Nombre">
        <Input name="nombre" defaultValue={nombre} required placeholder="Ej.: Invernada novillos verdeo 2027" />
      </Field>
      {lotes && (
        <Field label="Lote (opcional, para comparar con lo real)">
          <Select name="lote_id" defaultValue={loteId ?? ''}>
            <option value="">Sin lote</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </FormDialog>
  );
}
