'use client';
import {businessToday} from '@/lib/calc/business-date';


import {MedicineFields} from '@/components/gestion/medicine-fields';
import type {ManagementData} from '@/lib/management/schema';
import { useState } from 'react';
import { CalendarPlus, Syringe } from 'lucide-react';
import { programarOperacion, registrarAplicacion } from '@/app/(dashboard)/sanidad/actions';
import { FormDialog } from '@/components/ui/form-dialog';
import { Field, Input, Select } from '@/components/ui/input';
import type { Lote, OperationCatalog } from '@/lib/db/types';

const hoy = () => businessToday();

export interface ProgramadaOpcion {
  id: string;
  label: string;
}

function ProductoSelect({ catalogo }: { catalogo: OperationCatalog[] }) {
  return (
    <Select name="operation_id" required>
      <option value="">Elegí…</option>
      {catalogo.map((c) => (
        <option key={c.id} value={c.id}>
          {c.nombre}
          {c.dias_carencia ? ` · retiro ${c.dias_carencia} días` : ''}
        </option>
      ))}
    </Select>
  );
}

function LoteSelect({ lotes, required }: { lotes: Lote[]; required?: boolean }) {
  return (
    <Select name="lote_id" required={required}>
      <option value="">{required ? 'Elegí…' : 'Todo el rodeo'}</option>
      {lotes.map((l) => (
        <option key={l.id} value={l.id}>
          {l.nombre}
        </option>
      ))}
    </Select>
  );
}

export function AplicacionForm({ catalogo, lotes, programadas, management }: { catalogo: OperationCatalog[]; lotes: Lote[]; programadas: ProgramadaOpcion[];management:ManagementData }) {
  const [destino, setDestino] = useState<'lote' | 'animal'>('lote');
  return (
    <FormDialog
      title="Registrar aplicación"
      description="El fin del período de retiro se calcula con los días de carencia del producto."
      trigger={
        <>
          <Syringe className="h-4 w-4" /> Registrar aplicación
        </>
      }
      action={registrarAplicacion}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Aplicado a">
          <Select name="destino" value={destino} onChange={(e) => setDestino(e.target.value as 'lote' | 'animal')}>
            <option value="lote">Un lote completo</option>
            <option value="animal">Un animal</option>
          </Select>
        </Field>
        {destino === 'lote' ? (
          <Field label="Lote">
            <LoteSelect lotes={lotes} required />
          </Field>
        ) : (
          <Field label="Caravana">
            <Input name="caravana" required />
          </Field>
        )}
        <Field label="Producto" className="sm:col-span-2">
          <ProductoSelect catalogo={catalogo} />
        </Field>
        <Field label="Fecha">
          <Input name="fecha" type="date" defaultValue={hoy()} required />
        </Field>
        <Field label="Dosis (ml o unidades)">
          <Input name="dosis" type="number" step="0.1" min="0" />
        </Field>
        <MedicineFields data={management}/>
        <Field label="Lote/serie del producto">
          <Input name="producto_lote" />
        </Field>
        <Field label="Acta FUCOFA">
          <Input name="acta_numero" />
        </Field>
        <Field label="Responsable">
          <Input name="responsable" />
        </Field>
        {programadas.length > 0 && (
          <Field label="Completa la programada">
            <Select name="scheduled_id">
              <option value="">Ninguna</option>
              {programadas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </FormDialog>
  );
}

export function ProgramarForm({ catalogo, lotes }: { catalogo: OperationCatalog[]; lotes: Lote[] }) {
  return (
    <FormDialog
      title="Programar en el calendario"
      trigger={
        <>
          <CalendarPlus className="h-4 w-4" /> Programar
        </>
      }
      triggerVariant="outline"
      action={programarOperacion}
    >
      <Field label="Producto">
        <ProductoSelect catalogo={catalogo} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Lote">
          <LoteSelect lotes={lotes} />
        </Field>
        <Field label="Fecha">
          <Input name="fecha" type="date" defaultValue={hoy()} required />
        </Field>
      </div>
    </FormDialog>
  );
}

export {ProductoForm} from './producto-form';
