'use client';

import { Plus } from 'lucide-react';
import { cambiarRol, cargarPrecios, guardarCategorias, guardarEstablecimiento, guardarLote, guardarPotrero } from '@/app/(dashboard)/config/actions';
import { Button } from '@/components/ui/button';
import { ActionMessage, FormDialog, useAccion } from '@/components/ui/form-dialog';
import { Field, Input, Select } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import type { CategoriaConfig, Establecimiento, Lote, Perfil, Potrero } from '@/lib/db/types';

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

export function PotreroForm({ potrero }: { potrero?: Potrero }) {
  return (
    <FormDialog
      title={potrero ? `Editar ${potrero.nombre}` : 'Nuevo potrero'}
      trigger={potrero ? 'Editar' : <><Plus className="h-4 w-4" /> Potrero</>}
      triggerVariant={potrero ? 'ghost' : 'outline'}
      action={guardarPotrero}
    >
      {potrero && <input type="hidden" name="id" value={potrero.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre">
          <Input name="nombre" defaultValue={potrero?.nombre} required />
        </Field>
        <Field label="Hectáreas">
          <Input name="hectareas" type="number" min="0" step="0.1" defaultValue={potrero?.hectareas ?? ''} />
        </Field>
        <Field label="Recurso forrajero">
          <Input name="recurso_forrajero" defaultValue={potrero?.recurso_forrajero ?? ''} placeholder="Campo natural, pastura, verdeo…" />
        </Field>
        <Field label="Capacidad (EV)">
          <Input name="capacidad_ev" type="number" min="0" defaultValue={potrero?.capacidad_ev ?? ''} />
        </Field>
      </div>
    </FormDialog>
  );
}

export function LoteForm({ lote }: { lote?: Lote }) {
  return (
    <FormDialog
      title={lote ? `Editar ${lote.nombre}` : 'Nuevo lote'}
      trigger={lote ? 'Editar' : <><Plus className="h-4 w-4" /> Lote</>}
      triggerVariant={lote ? 'ghost' : 'outline'}
      action={guardarLote}
    >
      {lote && <input type="hidden" name="id" value={lote.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre">
          <Input name="nombre" defaultValue={lote?.nombre} required />
        </Field>
        <Field label="Ubicación">
          <Input name="ubicacion" defaultValue={lote?.ubicacion ?? ''} />
        </Field>
        <Field label="Hectáreas">
          <Input name="hectareas" type="number" min="0" step="0.1" defaultValue={lote?.hectareas ?? ''} />
        </Field>
        <Field label="Alquiler (ARS/ha/año)">
          <Input name="costo_alquiler_ha" type="number" min="0" defaultValue={lote?.costo_alquiler_ha ?? ''} />
        </Field>
      </div>
    </FormDialog>
  );
}

function RolSelect({ perfil, esYo }: { perfil: Perfil; esYo: boolean }) {
  const [, action, pending] = useAccion(cambiarRol);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={perfil.id} />
      <select
        name="rol"
        defaultValue={perfil.rol}
        disabled={pending || esYo}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border bg-card px-2 py-1 text-sm"
        aria-label="Rol"
      >
        <option value="admin">Administración</option>
        <option value="campo">Encargado de campo</option>
        <option value="asesor">Asesor (lectura)</option>
      </select>
    </form>
  );
}

export function UsuariosTable({ perfiles, yo, editable }: { perfiles: Perfil[]; yo: string; editable: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Nombre</TH>
          <TH>Email</TH>
          <TH>Rol</TH>
        </tr>
      </THead>
      <TBody>
        {perfiles.map((p) => (
          <TR key={p.id}>
            <TD className="font-medium">{p.nombre ?? '—'}</TD>
            <TD className="text-muted-foreground">{p.email}</TD>
            <TD>{editable ? <RolSelect perfil={p} esYo={p.id === yo} /> : p.rol}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function CategoriasForm({ categorias, editable }: { categorias: CategoriaConfig[]; editable: boolean }) {
  const [state, action, pending] = useAccion(guardarCategorias);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Table>
        <THead>
          <tr>
            <TH>Categoría</TH>
            <TH>EV</TH>
            <TH>Pasa a</TH>
            <TH>A los (meses)</TH>
            <TH>Sal (g/día)</TH>
          </tr>
        </THead>
        <TBody>
          {categorias.map((c) => (
            <TR key={c.categoria}>
              <TD className="font-medium">{c.categoria}</TD>
              <TD>
                <Input name={`ev__${c.categoria}`} type="number" step="0.05" min="0.05" defaultValue={c.ev} className="w-20" disabled={!editable} />
              </TD>
              <TD>
                <Select name={`recat__${c.categoria}`} defaultValue={c.recategoriza_a ?? ''} className="w-36" disabled={!editable}>
                  <option value="">—</option>
                  {categorias
                    .filter((o) => o.categoria !== c.categoria)
                    .map((o) => (
                      <option key={o.categoria}>{o.categoria}</option>
                    ))}
                </Select>
              </TD>
              <TD>
                <Input name={`edad__${c.categoria}`} type="number" min="1" defaultValue={c.edad_recategorizacion_meses ?? ''} className="w-20" disabled={!editable} />
              </TD>
              <TD>
                <Input name={`sal__${c.categoria}`} type="number" min="0" defaultValue={c.consumo_sal_g_dia ?? ''} className="w-20" disabled={!editable} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {editable && (
        <div className="flex items-center gap-3 px-5">
          <Button type="submit" size="sm" disabled={pending}>
            Guardar categorías
          </Button>
          <ActionMessage state={state} />
        </div>
      )}
    </form>
  );
}

const PRECIOS: [string, string][] = [
  ['novillo_kg', 'Novillo / novillito'],
  ['ternero_kg', 'Ternero'],
  ['ternera_kg', 'Ternera'],
  ['vaquillona_kg', 'Vaquillona'],
  ['vaca_kg', 'Vaca'],
  ['vaca_descarte_kg', 'Vaca descarte'],
  ['toro_kg', 'Toro'],
  ['dolar_oficial', 'Dólar oficial'],
  ['dolar_mep', 'Dólar MEP'],
];

export function PreciosForm({ ultimos }: { ultimos: Record<string, number | null> }) {
  return (
    <FormDialog
      title="Cargar precios de referencia"
      description="ARS por kg vivo y cotización del dólar del día."
      trigger={<><Plus className="h-4 w-4" /> Precios del día</>}
      action={cargarPrecios}
    >
      <Field label="Fecha">
        <Input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PRECIOS.map(([k, label]) => (
          <Field key={k} label={label}>
            <Input name={k} type="number" min="0" step="0.01" defaultValue={ultimos[k] ?? ''} />
          </Field>
        ))}
      </div>
    </FormDialog>
  );
}
