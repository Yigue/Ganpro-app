'use client';
import {Plus} from 'lucide-react';
import {crearProducto} from '@/app/(dashboard)/sanidad/actions';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input,Select} from '@/components/ui/input';
export function ProductoForm() {
  return (
    <FormDialog
      title="Nuevo producto sanitario"
      trigger={
        <>
          <Plus className="h-4 w-4" /> Producto
        </>
      }
      triggerVariant="outline"
      action={crearProducto}
    >
      <Field label="Nombre">
        <Input name="nombre" required />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Tipo">
          <Select name="tipo">
            <option value="VACUNA">Vacuna</option>
            <option value="TRATAMIENTO">Tratamiento</option>
            <option value="IATF">IATF</option>
          </Select>
        </Field>
        <Field label="Días de retiro">
          <Input name="dias_carencia" type="number" min="0" />
        </Field>
        <Field label="Costo por dosis (ARS)">
          <Input name="costo_unitario" type="number" min="0" />
        </Field>
      </div>
      <Field label="Notas">
        <Input name="notas" />
      </Field>
    </FormDialog>
  );
}
