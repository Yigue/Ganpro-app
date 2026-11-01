'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { registrarMovimiento } from '@/app/(dashboard)/movimientos/actions';
import { FormDialog } from '@/components/ui/form-dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import type { CategoriaConfig, Lote, Potrero } from '@/lib/db/types';

const TIPOS = {
  VENTA: 'Venta',
  COMPRA: 'Compra',
  MUERTE: 'Muerte',
  NACIMIENTO: 'Nacimiento',
  TRASLADO: 'Traslado entre potreros / lotes',
} as const;

type Tipo = keyof typeof TIPOS;

export function MovimientoForm({ lotes, potreros, categorias }: { lotes: Lote[]; potreros: Potrero[]; categorias: CategoriaConfig[] }) {
  const [tipo, setTipo] = useState<Tipo>('VENTA');
  const hoy = new Date().toISOString().slice(0, 10);
  const ingresa = tipo === 'COMPRA' || tipo === 'NACIMIENTO';
  const conDte = tipo !== 'TRASLADO' && tipo !== 'NACIMIENTO';
  const conPlata = tipo === 'VENTA' || tipo === 'COMPRA';

  return (
    <FormDialog
      title="Registrar movimiento"
      description="Las ventas se bloquean si algún animal está en período de retiro."
      trigger={
        <>
          <Plus className="h-4 w-4" /> Registrar movimiento
        </>
      }
      action={registrarMovimiento}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo">
          <Select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
            {Object.entries(TIPOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha">
          <Input name="fecha" type="date" defaultValue={hoy} required />
        </Field>
      </div>
      <Field label={ingresa ? 'Caravanas de los animales que ingresan' : 'Caravanas'}>
        <Textarea name="caravanas" rows={3} placeholder="0012 0013 0014 (separadas por espacio, coma o renglón)" required />
      </Field>
      {ingresa && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sexo">
            <Select name="sexo" defaultValue="H">
              <option value="H">Hembra</option>
              <option value="M">Macho</option>
            </Select>
          </Field>
          <Field label="Categoría">
            <Select name="categoria" defaultValue={tipo === 'NACIMIENTO' ? '' : 'Vaca'}>
              {tipo === 'NACIMIENTO' && <option value="">Ternero / Ternera según sexo</option>}
              {categorias.map((c) => (
                <option key={c.categoria}>{c.categoria}</option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      {(ingresa || tipo === 'TRASLADO') && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Lote destino">
            <Select name="lote_destino_id">
              <option value="">{tipo === 'TRASLADO' ? 'Sin cambio' : 'Sin lote'}</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Potrero destino">
            <Select name="potrero_destino_id">
              <option value="">{tipo === 'TRASLADO' ? 'Sin cambio' : 'Sin potrero'}</option>
              {potreros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      {conPlata && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kg totales">
            <Input name="kg" type="number" min="0" step="1" />
          </Field>
          <Field label="Monto total (ARS)">
            <Input name="monto" type="number" min="0" step="1" />
          </Field>
        </div>
      )}
      {conDte && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="N° de DTE">
            <Input name="dte_numero" placeholder="07-2026-000000" />
          </Field>
          {tipo === 'VENTA' && (
            <Field label="RENSPA destino">
              <Input name="renspa_destino" placeholder="00.000.0.00000/00" />
            </Field>
          )}
        </div>
      )}
      {tipo === 'VENTA' && (
        <Field label="Fecha de cobro (si es a plazo)">
          <Input name="fecha_cobro" type="date" />
        </Field>
      )}
      <Field label={tipo === 'MUERTE' ? 'Causa' : 'Notas'}>
        <Input name="notas" />
      </Field>
    </FormDialog>
  );
}
