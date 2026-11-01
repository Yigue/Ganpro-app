import { EscenariosList } from '@/components/proyeccion/escenarios-list';
import { PlanCompraVenta, type DatosPlan } from '@/components/proyeccion/plan-compraventa';
import { PageHeader, Section } from '@/components/ui/section';
import { mesKey, ultimosMeses } from '@/lib/calc/fechas';
import { porMes, precioVigente } from '@/lib/calc/finanzas';
import { fmtARS } from '@/lib/calc/format';
import type { LineaPlan } from '@/lib/calc/proyeccion';
import { activos, contarPor } from '@/lib/calc/stock';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { getAnimals, getCategoriasConfig, getMovimientosFinancieros, getPotreros, getPrecios, selectAll } from '@/lib/db/client';

export const metadata = { title: 'Plan de compras y ventas' };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const [{ id }, animals, config, potreros, movs, precios, escenarios, perfil] = await Promise.all([
    searchParams,
    getAnimals(),
    getCategoriasConfig(),
    getPotreros(),
    getMovimientosFinancieros(),
    getPrecios(),
    selectAll('escenarios', { filter: (q) => q.eq('tipo', 'plan'), order: 'fecha', ascending: false }),
    getSessionPerfil(),
  ]);
  const actual = escenarios.find((e) => e.id === id);
  const lineasGuardadas = actual ? await selectAll('escenario_lineas', { filter: (q) => q.eq('escenario_id', actual.id), order: 'mes' }) : [];

  const ahora = Date.now();
  const vivos = activos(animals);
  const precio = precioVigente(precios);
  const meses = ultimosMeses(6, ahora).map((m) => m.key);
  const historico = porMes(movs.filter((m) => !['COMPRA'].includes(m.categoria)), meses, precios);
  const gastoMensual = Math.round(historico.reduce((a, m) => a + m.gastos, 0) / Math.max(1, historico.length));
  const capacidad = potreros.reduce((a, p) => a + (p.capacidad_ev ?? 0), 0);
  const sig = new Date(new Date(ahora).getFullYear(), new Date(ahora).getMonth() + 1, 1).getTime();
  const supuestos = (actual?.supuestos ?? {}) as { horizonte?: number; mesInicio?: string };

  const datos: DatosPlan = {
    stockInicial: contarPor(vivos, (a) => a.categoria),
    categorias: config.map((c) => {
      const pesos = vivos.filter((a) => a.categoria === c.categoria && a.peso_actual).map((a) => a.peso_actual!);
      return {
        categoria: c.categoria,
        ev: c.ev,
        pesoProm: pesos.length ? pesos.reduce((a, b) => a + b, 0) / pesos.length : null,
        precioKg: precio && c.precio_columna ? Math.round((precio[c.precio_columna] as number | null) ?? 0) || null : null,
      };
    }),
    capacidadEv: capacidad || null,
    gastoMensual,
    mesInicio: supuestos.mesInicio ?? mesKey(sig),
  };

  const inicial: LineaPlan[] = lineasGuardadas.map((l) => ({
    id: l.id,
    mes: l.mes,
    tipo: l.tipo,
    categoria: l.categoria,
    cabezas: l.cabezas,
    kg: l.kg ?? 0,
    precioKg: l.precio_kg ?? 0,
    movimientoId: l.movimiento_id,
  }));
  const editable = canEdit(perfil?.rol);
  const resumenes = Object.fromEntries(escenarios.map((e) => [e.id, `Caja final ${fmtARS((e.resultado as { cajaFinal?: number }).cajaFinal)}`]));

  return (
    <>
      <PageHeader
        title={actual?.nombre ?? 'Plan de compras y ventas'}
        description="Calendario de ventas de terneros, refugo, reposición y toros, con el flujo de caja y el stock que resulta."
      />
      <PlanCompraVenta
        key={actual ? `${actual.id}:${lineasGuardadas.map((l) => `${l.id}${l.movimiento_id ? '*' : ''}`).join(',')}` : 'nuevo'}
        datos={datos}
        inicial={inicial}
        horizonteInicial={supuestos.horizonte ?? 12}
        escenario={actual ? { id: actual.id, nombre: actual.nombre } : undefined}
        puedeEditar={editable}
      />
      <Section title="Escenarios guardados" flush>
        <EscenariosList escenarios={escenarios} activo={actual?.id} puedeEditar={editable} resumenes={resumenes} />
      </Section>
    </>
  );
}
