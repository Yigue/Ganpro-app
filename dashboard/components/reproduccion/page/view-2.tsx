import { CompletarEtapa } from '@/components/reproduccion/repro-forms';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Section } from '@/components/ui/section';
import { Table,TBody,TD,TH,THead,TR } from '@/components/ui/table';
import { DAY_MS } from '@/lib/calc/fechas';
import { fmtDate,fmtNum } from '@/lib/calc/format';
import type { PageData } from '@/lib/db/page-reproduccion';
export function ReproduccionView2({data}:{data:PageData}){const {protocolos,etapas,ahora,loteNombre,ccLotes,editable}=data;return <><div className="grid gap-6 lg:grid-cols-3">
        <Section title="Protocolos IATF" className="lg:col-span-2">
          {protocolos.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin protocolos. Se cargan desde la app.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {protocolos.map((p) => {
                const pasos = etapas.filter((e) => e.protocolo_id === p.id);
                const hechas = pasos.filter((e) => e.completada).length;
                return (
                  <div key={p.id} className="rounded-md border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{p.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {loteNombre(p.lote_id)} · inicio {fmtDate(p.fecha_inicio)}
                        </p>
                      </div>
                      <Badge tone={p.estado === 'ACTIVO' ? 'primary' : p.estado === 'COMPLETADO' ? 'success' : 'neutral'}>{p.estado}</Badge>
                    </div>
                    <div className="mt-3">
                      <Progress value={pasos.length ? (hechas / pasos.length) * 100 : 0} />
                    </div>
                    <ul className="mt-3 flex flex-col gap-1">
                      {pasos.map((e) => {
                        const fecha = p.fecha_inicio + e.dias_desde_inicio * DAY_MS;
                        return (
                          <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className={e.completada ? 'text-muted-foreground line-through' : fecha < ahora ? 'text-danger' : undefined}>
                              {e.nombre} · {fmtDate(fecha)}
                            </span>
                            {!e.completada && editable && <CompletarEtapa id={e.id} />}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
        <Section title="Condición corporal por lote" flush>
          <Table>
            <THead>
              <tr>
                <TH>Lote</TH>
                <TH className="text-right">CC prom.</TH>
                <TH className="text-right">Evaluaciones</TH>
              </tr>
            </THead>
            <TBody>
              {ccLotes.map((c) => (
                <TR key={c.lote}>
                  <TD className="font-medium">{c.lote}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(c.cc, 2)}</TD>
                  <TD className="text-right tabular-nums">{c.n}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
      </div></>;}
