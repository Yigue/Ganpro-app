'use client';

import {CommerceFields,DteFields} from './commerce-fields';
import type {LedgerSnapshot} from '@/lib/db/ledger-types';
import type {EscenarioLinea} from '@/lib/db/types';
import {businessToday} from '@/lib/calc/business-date';
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

export function MovimientoForm({ lotes, potreros, categorias,cuentas=[],linea }: { lotes: Lote[]; potreros: Potrero[]; categorias: CategoriaConfig[];cuentas?:LedgerSnapshot['cuentas'];linea?:EscenarioLinea|null }) {
  const [tipo, setTipo] = useState<Tipo>(linea?.tipo??'VENTA');
  const hoy = businessToday();
  const ingresa = tipo === 'COMPRA' || tipo === 'NACIMIENTO';
  const conDte = tipo !== 'TRASLADO' && tipo !== 'NACIMIENTO';
  const conPlata = tipo === 'VENTA' || tipo === 'COMPRA';

  return (
    <FormDialog
      title="Registrar movimiento"
      description={linea?`Ejecución del plan: ${linea.cabezas} ${linea.categoria}. Stock y comprobante se registran juntos.`:"Las ventas se bloquean durante el retiro. Sin pago inmediato se registra una obligación pendiente."}
      trigger={
        <>
          <Plus className="h-4 w-4" /> Registrar movimiento
        </>
      }
      action={registrarMovimiento}
    >
      {linea&&<input type="hidden" name="escenario_linea_id" value={linea.id}/>}
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
      {conPlata && <CommerceFields sale={tipo==='VENTA'} cuentas={cuentas} monto={linea?.monto} kg={linea?.kg!=null?linea.kg*linea.cabezas:undefined}/>}
      {conDte && <DteFields sale={tipo==='VENTA'}/>}
      <Field label={tipo === 'MUERTE' ? 'Causa' : 'Notas'}>
        <Input name="notas" />
      </Field>
    </FormDialog>
  );
}
