import { AlertasSection, type Alerta } from '@/components/inicio/alertas-section';
import { CabezasChartSection } from '@/components/inicio/cabezas-chart-section';
import { KpiGrid } from '@/components/inicio/kpi-grid';
import { ResumenCategoriasSection } from '@/components/inicio/resumen-section';
import { PageHeader } from '@/components/ui/section';
import { DAY_MS, ejercicioDe, mesLabel, ultimosMeses } from '@/lib/calc/fechas';
import { fmtDate, fmtDateShort } from '@/lib/calc/format';
import { dolarEn, enRango, margenBruto, precioVigente, valuacionRodeo } from '@/lib/calc/finanzas';
import { suplementosBajoMinimo } from '@/lib/calc/nutricion';
import { pesadasAtrasadas, pesajesPorAnimal } from '@/lib/calc/pesadas';
import { prenez, tactos } from '@/lib/calc/reproduccion';
import { proximasOperaciones, vencidas } from '@/lib/calc/sanidad';
import { conciliar, ultimaActa } from '@/lib/calc/sigsa';
import { activos, cargaEVha, coefEV, historicoCabezas, recategorizacionesPendientes, totalEV } from '@/lib/calc/stock';
import {
  byId,
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
  const valorRodeo = valuacion.reduce((a, v) => a + v.valor, 0);
  const dolar = dolarEn(precios, ahora);
  const mb = margenBruto(enRango(movs, ejercicio.inicio, ejercicio.fin));

  // Alertas ---------------------------------------------------------------------
  const alertas: Alerta[] = [];
  const cat = byId(catalogo);
  const lotesById = byId(lotes);
  for (const op of vencidas(scheduled, ahora)) {
    alertas.push({
      tipo: 'sanidad',
      nivel: 'alta',
      titulo: `Vencida: ${cat.get(op.operation_id)?.nombre ?? 'Operación'}`,
      detalle: `${lotesById.get(op.lote_id ?? '')?.nombre ?? 'Sin lote'} · programada el ${fmtDate(op.fecha_programada)}`,
      href: '/sanidad',
    });
  }
  for (const op of proximasOperaciones(scheduled, ahora, est.dias_alerta_sanidad).filter((o) => o.fecha_programada >= ahora)) {
    alertas.push({
      tipo: 'sanidad',
      nivel: 'media',
      titulo: `${cat.get(op.operation_id)?.nombre ?? 'Operación'} el ${fmtDateShort(op.fecha_programada)}`,
      detalle: lotesById.get(op.lote_id ?? '')?.nombre ?? 'Sin lote asignado',
      href: '/sanidad',
    });
  }
  const acta = ultimaActa(sigsa);
  if (acta.fecha) {
    const difs = conciliar(animals, acta.filas).filter((f) => f.diferencia !== 0);
    if (difs.length) {
      alertas.push({
        tipo: 'sigsa',
        nivel: 'alta',
        titulo: 'Stock distinto del de SIGSA',
        detalle: difs.map((d) => `${d.categoria} ${d.diferencia > 0 ? '+' : ''}${d.diferencia}`).join(' · ') + ` (acta del ${fmtDate(acta.fecha)})`,
        href: '/movimientos',
      });
    }
  }
  for (const s of suplementosBajoMinimo(suplementos)) {
    alertas.push({
      tipo: 'insumo',
      nivel: 'media',
      titulo: `${s.nombre} bajo mínimo`,
      detalle: `Quedan ${Math.round(s.stock_kg ?? 0)} kg (mínimo ${Math.round(s.stock_minimo_kg ?? 0)} kg)`,
      href: '/nutricion',
    });
  }
  const atrasadas = pesadasAtrasadas(animals, pesajesPorAnimal(eventos), est.dias_alerta_pesada, ahora);
  if (atrasadas.length) {
    alertas.push({
      tipo: 'pesada',
      nivel: 'media',
      titulo: `${atrasadas.length} animales sin pesar hace más de ${est.dias_alerta_pesada} días`,
      detalle: 'Programá una pesada para seguir la ganancia diaria',
      href: '/stock?alerta=pesada',
    });
  }
  const recat = recategorizacionesPendientes(animals, config, ahora);
  if (recat.length) {
    alertas.push({
      tipo: 'recategorizacion',
      nivel: 'media',
      titulo: `${recat.length} animales para recategorizar por edad`,
      detalle: 'Confirmalos desde Stock',
      href: '/stock#recategorizacion',
    });
  }
  if (mangaPendientes.some((m) => m.status === 'ERROR')) {
    alertas.push({ tipo: 'sync', nivel: 'alta', titulo: 'Acciones de manga con error', detalle: 'Revisá la cola de sincronización', href: '/config#sync' });
  }

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
        description={`${[est.localidad, est.provincia].filter(Boolean).join(', ')} · ejercicio ${ejercicio.label} · ${new Date(ahora).toLocaleDateString('es-AR', { dateStyle: 'full' })}`}
      />
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
          valorRodeoUSD: dolar ? valorRodeo / dolar : null,
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
