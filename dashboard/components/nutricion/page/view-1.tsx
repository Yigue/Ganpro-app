import { BarChartView } from '@/components/charts/charts';
import { SuplementoForm } from '@/components/nutricion/nutricion-forms';
import { Badge } from '@/components/ui/badge';
import { Section } from '@/components/ui/section';
import { Table,TBody,TD,TH,THead,TR } from '@/components/ui/table';
import { fmtARS,fmtNum,fmtPct } from '@/lib/calc/format';
import type { PageData } from '@/lib/db/page-nutricion';
export function NutricionView1({data}:{data:PageData}){const {suplementos,potrerosById,entregas,bajos,cadena,editable}=data;return <><div className="grid gap-6 lg:grid-cols-2">
        <Section title="Cadena forrajera" description="Oferta aprovechable vs demanda del rodeo (t MS/mes). Estimada con curvas de referencia de Entre Ríos.">
          <BarChartView data={cadena} xKey="label" series={[{ key: 'Oferta' }, { key: 'Demanda' }]} height={260} />
        </Section>
        <Section title="Entregas por potrero (30 días)" flush>
          <Table>
            <THead>
              <tr>
                <TH>Potrero</TH>
                <TH className="text-right">Kg tal cual</TH>
                <TH className="text-right">Kg MS</TH>
                <TH className="text-right">Costo</TH>
              </tr>
            </THead>
            <TBody>
              {entregas.map((e) => (
                <TR key={e.potreroId}>
                  <TD className="font-medium">{potrerosById.get(e.potreroId)?.nombre ?? '?'}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(e.kg)}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(e.kgMS)}</TD>
                  <TD className="text-right tabular-nums">{fmtARS(e.costo)}</TD>
                </TR>
              ))}
              {!entregas.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    Sin entregas en los últimos 30 días
                  </td>
                </tr>
              )}
            </TBody>
          </Table>
        </Section>
      </div>
<Section title="Insumos" flush>
        <Table>
          <THead>
            <tr>
              <TH>Insumo</TH>
              <TH>Tipo</TH>
              <TH className="text-right">MS</TH>
              <TH className="text-right">PB</TH>
              <TH className="text-right">$/t</TH>
              <TH className="text-right">Stock</TH>
              <TH className="text-right">Mínimo</TH>
              <TH>Proveedor</TH>
              {editable && <TH />}
            </tr>
          </THead>
          <TBody>
            {suplementos.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">{s.nombre}</TD>
                <TD>{s.tipo}</TD>
                <TD className="text-right tabular-nums">{fmtPct(s.materia_seca_pct, 0)}</TD>
                <TD className="text-right tabular-nums">{fmtPct(s.proteina_bruta_pct, 0)}</TD>
                <TD className="text-right tabular-nums">{fmtARS(s.precio_por_tonelada)}</TD>
                <TD className="text-right tabular-nums">
                  {bajos.includes(s) ? <Badge tone="warning">{fmtNum(s.stock_kg)} kg</Badge> : `${fmtNum(s.stock_kg)} kg`}
                </TD>
                <TD className="text-right tabular-nums">{s.stock_minimo_kg != null ? `${fmtNum(s.stock_minimo_kg)} kg` : '—'}</TD>
                <TD className="text-muted-foreground">{s.proveedor ?? '—'}</TD>
                {editable && (
                  <TD>
                    <SuplementoForm suplemento={s} />
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      </Section></>;}
