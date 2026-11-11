'use client';
import {businessToday} from '@/lib/calc/business-date';


import { Check, ClipboardCheck, Plus } from 'lucide-react';
import { completarEtapa, crearServicio, registrarRevisacion } from '@/app/(dashboard)/reproduccion/actions';
import { FormDialog, useAccion } from '@/components/ui/form-dialog';
import { Field, Input, Select } from '@/components/ui/input';
import type { Lote } from '@/lib/db/types';

const hoy = () => businessToday();

export function ServicioForm({ lotes, temporada }: { lotes: Lote[]; temporada: string }) {
  return (
    <FormDialog
      title="Nueva temporada de servicio"
      description="Si no cargás vientres, se cuentan las vacas y vaquillonas activas del lote."
      trigger={
        <>
          <Plus className="h-4 w-4" /> Servicio
        </>
      }
      action={crearServicio}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Temporada">
          <Input name="temporada" defaultValue={temporada} required />
        </Field>
        <Field label="Lote">
          <Select name="lote_id" required>
            <option value="">Elegí…</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Caravanas de los toros" className="sm:col-span-2">
          <Input name="toros" placeholder="0241 0242" required />
        </Field>
        <Field label="Vientres entorados">
          <Input name="vientres" type="number" min="1" />
        </Field>
        <Field label="Entrada de toros">
          <Input name="fecha_entrada" type="date" defaultValue={hoy()} required />
        </Field>
        <Field label="Salida de toros">
          <Input name="fecha_salida" type="date" />
        </Field>
        <Field label="Notas">
          <Input name="notas" />
        </Field>
      </div>
    </FormDialog>
  );
}

export function RevisacionForm() {
  return (
    <FormDialog
      title="Revisación de toro"
      trigger={
        <>
          <ClipboardCheck className="h-4 w-4" /> Revisación
        </>
      }
      triggerVariant="outline"
      action={registrarRevisacion}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Caravana">
          <Input name="caravana" required />
        </Field>
        <Field label="Fecha">
          <Input name="fecha" type="date" defaultValue={hoy()} required />
        </Field>
        <Field label="¿Apto para servicio?">
          <Select name="apto" defaultValue="si">
            <option value="si">Apto</option>
            <option value="no">No apto</option>
          </Select>
        </Field>
        <Field label="Circunferencia escrotal (cm)">
          <Input name="circunferencia_escrotal_cm" type="number" step="0.5" min="0" />
        </Field>
        <Field label="Sanitaria (Trich/Campy, etc.)" className="sm:col-span-2">
          <Input name="sanitaria" />
        </Field>
      </div>
    </FormDialog>
  );
}

export function CompletarEtapa({ id }: { id: string }) {
  const [, action, pending] = useAccion(completarEtapa);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} className="rounded p-1 text-muted-foreground hover:bg-success/10 hover:text-success" title="Marcar hecha">
        <Check className="h-4 w-4" />
      </button>
    </form>
  );
}
