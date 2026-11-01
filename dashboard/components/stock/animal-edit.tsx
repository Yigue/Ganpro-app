'use client';

import { Pencil } from 'lucide-react';
import { editarAnimal } from '@/app/(dashboard)/stock/actions';
import { FormDialog } from '@/components/ui/form-dialog';
import type { Animal, CategoriaConfig, Lote, Potrero } from '@/lib/db/types';
import { AnimalFormFields } from './animal-form-fields';

export function AnimalEdit(props: { animal: Animal; categorias: CategoriaConfig[]; lotes: Lote[]; potreros: Potrero[] }) {
  return (
    <FormDialog
      title={`Editar ${props.animal.id_caravana}`}
      description="Si cambiás lote o potrero se registra el movimiento; si cambiás el peso, una pesada."
      trigger={
        <>
          <Pencil className="h-4 w-4" /> Editar
        </>
      }
      triggerVariant="outline"
      action={editarAnimal}
    >
      <AnimalFormFields {...props} conEstado />
    </FormDialog>
  );
}
