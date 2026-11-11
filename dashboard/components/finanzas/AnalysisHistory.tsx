import {Section} from '@/components/ui/section';
import {Table,THead,TBody,TH,TR,TD} from '@/components/ui/table';
import {Badge} from '@/components/ui/badge';
import {fmtDate} from '@/lib/calc/format';
import {cn} from '@/lib/utils';
import type {FinancialAnalysis} from '@/lib/db/financial-analysis';
export function AnalysisHistory({data}:{data:FinancialAnalysis}){const {fmt,movs}=data;return <><Section title="Últimos movimientos" flush>
        <Table>
          <THead>
            <tr>
              <TH>Fecha</TH>
              <TH>Tipo</TH>
              <TH>Categoría</TH>
              <TH>Descripción</TH>
              <TH className="text-right">Monto</TH>
            </tr>
          </THead>
          <TBody>
            {movs.slice(0, 20).map((m) => (
              <TR key={m.id}>
                <TD>{fmtDate(m.fecha)}</TD>
                <TD>
                  <Badge tone={m.tipo === 'INGRESO' ? 'success' : 'neutral'}>{m.tipo}</Badge>
                </TD>
                <TD>{m.categoria}</TD>
                <TD className="text-muted-foreground">{m.descripcion ?? '—'}</TD>
                <TD className={cn('text-right tabular-nums', m.tipo === 'INGRESO' ? 'text-success' : undefined)}>{fmt(m.monto)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Section>
    </>;}
