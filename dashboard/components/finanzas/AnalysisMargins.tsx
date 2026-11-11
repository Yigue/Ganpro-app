import {Section} from '@/components/ui/section';
import {Table,THead,TBody,TH,TR,TD} from '@/components/ui/table';
import {cn} from '@/lib/utils';
import {mesLabel} from '@/lib/calc/fechas';
import type {FinancialAnalysis} from '@/lib/db/financial-analysis';
export function AnalysisMargins({data}:{data:FinancialAnalysis}){const {fmt,actual,anterior,filasMB,flujo}=data;return <><div className="grid gap-6 lg:grid-cols-2">
        <Section title="Resultado parcial por ejercicio" description="Julio a junio. La diferencia de inventario se completa al cerrar el ejercicio." flush>
          <Table>
            <THead>
              <tr>
                <TH />
                <TH className="text-right">{actual.label}</TH>
                <TH className="text-right">{anterior.label}</TH>
              </tr>
            </THead>
            <TBody>
              {filasMB.map((f) => (
                <TR key={f.label} className={cn(f.bold && 'bg-muted/40 font-semibold')}>
                  <TD>{f.label}</TD>
                  <TD className={cn('text-right tabular-nums', f.a < 0 && 'text-danger')}>{fmt(f.a)}</TD>
                  <TD className={cn('text-right tabular-nums', f.b < 0 && 'text-danger')}>{fmt(f.b)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
        <Section title="Flujo de caja proyectado" description="Cobros comprometidos menos el gasto promedio de los últimos 6 meses" flush>
          <Table>
            <THead>
              <tr>
                <TH>Mes</TH>
                <TH className="text-right">Cobros</TH>
                <TH className="text-right">Gastos</TH>
                <TH className="text-right">Neto</TH>
                <TH className="text-right">Acumulado</TH>
              </tr>
            </THead>
            <TBody>
              {flujo.map((f) => (
                <TR key={f.mes}>
                  <TD className="font-medium">{mesLabel(f.mes)}</TD>
                  <TD className="text-right tabular-nums">{fmt(f.cobros)}</TD>
                  <TD className="text-right tabular-nums">{fmt(f.gastos)}</TD>
                  <TD className={cn('text-right tabular-nums', f.neto < 0 && 'text-danger')}>{fmt(f.neto)}</TD>
                  <TD className={cn('text-right font-medium tabular-nums', f.acumulado < 0 && 'text-danger')}>{fmt(f.acumulado)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
      </div>
      </>;}
