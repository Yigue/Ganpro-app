'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { crearMovimientoFinanciero, marcarCobrado } from '@/app/(dashboard)/finanzas/actions';
import { Button } from '@/components/ui/button';
import { FormDialog, useAccion } from '@/components/ui/form-dialog';
import { Field, Input, Select } from '@/components/ui/input';
import { CATEGORIAS_GASTO, CATEGORIAS_INGRESO } from '@/lib/calc/finanzas';
import type { Lote } from '@/lib/db/types';

export function MovimientoFinancieroForm({ lotes }: { lotes: Lote[] }) {
  const [tipo, setTipo] = useState<'GASTO' | 'INGRESO'>('GASTO');
  const categorias = tipo === 'GASTO' ? CATEGORIAS_GASTO : CATEGORIAS_INGRESO;
  return (
    <FormDialog
      title="Nuevo movimiento"
      description="Las ventas de hacienda con DTE se cargan desde Movimientos para que bajen el stock."
      trigger={
        <>
          <Plus className="h-4 w-4" /> Gasto / ingreso
        </>
      }
      action={crearMovimientoFinanciero}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo">
          <Select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as 'GASTO' | 'INGRESO')}>
            <option value="GASTO">Gasto</option>
            <option value="INGRESO">Ingreso</option>
          </Select>
        </Field>
        <Field label="Categoría">
          <Select name="categoria">
            {categorias.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Monto (ARS)">
          <Input name="monto" type="number" min="0" step="1" required />
        </Field>
        <Field label="Fecha">
          <Input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </Field>
        <Field label="Lote">
          <Select name="lote_id">
            <option value="">General</option>
            {lotes.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Comprobante">
          <Input name="comprobante" />
        </Field>
        <Field label="Descripción" className="sm:col-span-2">
          <Input name="descripcion" />
        </Field>
        {tipo === 'INGRESO' && (
          <Field label="Fecha de cobro (si es a plazo)">
            <Input name="fecha_cobro" type="date" />
          </Field>
        )}
      </div>
    </FormDialog>
  );
}

export function MarcarCobrado({ id }: { id: string }) {
  const [, action, pending] = useAccion(marcarCobrado);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button size="sm" variant="outline" disabled={pending}>
        Cobrado
      </Button>
    </form>
  );
}
