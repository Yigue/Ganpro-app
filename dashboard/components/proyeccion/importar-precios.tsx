'use client';

import { Upload } from 'lucide-react';
import { importarPrecios } from '@/app/(dashboard)/proyeccion/actions';
import { FormDialog } from '@/components/ui/form-dialog';
import { Field, Select, Textarea } from '@/components/ui/input';

export function ImportarPrecios() {
  return (
    <FormDialog
      title="Cargar precios históricos"
      description="Una fila por fecha. Primera columna: fecha. Las demás se reconocen por encabezado (novillo, ternero, ternera, vaquillona, vaca, vaca_descarte, toro, dolar_oficial, dolar_mep). Precios en $/kg vivo."
      trigger={
        <>
          <Upload className="h-4 w-4" /> Cargar CSV
        </>
      }
      triggerVariant="outline"
      action={importarPrecios}
      submitLabel="Importar"
    >
      <Field label="CSV">
        <Textarea name="csv" rows={10} required placeholder={'fecha;novillo;ternero;vaca;dolar_oficial\n01/01/2022;350;420;250;105\n01/02/2022;360;430;255;108'} />
      </Field>
      <Field label="Fuente">
        <Select name="fuente" defaultValue="MANUAL">
          <option value="MANUAL">Manual / planilla propia</option>
          <option value="API_MAG">Mercado Agroganadero (MAG)</option>
        </Select>
      </Field>
    </FormDialog>
  );
}
