import { ConciliacionSection } from '@/components/movimientos/conciliacion-section';
import { DteSection } from '@/components/movimientos/dte-section';
import { HistorialTable, type FilaHistorial } from '@/components/movimientos/historial-section';
import { MovimientoForm } from '@/components/movimientos/movimiento-form';
import { PageHeader, Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { ejercicioDe } from '@/lib/calc/fechas';
import { fmtPct } from '@/lib/calc/format';
import { conciliar, ultimaActa } from '@/lib/calc/sigsa';
import { mortandad } from '@/lib/calc/stock';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import {
  byId,
  getAnimals,
  getCategoriasConfig,
  getEstablecimiento,
  getEventos,
  getLotes,
  getMovimientosFinancieros,
  getPotreros,
  selectAll,
} from '@/lib/db/client';

export const metadata = { title: 'Movimientos y SIGSA' };

export default async function MovimientosPage() {
  const [animals, eventos, movimientos, movsFin, sigsa, lotes, potreros, config, est, perfil] = await Promise.all([
    getAnimals(),
    getEventos(),
    selectAll('animal_movements', { order: 'fecha', ascending: false }),
    getMovimientosFinancieros(),
    selectAll('sigsa_stock'),
    getLotes(),
    getPotreros(),
    getCategoriasConfig(),
    getEstablecimiento(),
    getSessionPerfil(),
  ]);

  const ahora = Date.now();
  const animalsById = byId(animals);
  const lotesById = byId(lotes);
  const potrerosById = byId(potreros);
  const nombre = (m: Map<string, { nombre: string }>, k: string | null) => (k ? (m.get(k)?.nombre ?? '?') : '—');
  const caravana = (id: string) => animalsById.get(id)?.id_caravana ?? id;

  const filas: FilaHistorial[] = [
    ...movimientos.map((m) => ({
      fecha: m.fecha,
      tipo: 'TRASLADO',
      animal: caravana(m.animal_id),
      detalle:
        m.potrero_origen_id !== m.potrero_destino_id
          ? `${nombre(potrerosById, m.potrero_origen_id)} → ${nombre(potrerosById, m.potrero_destino_id)}`
          : `Lote ${nombre(lotesById, m.lote_origen_id)} → ${nombre(lotesById, m.lote_destino_id)}`,
      dte: null,
    })),
    ...eventos
      .filter((e) => e.tipo === 'VENTA' || e.tipo === 'MUERTE')
      .map((e) => ({ fecha: e.timestamp, tipo: e.tipo, animal: caravana(e.animal_id), detalle: e.notas ?? '', dte: e.dte_numero })),
    ...animals
      .filter((a) => a.fecha_nacimiento && a.fecha_nacimiento >= ahora - 365 * 86_400_000 && ['Ternero', 'Ternera'].includes(a.categoria))
      .map((a) => ({ fecha: a.fecha_nacimiento!, tipo: 'NACIMIENTO', animal: a.id_caravana, detalle: a.categoria, dte: null })),
  ].sort((a, b) => b.fecha - a.fecha);

  const acta = ultimaActa(sigsa);
  const conciliacion = conciliar(animals, acta.filas);
  const ejercicio = ejercicioDe(ahora, est.inicio_ejercicio_mes);
  const enEjercicio = eventos.filter((e) => e.timestamp >= ejercicio.inicio);
  const editable = canEdit(perfil?.rol);

  return (
    <>
      <PageHeader
        title="Movimientos y trazabilidad"
        description={`RENSPA ${est.renspa ?? '—'} · ventas, compras, muertes, nacimientos y traslados`}
        actions={editable && <MovimientoForm lotes={lotes} potreros={potreros} categorias={config} />}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ventas del ejercicio" value={enEjercicio.filter((e) => e.tipo === 'VENTA').length} hint={`Cabezas · ejercicio ${ejercicio.label}`} />
        <StatCard label="Muertes del ejercicio" value={enEjercicio.filter((e) => e.tipo === 'MUERTE').length} hint="Cabezas" />
        <StatCard label="Mortandad" value={fmtPct(mortandad(animals, eventos, ejercicio.inicio, ejercicio.fin, ahora))} hint="Muertes / stock promedio" />
        <StatCard label="Traslados (30 días)" value={movimientos.filter((m) => m.fecha >= ahora - 30 * 86_400_000).length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ConciliacionSection
            filas={conciliacion}
            fecha={acta.fecha}
            acta={acta.acta}
            categorias={config.map((c) => c.categoria)}
            puedeEditar={editable}
          />
        </div>
        <Section title="Historial" className="lg:col-span-3" flush>
          <HistorialTable filas={filas} />
        </Section>
      </div>
      <DteSection movs={movsFin.filter((m) => m.dte_numero)} puedeEditar={editable} />
    </>
  );
}
