import {Section} from '@/components/ui/section';
import {Table,THead,TBody,TH,TR,TD} from '@/components/ui/table';
import {cn} from '@/lib/utils';
import {mesLabel} from '@/lib/calc/fechas';
import type {FinancialAnalysis} from '@/lib/db/financial-analysis';
export function AnalysisMargins({data}:{data:FinancialAnalysis}){const {fmt,actual,anterior,filasMB,flujo,treasury}=data;return <><div className="grid gap-6 lg:grid-cols-2">
        <Section title="Resultado parcial por ejercicio" description="Períodos del ejercicio configurado. La diferencia de inventario se completa con cortes." flush>
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
        <Section title="Tesorería comprometida" description={`Saldo al corte: ${fmt(Number(treasury.saldo))}. Incluye cobros y pagos de documentos conciliados; los vencidos se incorporan al primer mes. No supone ventas ni gastos futuros sin registrar. Revisá en Finanzas los registros anteriores pendientes de conciliación.`} flush>
          <Table>
            <THead>
              <tr>
                <TH>Mes</TH>
                <TH className="text-right">Cobros</TH>
                <TH className="text-right">Pagos</TH>
                <TH className="text-right">Neto</TH>
                <TH className="text-right">Saldo proyectado</TH>
              </tr>
            </THead>
            <TBody>
              {flujo.map((f) => (
                <TR key={f.mes}>
                  <TD className="font-medium">{mesLabel(f.mes)}</TD>
                  <TD className="text-right tabular-nums">{fmt(Number(f.cobros))}</TD>
                  <TD className="text-right tabular-nums">{fmt(Number(f.gastos))}</TD>
                  <TD className={cn('text-right tabular-nums', Number(f.neto) < 0 && 'text-danger')}>{fmt(Number(f.neto))}</TD>
                  <TD className={cn('text-right font-medium tabular-nums', Number(f.acumulado) < 0 && 'text-danger')}>{fmt(Number(f.acumulado))}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
      </div>
      </>;}
