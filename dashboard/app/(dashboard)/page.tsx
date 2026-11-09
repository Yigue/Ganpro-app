import {homeAlerts} from '@/lib/db/home-alerts';
import {OperationalHome} from '@/components/inicio/operational-home';
import { AlertasSection } from '@/components/inicio/alertas-section';
import { CabezasChartSection } from '@/components/inicio/cabezas-chart-section';
import { KpiGrid } from '@/components/inicio/kpi-grid';
import { ResumenCategoriasSection } from '@/components/inicio/resumen-section';
import { PageHeader } from '@/components/ui/section';
import { DAY_MS, ejercicioDe, mesLabel, ultimosMeses } from '@/lib/calc/fechas';
import { dolarEn, enRango, margenBruto, precioVigente, valuacionRodeo } from '@/lib/calc/finanzas';
import { prenez, tactos } from '@/lib/calc/reproduccion';
import { activos, cargaEVha, coefEV, historicoCabezas, totalEV } from '@/lib/calc/stock';
import {
  getAnimals,
  getCatalogo,
  getCategoriasConfig,
  getEstablecimiento,
  getEventos,
  getLotes,
  getMovimientosFinancieros,
  getPotreros,
  getPrecios,
  getSuplementos,
  selectAll,
} from '@/lib/db/client';

export const metadata = { title: 'Inicio' };

export default async function InicioPage() {
  const [animals, config, est, eventos, precios, movs, scheduled, catalogo, suplementos, sigsa, lotes, potreros, mangaPendientes] =
    await Promise.all([
      getAnimals(),
      getCategoriasConfig(),
      getEstablecimiento(),
      getEventos(),
      getPrecios(),
      getMovimientosFinancieros(),
      selectAll('scheduled_operations', { filter: (q) => q.eq('estado', 'PENDIENTE') }),
      getCatalogo(),
      getSuplementos(),
      selectAll('sigsa_stock'),
      getLotes(),
      getPotreros(),
      selectAll('manga_action_queue', { filter: (q) => q.neq('status', 'PROCESSED') }),
    ]);

  const ahora = Date.now();
  const vivos = activos(animals);
  const ev = totalEV(vivos, config);
  const hectareas = est.hectareas_ganaderas ?? (potreros.reduce((a, p) => a + (p.hectareas ?? 0), 0) || null);
  const ejercicio = ejercicioDe(ahora, est.inicio_ejercicio_mes);
  const tactosAnio = tactos(eventos, ahora - 365 * DAY_MS);
  const pr = prenez(tactosAnio);
  const precio = precioVigente(precios);
  const valuacion = valuacionRodeo(animals, config, precio);
  const valorRodeo = valuacion.some(v => v.valor == null) ? null : valuacion.reduce((a, v) => a + (v.valor ?? 0), 0);
  const dolar = dolarEn(precios, ahora);
  const mb = margenBruto(enRango(movs, ejercicio.inicio, ejercicio.fin));

  const alertas = homeAlerts({animals,config,est,eventos,scheduled,catalogo,suplementos,sigsa,lotes,mangaPendientes,ahora});
  // Gráfico y resumen -------------------------------------------------------------
  const meses = ultimosMeses(12, ahora);
  const historico = historicoCabezas(animals, eventos, meses).map((f) => ({ ...f, label: mesLabel(f.mes) }));
  const orden = new Map(config.map((c) => [c.categoria, c.orden]));
  const categorias = [...new Set(animals.map((a) => a.categoria))].sort((a, b) => (orden.get(a) ?? 99) - (orden.get(b) ?? 99));
  const evs = coefEV(config);
  const filas = valuacion.map((v) => ({
    categoria: v.categoria,
    cabezas: v.cabezas,
    ev: v.cabezas * (evs.get(v.categoria) ?? 1),
    pesoPromedio: v.pesoPromedio,
  }));

  return (
    <>
      <PageHeader
        title={est.nombre}
        description={`${[est.localidad, est.provincia].filter(Boolean).join(', ')} · ejercicio ${ejercicio.label} · ${new Date(ahora).toLocaleDateString('es-AR', { dateStyle: 'full', timeZone: 'America/Argentina/Buenos_Aires' })}`}
      />
      <OperationalHome />
      <KpiGrid
        k={{
          cabezas: vivos.length,
          ev,
          cargaEvHa: cargaEVha(ev, hectareas),
          hectareas,
          prenezPct: pr.pct,
          tactadas: pr.tactadas,
          margenBruto: mb.margenBruto,
          ejercicio: ejercicio.label,
          valorRodeo,
          valorRodeoUSD: dolar && valorRodeo != null ? valorRodeo / dolar : null,
        }}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CabezasChartSection data={historico} categorias={categorias} />
        </div>
        <AlertasSection alertas={alertas} />
      </div>
      <ResumenCategoriasSection filas={filas} />
    </>
  );
}
