import { Badge } from '@/components/ui/badge';
import { Section } from '@/components/ui/section';
import { Table,TBody,TD,TH,THead,TR } from '@/components/ui/table';
import { fmtDate,fmtPct } from '@/lib/calc/format';
import { relacionToroVientre } from '@/lib/calc/reproduccion';
import type { PageData } from '@/lib/db/page-reproduccion';
export function ReproduccionView1({data}:{data:PageData}){const {servicios,revisaciones,animalsById,loteNombre}=data;return <><div className="grid gap-6 lg:grid-cols-2">
        <Section title="Servicios" flush>
          <Table>
            <THead>
              <tr>
                <TH>Temporada</TH>
                <TH>Lote</TH>
                <TH>Toros</TH>
                <TH className="text-right">Vientres</TH>
                <TH className="text-right">Toro/vientre</TH>
                <TH>Período</TH>
              </tr>
            </THead>
            <TBody>
              {servicios.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium">{s.temporada}</TD>
                  <TD>{loteNombre(s.lote_id)}</TD>
                  <TD>{s.toros.map((t) => animalsById.get(t)?.id_caravana ?? t).join(', ')}</TD>
                  <TD className="text-right tabular-nums">{s.vientres ?? '—'}</TD>
                  <TD className="text-right tabular-nums">{fmtPct(relacionToroVientre(s))}</TD>
                  <TD>
                    {fmtDate(s.fecha_entrada)} – {s.fecha_salida ? fmtDate(s.fecha_salida) : 'en curso'}
                  </TD>
                </TR>
              ))}
              {!servicios.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Sin servicios cargados
                  </td>
                </tr>
              )}
            </TBody>
          </Table>
        </Section>
        <Section title="Revisación de toros" flush>
          <Table>
            <THead>
              <tr>
                <TH>Toro</TH>
                <TH>Fecha</TH>
                <TH>Resultado</TH>
                <TH className="text-right">CE</TH>
                <TH>Sanitaria</TH>
              </tr>
            </THead>
            <TBody>
              {revisaciones.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{animalsById.get(r.animal_id)?.id_caravana ?? r.animal_id}</TD>
                  <TD>{fmtDate(r.fecha)}</TD>
                  <TD>
                    <Badge tone={r.apto ? 'success' : 'danger'}>{r.apto ? 'Apto' : 'No apto'}</Badge>
                  </TD>
                  <TD className="text-right tabular-nums">{r.circunferencia_escrotal_cm ? `${r.circunferencia_escrotal_cm} cm` : '—'}</TD>
                  <TD className="text-muted-foreground">{r.sanitaria ?? '—'}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
      </div></>;}
