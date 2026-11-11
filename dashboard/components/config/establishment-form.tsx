'use client';
import { guardarEstablecimiento } from '@/app/(dashboard)/config/actions';
import { Button } from '@/components/ui/button';
import { ActionMessage,useAccion } from '@/components/ui/form-dialog';
import { Field,Input,Select } from '@/components/ui/input';
import type { Establecimiento } from '@/lib/db/types';
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function EstablecimientoForm({ est, editable }: { est: Establecimiento; editable: boolean }) {
  const [state, action, pending] = useAccion(guardarEstablecimiento);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Nombre">
        <Input name="nombre" defaultValue={est.nombre} required disabled={!editable} />
      </Field>
      <Field label="RENSPA">
        <Input name="renspa" defaultValue={est.renspa ?? ''} disabled={!editable} />
      </Field>
      <Field label="Localidad">
        <Input name="localidad" defaultValue={est.localidad ?? ''} disabled={!editable} />
      </Field>
      <Field label="Provincia">
        <Input name="provincia" defaultValue={est.provincia ?? ''} disabled={!editable} />
      </Field>
      <Field label="Hectáreas ganaderas">
        <Input name="hectareas_ganaderas" type="number" min="0" defaultValue={est.hectareas_ganaderas ?? ''} disabled={!editable} />
      </Field>
      <Field label="Inicio del ejercicio">
        <Select name="inicio_ejercicio_mes" defaultValue={est.inicio_ejercicio_mes} disabled={!editable}>
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Alerta de pesada (días)">
        <Input name="dias_alerta_pesada" type="number" min="1" defaultValue={est.dias_alerta_pesada} disabled={!editable} />
      </Field>
      <Field label="Aviso sanitario (días antes)">
        <Input name="dias_alerta_sanidad" type="number" min="1" defaultValue={est.dias_alerta_sanidad} disabled={!editable} />
      </Field>
      {editable && (
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-4">
          <Button type="submit" size="sm" disabled={pending}>
            Guardar
          </Button>
          <ActionMessage state={state} />
        </div>
      )}
    </form>
  );
}
