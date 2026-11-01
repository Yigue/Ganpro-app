import { DonutChartView } from '@/components/charts/charts';
import { Simulador } from '@/components/costos/simulador';
import { PageHeader, Section } from '@/components/ui/section';
import { PeriodoTabs } from '@/components/ui/periodo-tabs';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { costoPorKg, costosPorLote } from '@/lib/calc/costos';
import { DAY_MS, ejercicioAnterior, ejercicioDe } from '@/lib/calc/fechas';
import { enRango, sumar, tipoCosto } from '@/lib/calc/finanzas';
import { fmtARS, fmtNum } from '@/lib/calc/format';
import { kgGanados, pesajesPorAnimal } from '@/lib/calc/pesadas';
import { prenez, tactos } from '@/lib/calc/reproduccion';
import { activos } from '@/lib/calc/stock';
import { byId, getAnimals, getCatalogo, getEstablecimiento, getEventos, getLotes, getMovimientosFinancieros, selectAll } from '@/lib/db/client';

export const metadata = { title: 'Costos' };

const NOMBRE: Record<string, string> = {
  SANIDAD: 'Sanidad',
  NUTRICION: 'Suplemento y sal',
  ALQUILER: 'Alquiler',
  MANO_OBRA: 'Mano de obra',
  COMPRA: 'Compra de hacienda',
  IMPUESTOS: 'Impuestos',
  MANTENIMIENTO: 'Mantenimiento',
  AMORTIZACION: 'Amortizaciones',
  OTRO: 'Otros',
};

export default async function CostosPage({ searchParams }: { searchParams: Promise<{ ej?: string }> }) {
  const [{ ej }, animals, lotes, movs, logs, catalogo, eventos, servicios, est] = await Promise.all([
    searchParams,
    getAnimals(),
    getLotes(),
    getMovimientosFinancieros(),
    selectAll('operation_logs'),
    getCatalogo(),
    getEventos(),
    selectAll('servicios', { order: 'fecha_entrada', ascending: false }),
    getEstablecimiento(),
  ]);

  const ahora = Date.now();
  const actual = ejercicioDe(ahora, est.inicio_ejercicio_mes);
  const periodo = ej === 'anterior' ? ejercicioAnterior(actual, est.inicio_ejercicio_mes) : actual;
  const hasta = Math.min(periodo.fin, ahora);
  const delPeriodo = enRango(movs, periodo.inicio, periodo.fin);
  const gastos = delPeriodo.filter((m) => m.tipo === 'GASTO');

  const directos = sumar(gastos, 'GASTO', (m) => tipoCosto(m.categoria) === 'directo');
  const estructura = sumar(gastos, 'GASTO', (m) => tipoCosto(m.categoria) === 'estructura');
  const total = directos + estructura;
  const cabezas = activos(animals).length;
  const kg = kgGanados(pesajesPorAnimal(eventos), periodo.inicio, hasta);
  const terneros = animals.filter((a) => ['Ternero', 'Ternera'].includes(a.categoria) && a.estado !== 'MUERTO').length;

  const porCategoria = Object.entries(
    gastos.reduce<Record<string, number>>((acc, m) => ({ ...acc, [m.categoria]: (acc[m.categoria] ?? 0) + m.monto }), {}),
  )
    .map(([categoria, monto]) => ({ categoria, monto, tipo: tipoCosto(categoria) }))
    .sort((a, b) => b.monto - a.monto);

  const lotesCostos = costosPorLote({ lotes, animals, movs, logs, catalogo: byId(catalogo), desde: periodo.inicio, hasta });

  const servicio = servicios[0];
  const vientres = servicio?.vientres ?? animals.filter((a) => a.estado === 'ACTIVO' && ['Vaca', 'Vaquillona'].includes(a.categoria)).length;
  const pr = prenez(tactos(eventos, ahora - 365 * DAY_MS));
  const pesoTerneros = animals.filter((a) => a.estado === 'ACTIVO' && ['Ternero', 'Ternera'].includes(a.categoria) && a.peso_actual);
  const anual = (v: number) => (v * 365 * DAY_MS) / Math.max(DAY_MS, hasta - periodo.inicio);

  return (
    <>
      <PageHeader
        title="Costos"
        description={`Ejercicio ${periodo.label} (${new Date(periodo.inicio).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })} a ${new Date(periodo.fin).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })})`}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Costos directos" value={fmtARS(directos)} hint="Sanidad, sal, suplemento, mano de obra, alquiler" />
        <StatCard label="Estructura" value={fmtARS(estructura)} hint="Impuestos, mantenimiento, amortizaciones" />
        <StatCard label="Por cabeza" value={fmtARS(cabezas ? total / cabezas : null)} hint={`${cabezas} cabezas activas`} />
        <StatCard label="Por kg producido" value={fmtARS(costoPorKg(total, kg))} hint={`${fmtNum(kg)} kg ganados según pesadas`} />
        <StatCard label="Por ternero" value={fmtARS(terneros ? directos / terneros : null)} hint={`Costos directos / ${terneros} terneros`} />
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
      <Section title="Costo por lote" description="Si no hay gasto de sanidad cargado para el lote, se estima con las aplicaciones y el costo por dosis. El alquiler se prorratea desde costo por ha." flush>
        <Table>
          <THead>
            <tr>
              <TH>Lote</TH>
              <TH className="text-right">Cabezas</TH>
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
                <TD className="text-right tabular-nums">{l.cabezas}</TD>
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
      </Section>
      <Section title="Simulador de cría" description="Cuánto cambia el costo por kg y por ternero si mejora la preñez o sube la carga. Los costos se anualizan.">
        <Simulador
          base={{
            vientres,
            prenezPct: Math.round(pr.pct ?? 85),
            destetePct: 92,
            pesoDesteteKg: Math.round(pesoTerneros.length ? pesoTerneros.reduce((a, t) => a + (t.peso_actual ?? 0), 0) / pesoTerneros.length : 180),
            costoDirectoVientre: Math.round(vientres ? anual(directos) / vientres : 0),
            estructura: Math.round(anual(estructura)),
          }}
        />
      </Section>
    </>
  );
}
