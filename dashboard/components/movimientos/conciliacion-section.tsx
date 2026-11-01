import { Upload } from 'lucide-react';
import { cargarActaSigsa } from '@/app/(dashboard)/movimientos/actions';
import { Badge } from '@/components/ui/badge';
import { FormDialog } from '@/components/ui/form-dialog';
import { Field, Input, Select } from '@/components/ui/input';
import { Section } from '@/components/ui/section';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { fmtDate } from '@/lib/calc/format';
import type { ConciliacionFila } from '@/lib/calc/sigsa';
import { cn } from '@/lib/utils';

export function ConciliacionSection({
  filas,
  fecha,
  acta,
  categorias,
  puedeEditar,
}: {
  filas: ConciliacionFila[];
  fecha: number | null;
  acta: string | null;
  categorias: string[];
  puedeEditar: boolean;
}) {
  const totalPropio = filas.reduce((a, f) => a + f.propio, 0);
  const totalSigsa = filas.reduce((a, f) => a + f.sigsa, 0);
  const ok = filas.every((f) => f.diferencia === 0);
  return (
    <Section
      title="Conciliación con SIGSA"
      description={fecha ? `Stock propio contra el acta del ${fmtDate(fecha)}${acta ? ` (${acta})` : ''}` : 'Cargá la última acta o el histórico de SIGSA para comparar'}
      actions={
        puedeEditar && (
          <FormDialog
            title="Cargar stock SIGSA"
            description="Copiá las cabezas por categoría del acta de vacunación o del histórico de SIGSA."
            trigger={
              <>
                <Upload className="h-4 w-4" /> Cargar acta
              </>
            }
            triggerVariant="outline"
            action={cargarActaSigsa}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Fecha">
                <Input name="fecha" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
              </Field>
              <Field label="N° de acta">
                <Input name="acta_numero" />
              </Field>
              <Field label="Fuente">
                <Select name="fuente" defaultValue="ACTA">
                  <option value="ACTA">Acta de vacunación</option>
                  <option value="HISTORICO">Histórico SIGSA</option>
                  <option value="CSV">CSV</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {categorias.map((c) => (
                <Field key={c} label={c}>
                  <Input name={`cab_${c}`} type="number" min="0" />
                </Field>
              ))}
            </div>
          </FormDialog>
        )
      }
      flush
    >
      {filas.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Categoría</TH>
                <TH className="text-right">Propio</TH>
                <TH className="text-right">SIGSA</TH>
                <TH className="text-right">Diferencia</TH>
              </tr>
            </THead>
            <TBody>
              {filas.map((f) => (
                <TR key={f.categoria} className={cn(f.diferencia !== 0 && 'bg-danger/5')}>
                  <TD className="font-medium">{f.categoria}</TD>
                  <TD className="text-right tabular-nums">{f.propio}</TD>
                  <TD className="text-right tabular-nums">{fecha ? f.sigsa : '—'}</TD>
                  <TD className={cn('text-right font-medium tabular-nums', f.diferencia > 0 && 'text-warning', f.diferencia < 0 && 'text-danger')}>
                    {fecha ? (f.diferencia > 0 ? `+${f.diferencia}` : f.diferencia) : '—'}
                  </TD>
                </TR>
              ))}
              <TR className="font-semibold">
                <TD>Total</TD>
                <TD className="text-right tabular-nums">{totalPropio}</TD>
                <TD className="text-right tabular-nums">{fecha ? totalSigsa : '—'}</TD>
                <TD className="text-right tabular-nums">{fecha ? totalPropio - totalSigsa : '—'}</TD>
              </TR>
            </TBody>
          </Table>
          {fecha && (
            <div className="px-5 pt-3">
              <Badge tone={ok ? 'success' : 'danger'}>{ok ? 'Conciliado' : 'Hay diferencias: revisá bajas, nacimientos y recategorizaciones no declaradas'}</Badge>
            </div>
          )}
        </>
      )}
    </Section>
  );
}
