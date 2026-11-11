import { Badge } from '@/components/ui/badge';
import { Section } from '@/components/ui/section';
import { Table,TBody,TD,TH,THead,TR } from '@/components/ui/table';
import { fmtARS,fmtNum } from '@/lib/calc/format';
import type { PageData } from '@/lib/db/page-sanidad';
export function SanidadView2({data}:{data:PageData}){const {catalogo}=data;return <><Section title="Catálogo de productos" flush>
        <Table>
          <THead>
            <tr>
              <TH>Producto</TH>
              <TH>Tipo</TH>
              <TH className="text-right">Retiro</TH>
              <TH className="text-right">Costo por dosis</TH>
              <TH>Notas</TH>
            </tr>
          </THead>
          <TBody>
            {catalogo.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.nombre}</TD>
                <TD>
                  <Badge tone={c.tipo === 'VACUNA' ? 'success' : c.tipo === 'IATF' ? 'primary' : 'info'}>{c.tipo}</Badge>
                </TD>
                <TD className="text-right tabular-nums">{c.dias_carencia ? `${fmtNum(c.dias_carencia)} días` : '—'}</TD>
                <TD className="text-right tabular-nums">{fmtARS(c.costo_unitario)}</TD>
                <TD className="text-muted-foreground">{c.notas ?? ''}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Section></>;}
