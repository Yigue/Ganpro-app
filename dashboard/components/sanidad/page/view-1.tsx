import { Badge } from '@/components/ui/badge';
import { Section } from '@/components/ui/section';
import { Table,TBody,TD,TH,THead,TR } from '@/components/ui/table';
import { fmtDate } from '@/lib/calc/format';
import type { PageData } from '@/lib/db/page-sanidad';
import Link from 'next/link';
export function SanidadView1({data}:{data:PageData}){const {logs,ahora,cat,animalsById,loteNombre,carencias}=data;return <><div className="grid gap-6 lg:grid-cols-2">
        <Section title="Aplicaciones recientes" flush>
          <Table>
            <THead>
              <tr>
                <TH>Fecha</TH>
                <TH>Producto</TH>
                <TH>Destino</TH>
                <TH>Acta</TH>
                <TH>Retiro hasta</TH>
              </tr>
            </THead>
            <TBody>
              {logs.slice(0, 15).map((l) => (
                <TR key={l.id}>
                  <TD>{fmtDate(l.fecha_aplicacion)}</TD>
                  <TD className="font-medium">{cat.get(l.operation_id)?.nombre ?? '—'}</TD>
                  <TD>{l.animal_id ? `Animal ${animalsById.get(l.animal_id)?.id_caravana ?? ''}` : loteNombre(l.lote_id)}</TD>
                  <TD className="font-mono text-xs">{l.acta_numero ?? '—'}</TD>
                  <TD>
                    {l.fecha_fin_carencia ? (
                      <Badge tone={l.fecha_fin_carencia > ahora ? 'warning' : 'neutral'}>{fmtDate(l.fecha_fin_carencia)}</Badge>
                    ) : (
                      '—'
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
        <Section title="Animales en período de retiro" description="Bloqueados para la venta hasta la fecha indicada" flush>
          {carencias.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Ningún animal en carencia.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>Caravana</TH>
                    <TH>Categoría</TH>
                    <TH>Producto</TH>
                    <TH>Hasta</TH>
                  </tr>
                </THead>
                <TBody>
                  {carencias.map((c) => (
                    <TR key={c.animal.id}>
                      <TD>
                        <Link href={`/stock/${c.animal.id}`} className="font-medium text-primary hover:underline">
                          {c.animal.id_caravana}
                        </Link>
                      </TD>
                      <TD>{c.animal.categoria}</TD>
                      <TD>{cat.get(c.operationId)?.nombre}</TD>
                      <TD>
                        <Badge tone="warning">{fmtDate(c.hasta)}</Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </Section>
      </div></>;}
