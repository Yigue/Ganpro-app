import {Section} from '@/components/ui/section';
import {Table,THead,TBody,TH,TR,TD} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {fmtNum,fmtARS,fmtDate} from '@/lib/calc/format';
import {MarcarCobrado} from './finanzas-forms';
import type {FinancialAnalysis} from '@/lib/db/financial-analysis';
export function AnalysisDetails({data}:{data:FinancialAnalysis}){const {fmt,valuacion,valorRodeo,pendientes,editable,ahora}=data;return <><div className="grid gap-6 lg:grid-cols-2">
        <Section title="Valuación estimada del rodeo" description="Cabezas × peso promedio × precio por kg de la categoría" flush>
          <Table>
            <THead>
              <tr>
                <TH>Categoría</TH>
                <TH className="text-right">Cabezas</TH>
                <TH className="text-right">Peso prom.</TH>
                <TH className="text-right">$/kg</TH>
                <TH className="text-right">Valor</TH>
              </tr>
            </THead>
            <TBody>
              {valuacion.map((v) => (
                <TR key={v.categoria}>
                  <TD className="font-medium">{v.categoria}</TD>
                  <TD className="text-right tabular-nums">{v.cabezas}</TD>
                  <TD className="text-right tabular-nums">{v.pesoPromedio ? `${fmtNum(v.pesoPromedio)} kg` : '—'}</TD>
                  <TD className="text-right tabular-nums">{v.precioKg ? fmtARS(v.precioKg) : <Badge tone="warning">Sin precio</Badge>}</TD>
                  <TD className="text-right tabular-nums">{fmt(v.valor)}</TD>
                </TR>
              ))}
              <TR className="bg-muted/40 font-semibold">
                <TD>Total</TD>
                <TD className="text-right tabular-nums">{valuacion.reduce((a, v) => a + v.cabezas, 0)}</TD>
                <TD />
                <TD />
                <TD className="text-right tabular-nums">{fmt(valorRodeo)}</TD>
              </TR>
            </TBody>
          </Table>
        </Section>
        <Section title="Cuentas por cobrar" description="Ventas a plazo pendientes" flush>
          {pendientes.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">No hay cobros pendientes.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Vence</TH>
                  <TH>Detalle</TH>
                  <TH className="text-right">Monto</TH>
                  {editable && <TH />}
                </tr>
              </THead>
              <TBody>
                {pendientes.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <Badge tone={(p.fecha_cobro ?? p.fecha) < ahora ? 'danger' : 'warning'}>{fmtDate(p.fecha_cobro ?? p.fecha)}</Badge>
                    </TD>
                    <TD>{p.descripcion ?? p.categoria}</TD>
                    <TD className="text-right tabular-nums">{fmt(p.monto)}</TD>
                    {editable && (
                      <TD className="text-right">
                        <MarcarCobrado id={p.id} />
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Section>
      </div>
      </>;}
