import { DonutChartView } from '@/components/charts/charts';
import { PeriodoTabs } from '@/components/ui/periodo-tabs';
import { PageHeader,Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { Table,TBody,TD,TH,THead,TR } from '@/components/ui/table';
import { costoPorKg } from '@/lib/calc/costos';
import { ejercicioAnterior } from '@/lib/calc/fechas';
import { fmtARS,fmtNum } from '@/lib/calc/format';
import type { PageData } from '@/lib/db/page-costos';
import Link from 'next/link';
export function CostosView0({data}:{data:PageData}){const {ej,est,actual,periodo,directos,estructura,total,cabezas,kg,terneros,porCategoria,lotesCostos,NOMBRE,exposure,sinAsignar}=data;return <><Link className="text-sm text-primary underline" href="/gestion?vista=inventarios">Cortes de inventario y resultados</Link>
<PageHeader
        title="Costos"
        description={`Ejercicio ${periodo.label} (${new Date(periodo.inicio).toLocaleDateString('es-AR', { month: 'short', year: 'numeric',timeZone:'America/Argentina/Buenos_Aires' })} a ${new Date(periodo.fin).toLocaleDateString('es-AR', { month: 'short', year: 'numeric',timeZone:'America/Argentina/Buenos_Aires' })})`}
        actions={
          <PeriodoTabs
            activa={ej === 'anterior' ? 'anterior' : 'actual'}
            opciones={[
              { key: 'actual', label: `Ejercicio ${actual.label}`, href: '/costos' },
              { key: 'anterior', label: `Ejercicio ${ejercicioAnterior(actual, est.inicio_ejercicio_mes).label}`, href: '/costos?ej=anterior' },
            ]}
          />
        }
      />
<p className="text-sm text-muted-foreground">{exposure.legacyAnimals} animales con historia inicial incompleta; las permanencias se reconstruyen con los registros disponibles. El costo por destete es un cociente del costo directo total, sin asignación específica a cría.</p>
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Costos directos" value={fmtARS(directos)} hint="Sanidad, sal, suplemento, mano de obra, alquiler" />
        <StatCard label="Estructura" value={fmtARS(estructura)} hint="Impuestos, mantenimiento, amortizaciones" />
        <StatCard label="Por cabeza promedio" value={fmtARS(cabezas ? total / cabezas : null)} hint={`${fmtNum(cabezas,1)} cabezas promedio · ${fmtNum(exposure.animalDays)} cabezas-día`} />
        <StatCard label="Por kg neto registrado" value={fmtARS(costoPorKg(total, kg))} hint={`${fmtNum(kg)} kg netos entre pesadas`} />
        <StatCard label="Por destete registrado" value={fmtARS(terneros ? directos / terneros : null)} hint={`Costos directos / ${terneros} destetes del período`} />
      </div>
<div className="grid gap-6 lg:grid-cols-3">
        <Section title="Composición del gasto" className="lg:col-span-1">
          <DonutChartView data={porCategoria.map((c) => ({ name: NOMBRE[c.categoria] ?? c.categoria, value: c.monto }))} height={260} />
        </Section>
        <Section title="Detalle por concepto" className="lg:col-span-2" flush>
          <Table>
            <THead>
              <tr>
                <TH>Concepto</TH>
                <TH>Tipo</TH>
                <TH className="text-right">Monto</TH>
                <TH className="text-right">% del total</TH>
                <TH className="text-right">Por cabeza</TH>
              </tr>
            </THead>
            <TBody>
              {porCategoria.map((c) => (
                <TR key={c.categoria}>
                  <TD className="font-medium">{NOMBRE[c.categoria] ?? c.categoria}</TD>
                  <TD className="text-muted-foreground">{c.tipo === 'directo' ? 'Directo' : 'Estructura'}</TD>
                  <TD className="text-right tabular-nums">{fmtARS(c.monto)}</TD>
                  <TD className="text-right tabular-nums">{total ? `${fmtNum((c.monto / total) * 100, 1)} %` : '—'}</TD>
                  <TD className="text-right tabular-nums">{fmtARS(cabezas ? c.monto / cabezas : null)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
      </div>
<p className="text-sm text-muted-foreground">Costo directo sin asignar a un lote: {fmtARS(sinAsignar)}. La variación neta de pesadas representa la muestra disponible, no el balance total de carne.</p>
<Section title="Costo por lote" description="Cabezas promedio por permanencia registrada. Alquiler sólo de gastos cargados; tarifas del lote son presupuestos. Los costos sin lote quedan incluidos en el total general." flush>
        <Table>
          <THead>
            <tr>
              <TH>Lote</TH>
              <TH className="text-right">Cabezas promedio</TH>
              <TH className="text-right">Sanidad</TH>
              <TH className="text-right">Nutrición</TH>
              <TH className="text-right">Alquiler</TH>
              <TH className="text-right">Otros directos</TH>
              <TH className="text-right">Total</TH>
              <TH className="text-right">Por cabeza</TH>
            </tr>
          </THead>
          <TBody>
            {lotesCostos.map((l) => (
              <TR key={l.loteId}>
                <TD className="font-medium">{l.nombre}</TD>
                <TD className="text-right tabular-nums">{fmtNum(l.cabezas,1)}</TD>
                <TD className="text-right tabular-nums">{fmtARS(l.sanidad)}</TD>
                <TD className="text-right tabular-nums">{fmtARS(l.nutricion)}</TD>
                <TD className="text-right tabular-nums">{fmtARS(l.alquiler)}</TD>
                <TD className="text-right tabular-nums">{fmtARS(l.otrosDirectos)}</TD>
                <TD className="text-right font-medium tabular-nums">{fmtARS(l.total)}</TD>
                <TD className="text-right tabular-nums">{fmtARS(l.porCabeza)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Section></>;}
