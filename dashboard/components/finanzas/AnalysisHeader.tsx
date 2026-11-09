import {PageHeader,Section} from '@/components/ui/section';
import {StatCard} from '@/components/ui/stat-card';
import {PeriodoTabs} from '@/components/ui/periodo-tabs';
import {MovimientoFinancieroForm} from './finanzas-forms';
import {BarChartView} from '@/components/charts/charts';
import {fmtDate,fmtARS,fmtUSD} from '@/lib/calc/format';
import type {FinancialAnalysis} from '@/lib/db/financial-analysis';
export function AnalysisHeader({data}:{data:FinancialAnalysis}){const {dolarMep,precio,fmt,usd,lotes,editable,actual,mbActual,pendientes,valorRodeo,dolar,chart}=data;return <>
      <PageHeader
        title="Análisis económico"
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
        <StatCard label="Resultado parcial" value={fmt(mbActual.margenBruto)} tone={mbActual.margenBruto >= 0 ? 'success' : 'danger'} hint="Ventas − costos directos" />
        <StatCard label="Por cobrar" value={fmt(pendientes.reduce((a, p) => a + p.monto, 0))} hint={`${pendientes.length} comprobantes con saldo pendiente`} />
        <StatCard label="Valor del rodeo" value={fmt(valorRodeo)} hint={usd ? fmtARS(valorRodeo) : fmtUSD(dolar && valorRodeo != null ? valorRodeo / dolar : null)} />
      </div>
      <Section title="Ingresos y gastos por mes" description={usd ? 'En dólares a la cotización oficial de cada mes' : 'En pesos corrientes'}>
        <BarChartView data={chart} xKey="label" series={[{ key: 'Ingresos' }, { key: 'Gastos' }]} compactY height={300} />
      </Section>
      </>;}
