'use client';
import { cargarPrecios,guardarCategorias } from '@/app/(dashboard)/config/actions';
import { Button } from '@/components/ui/button';
import { ActionMessage,FormDialog,useAccion } from '@/components/ui/form-dialog';
import { Field,Input,Select } from '@/components/ui/input';
import { Table,TBody,TD,TH,THead,TR } from '@/components/ui/table';
import { businessToday } from '@/lib/calc/business-date';
import type { CategoriaConfig } from '@/lib/db/types';
import { Plus } from 'lucide-react';
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
        <Input name="fecha" type="date" defaultValue={businessToday()} required />
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
