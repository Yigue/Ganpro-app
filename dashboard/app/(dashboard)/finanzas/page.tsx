import { BarChartView } from '@/components/charts/charts';
import { MarcarCobrado, MovimientoFinancieroForm } from '@/components/finanzas/finanzas-forms';
import { Badge } from '@/components/ui/badge';
import { PageHeader, Section } from '@/components/ui/section';
import { PeriodoTabs } from '@/components/ui/periodo-tabs';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { ejercicioAnterior, ejercicioDe, mesKey, mesLabel, ultimosMeses } from '@/lib/calc/fechas';
import { cuentasPorCobrar, dolarEn, enRango, flujoProyectado, margenBruto, porMes, precioVigente, valuacionRodeo } from '@/lib/calc/finanzas';
import { fmtARS, fmtDate, fmtNum, fmtUSD } from '@/lib/calc/format';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { getAnimals, getCategoriasConfig, getEstablecimiento, getLotes, getMovimientosFinancieros, getPrecios } from '@/lib/db/client';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Finanzas' };

export default async function FinanzasPage({ searchParams }: { searchParams: Promise<{ moneda?: string }> }) {
  const [{ moneda }, movs, precios, animals, config, lotes, est, perfil] = await Promise.all([
    searchParams,
    getMovimientosFinancieros(),
    getPrecios(),
    getAnimals(),
    getCategoriasConfig(),
    getLotes(),
    getEstablecimiento(),
    getSessionPerfil(),
  ]);

  const usd = moneda === 'usd';
  const ahora = Date.now();
  const dolar = dolarEn(precios, ahora);
  const dolarMep = dolarEn(precios, ahora, 'dolar_mep');
  const fmt = (v: number | null | undefined) => (usd ? fmtUSD(v != null && dolar ? v / dolar : null) : fmtARS(v));

  const actual = ejercicioDe(ahora, est.inicio_ejercicio_mes);
  const anterior = ejercicioAnterior(actual, est.inicio_ejercicio_mes);
  const mbActual = margenBruto(enRango(movs, actual.inicio, actual.fin));
  const mbAnterior = margenBruto(enRango(movs, anterior.inicio, anterior.fin));

  const meses = ultimosMeses(12, ahora).map((m) => m.key);
  const mensual = porMes(movs, meses, precios);
  const chart = mensual.map((m) => ({
    label: mesLabel(m.mes),
    Ingresos: usd ? (m.ingresosUSD ?? 0) : m.ingresos,
    Gastos: usd ? (m.gastosUSD ?? 0) : m.gastos,
  }));

  const pendientes = cuentasPorCobrar(movs);
  const futuros = Array.from({ length: 6 }, (_, i) => mesKey(new Date(new Date(ahora).getFullYear(), new Date(ahora).getMonth() + i + 1, 1).getTime()));
  const flujo = flujoProyectado(mensual, pendientes, futuros);

  const precio = precioVigente(precios);
  const valuacion = valuacionRodeo(animals, config, precio);
  const valorRodeo = valuacion.reduce((a, v) => a + v.valor, 0);
  const editable = canEdit(perfil?.rol);

  const filasMB = [
    { label: 'Ingresos por ventas', a: mbActual.ingresos, b: mbAnterior.ingresos },
    { label: 'Diferencia de inventario', a: mbActual.difInventario, b: mbAnterior.difInventario },
    { label: 'Costos directos', a: -mbActual.costosDirectos, b: -mbAnterior.costosDirectos },
    { label: 'Margen bruto', a: mbActual.margenBruto, b: mbAnterior.margenBruto, bold: true },
    { label: 'Estructura', a: -mbActual.estructura, b: -mbAnterior.estructura },
    { label: 'Resultado', a: mbActual.resultado, b: mbAnterior.resultado, bold: true },
  ];

  return (
    <>
      <PageHeader
        title="Finanzas"
        description={`Dólar oficial ${fmtARS(dolar)} · MEP ${fmtARS(dolarMep)}${precio ? ` · precios del ${fmtDate(precio.fecha)}` : ''}`}
        actions={
          <>
            <PeriodoTabs
              activa={usd ? 'usd' : 'ars'}
              opciones={[
                { key: 'ars', label: 'Pesos', href: '/finanzas' },
                { key: 'usd', label: 'Dólares', href: '/finanzas?moneda=usd' },
              ]}
            />
            {editable && <MovimientoFinancieroForm lotes={lotes} />}
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Ingresos" value={fmt(mbActual.ingresos)} hint={`Ejercicio ${actual.label}`} />
        <StatCard label="Gastos" value={fmt(mbActual.costosDirectos + mbActual.estructura)} hint={`Ejercicio ${actual.label}`} />
        <StatCard label="Margen bruto" value={fmt(mbActual.margenBruto)} tone={mbActual.margenBruto >= 0 ? 'success' : 'danger'} hint="Ventas − costos directos" />
        <StatCard label="Por cobrar" value={fmt(pendientes.reduce((a, p) => a + p.monto, 0))} hint={`${pendientes.length} ventas a plazo`} />
        <StatCard label="Valor del rodeo" value={fmt(valorRodeo)} hint={usd ? fmtARS(valorRodeo) : fmtUSD(dolar ? valorRodeo / dolar : null)} />
      </div>
      <Section title="Ingresos y gastos por mes" description={usd ? 'En dólares a la cotización oficial de cada mes' : 'En pesos corrientes'}>
        <BarChartView data={chart} xKey="label" series={[{ key: 'Ingresos' }, { key: 'Gastos' }]} compactY height={300} />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Margen bruto por ejercicio" description="Julio a junio. La diferencia de inventario se completa al cerrar el ejercicio." flush>
          <Table>
            <THead>
              <tr>
                <TH />
                <TH className="text-right">{actual.label}</TH>
                <TH className="text-right">{anterior.label}</TH>
              </tr>
            </THead>
            <TBody>
              {filasMB.map((f) => (
                <TR key={f.label} className={cn(f.bold && 'bg-muted/40 font-semibold')}>
                  <TD>{f.label}</TD>
                  <TD className={cn('text-right tabular-nums', f.a < 0 && 'text-danger')}>{fmt(f.a)}</TD>
                  <TD className={cn('text-right tabular-nums', f.b < 0 && 'text-danger')}>{fmt(f.b)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
        <Section title="Flujo de caja proyectado" description="Cobros comprometidos menos el gasto promedio de los últimos 6 meses" flush>
          <Table>
            <THead>
              <tr>
                <TH>Mes</TH>
                <TH className="text-right">Cobros</TH>
                <TH className="text-right">Gastos</TH>
                <TH className="text-right">Neto</TH>
                <TH className="text-right">Acumulado</TH>
              </tr>
            </THead>
            <TBody>
              {flujo.map((f) => (
                <TR key={f.mes}>
                  <TD className="font-medium">{mesLabel(f.mes)}</TD>
                  <TD className="text-right tabular-nums">{fmt(f.cobros)}</TD>
                  <TD className="text-right tabular-nums">{fmt(f.gastos)}</TD>
                  <TD className={cn('text-right tabular-nums', f.neto < 0 && 'text-danger')}>{fmt(f.neto)}</TD>
                  <TD className={cn('text-right font-medium tabular-nums', f.acumulado < 0 && 'text-danger')}>{fmt(f.acumulado)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Valuación del rodeo" description="Cabezas × peso promedio × precio por kg de la categoría" flush>
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
      <Section title="Últimos movimientos" flush>
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
    </>
  );
}
