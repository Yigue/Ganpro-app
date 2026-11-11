'use client';
import {businessToday} from '@/lib/calc/business-date';


import { Package, Plus, Truck } from 'lucide-react';
import { crearRacion, guardarSuplemento, registrarEntrega } from '@/app/(dashboard)/nutricion/actions';
import { FormDialog } from '@/components/ui/form-dialog';
import { Field, Input, Select } from '@/components/ui/input';
import type { Lote, Potrero, Racion, Suplemento } from '@/lib/db/types';

export function EntregaForm({ potreros, raciones, lotes }: { potreros: Potrero[]; raciones: Racion[]; lotes:Lote[] }) {
  return (
    <FormDialog
      title="Registrar entrega de alimento"
      trigger={
        <>
          <Truck className="h-4 w-4" /> Entrega
        </>
      }
      action={registrarEntrega}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Potrero">
          <Select name="potrero_id" required>
            {potreros.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lote ganadero"><Select name="lote_id" required>{lotes.map(l=><option key={l.id} value={l.id}>{l.nombre}</option>)}</Select></Field>
        <Field label="Ración">
          <Select name="racion_id" required>
            {raciones.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cantidad (kg tal cual)">
          <Input name="cantidad_kg" type="number" min="0" step="1" required />
        </Field>
        <Field label="Fecha">
          <Input name="fecha" type="date" defaultValue={businessToday()} required />
        </Field>
      </div>
      <p className="text-xs">Se descuentan todos los ingredientes y se conserva el costo. Incorporá primero sus saldos en Gestión → Insumos.</p>
    </FormDialog>
  );
}

export function SuplementoForm({ suplemento }: { suplemento?: Suplemento }) {
  return (
    <FormDialog
      title={suplemento ? `Editar ${suplemento.nombre}` : 'Nuevo insumo'}
      trigger={
        suplemento ? (
          'Editar'
        ) : (
          <>
            <Package className="h-4 w-4" /> Insumo
          </>
        )
      }
      triggerVariant={suplemento ? 'ghost' : 'outline'}
      action={guardarSuplemento}
    >
      {suplemento && <input type="hidden" name="id" value={suplemento.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre">
          <Input name="nombre" defaultValue={suplemento?.nombre} required />
        </Field>
        <Field label="Tipo">
          <Select name="tipo" defaultValue={suplemento?.tipo ?? 'OTRO'}>
            {['MAIZ', 'SILO', 'HENO', 'PELLET', 'UREA', 'OTRO'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Materia seca (%)">
          <Input name="materia_seca_pct" type="number" min="0" max="100" defaultValue={suplemento?.materia_seca_pct ?? 90} required />
        </Field>
        <Field label="Proteína bruta (%)">
          <Input name="proteina_bruta_pct" type="number" min="0" defaultValue={suplemento?.proteina_bruta_pct ?? ''} />
        </Field>
        <Field label="Precio por tonelada (ARS)">
          <Input name="precio_por_tonelada" type="number" min="0" defaultValue={suplemento?.precio_por_tonelada ?? ''} />
        </Field>
        <Field label="Proveedor">
          <Input name="proveedor" defaultValue={suplemento?.proveedor ?? ''} />
        </Field>
        <Field label="Stock (kg)">
          <Input name="stock_kg" type="number" min="0" defaultValue={suplemento?.stock_kg ?? ''} />
        </Field>
        <Field label="Stock mínimo (kg)">
          <Input name="stock_minimo_kg" type="number" min="0" defaultValue={suplemento?.stock_minimo_kg ?? ''} />
        </Field>
      </div>
    </FormDialog>
  );
}

export function RacionForm() {
  return (
    <FormDialog
      title="Nueva ración o sal mineral"
      trigger={
        <>
          <Plus className="h-4 w-4" /> Ración
        </>
      }
      triggerVariant="outline"
      action={crearRacion}
    >
      <Field label="Nombre">
        <Input name="nombre" required />
      </Field>
      <Field label="Descripción">
        <Input name="descripcion" />
      </Field>
    </FormDialog>
  );
}
