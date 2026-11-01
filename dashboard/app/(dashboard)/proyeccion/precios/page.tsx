import { BarChartView, LineChartView } from '@/components/charts/charts';
import { ImportarPrecios } from '@/components/proyeccion/importar-precios';
import { PageHeader, Section } from '@/components/ui/section';
import { PeriodoTabs } from '@/components/ui/periodo-tabs';
import { StatCard } from '@/components/ui/stat-card';
import { DAY_MS } from '@/lib/calc/fechas';
import { fmtARS, fmtDateShort, fmtNum, fmtUSD } from '@/lib/calc/format';
import { estacionalidad } from '@/lib/calc/proyeccion';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { getPrecios, getSuplementos } from '@/lib/db/client';
import type { PrecioMercado } from '@/lib/db/types';

export const metadata = { title: 'Precios históricos' };

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
type Col = 'ternero_kg' | 'novillo_kg' | 'vaca_kg';

export default async function PreciosPage({ searchParams }: { searchParams: Promise<{ moneda?: string }> }) {
  const [{ moneda }, preciosDesc, suplementos, perfil] = await Promise.all([searchParams, getPrecios(), getSuplementos(), getSessionPerfil()]);
  const usd = moneda === 'usd';
  const precios = [...preciosDesc].sort((a, b) => a.fecha - b.fecha);
  const ultimo = precios[precios.length - 1];

  // Dólar vigente en cada fecha (el último cargado hasta ese día).
  let dolar: number | null = null;
  const conDolar = precios.map((p) => {
    dolar = p.dolar_oficial ?? dolar;
    return { p, dolar };
  });
  const valor = (p: PrecioMercado, d: number | null, col: Col) => {
    const v = p[col];
    if (v == null) return null;
    return usd ? (d ? v / d : null) : v;
  };

  const serie = conDolar.map(({ p, dolar: d }) => ({
    fecha: fmtDateShort(p.fecha) + ` ${String(new Date(p.fecha).getFullYear()).slice(2)}`,
    Ternero: valor(p, d, 'ternero_kg'),
    Novillo: valor(p, d, 'novillo_kg'),
    Vaca: valor(p, d, 'vaca_kg'),
  }));
  const relacion = precios
    .filter((p) => p.ternero_kg && p.novillo_kg)
    .map((p) => ({ fecha: fmtDateShort(p.fecha) + ` ${String(new Date(p.fecha).getFullYear()).slice(2)}`, 'Ternero / novillo': p.ternero_kg! / p.novillo_kg! }));

  const hace5 = Date.now() - 5 * 365 * DAY_MS;
  const recientes = conDolar.filter(({ p }) => p.fecha >= hace5);
  const est = (col: Col) => estacionalidad(recientes.map(({ p, dolar: d }) => ({ fecha: p.fecha, valor: valor(p, d, col) })));
  const estTernero = est('ternero_kg');
  const estNovillo = est('novillo_kg');
  const estData = MESES.map((m, i) => ({ mes: m, Ternero: estTernero[i], Novillo: estNovillo[i] }));
  const mejorMes = estTernero.reduce<number | null>((best, v, i) => (v != null && (best == null || v > (estTernero[best] ?? 0)) ? i : best), null);
  const anios = recientes.length ? (Date.now() - recientes[0].p.fecha) / (365 * DAY_MS) : 0;

  const maiz = suplementos.find((s) => s.tipo === 'MAIZ' && s.precio_por_tonelada);
  const maizKg = maiz ? maiz.precio_por_tonelada! / 1000 : null;
  const insumoProducto = maizKg && ultimo?.novillo_kg ? ultimo.novillo_kg / maizKg : null;
  const fmt = (v: number | null | undefined) => (usd ? fmtUSD(v) : fmtARS(v));
  const ultimoDolar = conDolar[conDolar.length - 1]?.dolar ?? null;

  return (
    <>
      <PageHeader
        title="Precios históricos"
        description={`${precios.length} fechas cargadas${anios ? ` · ${fmtNum(anios, 1)} años` : ''}${ultimo ? ` · último dato ${new Date(ultimo.fecha).toLocaleDateString('es-AR')}` : ''}`}
        actions={
          <>
            <PeriodoTabs
              activa={usd ? 'usd' : 'ars'}
              opciones={[
                { key: 'ars', label: 'Pesos', href: '/proyeccion/precios' },
                { key: 'usd', label: 'Dólares', href: '/proyeccion/precios?moneda=usd' },
              ]}
            />
            {canEdit(perfil?.rol) && <ImportarPrecios />}
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Ternero" value={fmt(ultimo ? valor(ultimo, ultimoDolar, 'ternero_kg') : null)} hint="por kg vivo" />
        <StatCard label="Novillo" value={fmt(ultimo ? valor(ultimo, ultimoDolar, 'novillo_kg') : null)} hint="por kg vivo" />
        <StatCard
          label="Relación compra/venta"
          value={ultimo?.ternero_kg && ultimo.novillo_kg ? fmtNum(ultimo.ternero_kg / ultimo.novillo_kg, 2) : '—'}
          hint="Precio del ternero / precio del novillo"
        />
        <StatCard
          label="Insumo-producto"
          value={insumoProducto ? `${fmtNum(insumoProducto, 1)} kg` : '—'}
          hint={maiz ? `Kg de maíz que paga 1 kg de novillo (${maiz.nombre} a ${fmtARS(maizKg)}/kg)` : 'Cargá el precio del maíz en Nutrición'}
        />
      </div>
      <Section title="Precio por kg vivo" description={usd ? 'En dólares al oficial de cada fecha' : 'En pesos corrientes'}>
        {serie.length ? (
          <LineChartView data={serie} xKey="fecha" series={[{ key: 'Ternero' }, { key: 'Novillo' }, { key: 'Vaca' }]} height={300} compactY />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">Cargá precios desde Configuración o con el CSV.</p>
        )}
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Estacionalidad"
          description={`Precio promedio por mes, últimos 5 años${mejorMes != null ? `. El ternero vale más en ${MESES[mejorMes]}.` : ''}`}
        >
          <BarChartView data={estData} xKey="mes" series={[{ key: 'Ternero' }, { key: 'Novillo' }]} height={260} compactY />
        </Section>
        <Section title="Relación ternero / novillo" description="Más alta: la reposición está cara frente a la venta del gordo">
          <LineChartView data={relacion} xKey="fecha" series={[{ key: 'Ternero / novillo' }]} height={260} />
        </Section>
      </div>
      <p className="text-xs text-muted-foreground">
        Fuente de ternero: el Mercado Agroganadero publica sobre todo hacienda de faena, así que el precio de invernada conviene tomarlo de remates o de un consignatario y cargarlo como fuente manual.
      </p>
    </>
  );
}
