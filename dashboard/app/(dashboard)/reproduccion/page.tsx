import { DonutChartView } from '@/components/charts/charts';
import { PrenezTable } from '@/components/reproduccion/prenez-table';
import { CompletarEtapa, RevisacionForm, ServicioForm } from '@/components/reproduccion/repro-forms';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader, Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { DAY_MS } from '@/lib/calc/fechas';
import { fmtDate, fmtNum, fmtPct } from '@/lib/calc/format';
import { ccPromedio, porcentaje, prenez, prenezPor, prenezPorToro, relacionToroVientre, tactos } from '@/lib/calc/reproduccion';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { byId, getAnimals, getEventos, getLotes, getMovimientosFinancieros, selectAll } from '@/lib/db/client';

export const metadata = { title: 'Reproducción' };

export default async function ReproduccionPage() {
  const [animals, eventos, lotes, servicios, protocolos, etapas, cc, revisaciones, movs, perfil] = await Promise.all([
    getAnimals(),
    getEventos(),
    getLotes(),
    selectAll('servicios', { order: 'fecha_entrada', ascending: false }),
    selectAll('protocolos_iatf', { order: 'fecha_inicio', ascending: false }),
    selectAll('etapas_protocolo', { order: 'dias_desde_inicio' }),
    selectAll('condicion_corporal'),
    selectAll('revisacion_toros', { order: 'fecha', ascending: false }),
    getMovimientosFinancieros(),
    getSessionPerfil(),
  ]);

  const ahora = Date.now();
  const animalsById = byId(animals);
  const lotesById = byId(lotes);
  const loteNombre = (id: string | null) => (id ? (lotesById.get(id)?.nombre ?? '?') : 'Sin lote');

  // Temporada actual: la del último servicio cargado. Sin servicios, últimos 12 meses.
  const ultima = servicios[0]?.temporada;
  const delaTemporada = servicios.filter((s) => s.temporada === ultima);
  const inicioTemporada = delaTemporada.length ? Math.min(...delaTemporada.map((s) => s.fecha_entrada)) : ahora - 365 * DAY_MS;
  const listaTactos = tactos(eventos, inicioTemporada);
  const general = prenez(listaTactos);
  const vientres = delaTemporada.reduce((a, s) => a + (s.vientres ?? 0), 0) || null;
  const toros = delaTemporada.reduce((a, s) => a + s.toros.length, 0);

  // CC al servicio: registros entre 60 días antes y 30 después de la entrada de toros.
  const ccServicio = cc.filter((r) => r.fecha >= inicioTemporada - 60 * DAY_MS && r.fecha <= inicioTemporada + 30 * DAY_MS);
  const ccLotes = [...new Set(cc.map((r) => r.lote_id))].map((loteId) => ({
    lote: loteNombre(loteId),
    cc: ccPromedio(cc.filter((r) => r.lote_id === loteId)),
    n: cc.filter((r) => r.lote_id === loteId).length,
  }));

  // Destete (estimado): terneros/as en stock + vendidos como terneros en los últimos 12 meses.
  const terneros = animals.filter((a) => a.estado === 'ACTIVO' && ['Ternero', 'Ternera'].includes(a.categoria));
  const vendidosTerneros = movs.filter(
    (m) => m.categoria === 'VENTA' && ['Ternero', 'Ternera'].includes(m.categoria_animal ?? '') && m.fecha >= ahora - 365 * DAY_MS,
  );
  const destetados = terneros.length + vendidosTerneros.reduce((a, m) => a + (m.cabezas ?? 0), 0);
  const kgDestetados =
    terneros.reduce((a, t) => a + (t.peso_actual ?? 0), 0) + vendidosTerneros.reduce((a, m) => a + (m.kg ?? 0), 0);

  const tercios = ['cabeza', 'cuerpo', 'cola'].map((t) => ({ name: t[0].toUpperCase() + t.slice(1), value: listaTactos.filter((x) => x.tercio === t).length }));
  const editable = canEdit(perfil?.rol);
  const anio = new Date(ahora).getFullYear();

  return (
    <>
      <PageHeader
        title="Reproducción"
        description={ultima ? `Temporada ${ultima} · toros desde el ${fmtDate(inicioTemporada)}` : 'Cargá la temporada de servicio para calcular la preñez por toro'}
        actions={
          editable && (
            <>
              <RevisacionForm />
              <ServicioForm lotes={lotes} temporada={`${anio}-${String(anio + 1).slice(2)}`} />
            </>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Preñez"
          value={fmtPct(general.pct)}
          hint={`${general.prenadas} de ${general.tactadas} tactadas`}
          tone={general.pct == null ? 'default' : general.pct >= 85 ? 'success' : general.pct >= 75 ? 'warning' : 'danger'}
        />
        <StatCard label="Vientres entorados" value={vientres ?? '—'} hint={toros ? `${toros} toros` : undefined} />
        <StatCard label="Toro / vientre" value={vientres && toros ? fmtPct((toros / vientres) * 100) : '—'} hint="Recomendado 3 a 4 %" />
        <StatCard label="CC al servicio" value={fmtNum(ccPromedio(ccServicio), 2)} hint={`${ccServicio.length} evaluaciones`} />
        <StatCard
          label="Destete"
          value={fmtPct(porcentaje(destetados, vientres))}
          hint={vientres ? `Estimado · ${fmtNum(kgDestetados / vientres)} kg por vaca entorada` : 'Necesita vientres entorados'}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Preñez por lote" className="lg:col-span-2" flush>
          <PrenezTable titulo="Lote" filas={prenezPor(listaTactos, animalsById, (a) => loteNombre(a.lote_id))} />
        </Section>
        <Section title="Cabeza, cuerpo y cola" description="Si el tacto lo anota en las notas">
          {tercios.some((t) => t.value) ? (
            <DonutChartView data={tercios} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Agregá &quot;cabeza&quot;, &quot;cuerpo&quot; o &quot;cola&quot; en las notas del tacto.</p>
          )}
        </Section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Preñez por categoría" flush>
          <PrenezTable titulo="Categoría" filas={prenezPor(listaTactos, animalsById, (a) => a.categoria)} />
        </Section>
        <Section title="Preñez por toro" description="Según el lote donde estuvo cada toro" flush>
          <PrenezTable titulo="Toro" filas={prenezPorToro(listaTactos, animalsById, delaTemporada)} />
        </Section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
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
      </div>
    </>
  );
}
