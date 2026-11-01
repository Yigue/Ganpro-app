import { EscenariosList } from '@/components/proyeccion/escenarios-list';
import { ModeloCria, type CriaGuardado } from '@/components/proyeccion/modelo-cria';
import { PageHeader, Section } from '@/components/ui/section';
import { DAY_MS } from '@/lib/calc/fechas';
import { enRango, precioVigente, sumar, tipoCosto } from '@/lib/calc/finanzas';
import { fmtCompact } from '@/lib/calc/format';
import type { CriaAnio, CriaInput } from '@/lib/calc/proyeccion';
import { CRIA_EJEMPLO } from '@/lib/calc/proyeccion-presets';
import { prenez, tactos } from '@/lib/calc/reproduccion';
import { activos } from '@/lib/calc/stock';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { getAnimals, getEstablecimiento, getEventos, getMovimientosFinancieros, getPotreros, getPrecios, selectAll } from '@/lib/db/client';

export const metadata = { title: 'Crecimiento del rodeo de cría' };

export default async function CriaPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const [{ id }, animals, eventos, precios, movs, potreros, est, escenarios, perfil] = await Promise.all([
    searchParams,
    getAnimals(),
    getEventos(),
    getPrecios(),
    getMovimientosFinancieros(),
    getPotreros(),
    getEstablecimiento(),
    selectAll('escenarios', { filter: (q) => q.eq('tipo', 'cria'), order: 'fecha', ascending: false }),
    getSessionPerfil(),
  ]);

  const ahora = Date.now();
  const vivos = activos(animals);
  const vientres = vivos.filter((a) => ['Vaca', 'Vaquillona'].includes(a.categoria)).length;
  const pr = prenez(tactos(eventos, ahora - 365 * DAY_MS)).pct;
  const precio = precioVigente(precios);
  const terneros = vivos.filter((a) => ['Ternero', 'Ternera'].includes(a.categoria) && a.peso_actual);
  const vacas = vivos.filter((a) => a.categoria === 'Vaca' && a.peso_actual);
  const directos = sumar(enRango(movs, ahora - 365 * DAY_MS, ahora), 'GASTO', (m) => tipoCosto(m.categoria) === 'directo' && m.categoria !== 'COMPRA');
  const hectareas = est.hectareas_ganaderas ?? potreros.reduce((a, p) => a + (p.hectareas ?? 0), 0);
  const capacidad = potreros.reduce((a, p) => a + (p.capacidad_ev ?? 0), 0);
  const prom = (l: typeof vivos) => (l.length ? l.reduce((a, x) => a + (x.peso_actual ?? 0), 0) / l.length : null);

  const desdeDatos: CriaInput = {
    ...CRIA_EJEMPLO,
    vientres: vientres || CRIA_EJEMPLO.vientres,
    prenezPct: pr != null ? Math.round(pr) : CRIA_EJEMPLO.prenezPct,
    pesoDesteteKg: Math.round(prom(terneros) ?? CRIA_EJEMPLO.pesoDesteteKg),
    pesoVacaKg: Math.round(prom(vacas) ?? CRIA_EJEMPLO.pesoVacaKg),
    precioTerneroKg: Math.round(precio?.ternero_kg ?? CRIA_EJEMPLO.precioTerneroKg),
    precioVacaKg: Math.round(precio?.vaca_descarte_kg ?? precio?.vaca_kg ?? CRIA_EJEMPLO.precioVacaKg),
    costoVientre: vientres && directos ? Math.round(directos / vientres) : CRIA_EJEMPLO.costoVientre,
    hectareas: hectareas || CRIA_EJEMPLO.hectareas,
    evHa: hectareas && capacidad ? Math.round((capacidad / hectareas) * 100) / 100 : CRIA_EJEMPLO.evHa,
  };

  const actual = escenarios.find((e) => e.id === id);
  const inicial = { ...desdeDatos, ...((actual?.supuestos as Partial<CriaInput>) ?? {}) };
  const guardados: CriaGuardado[] = escenarios
    .filter((e) => e.id !== actual?.id)
    .map((e) => ({ id: e.id, nombre: e.nombre, anios: ((e.resultado as { anios?: CriaAnio[] }).anios ?? []) }));
  const editable = canEdit(perfil?.rol);
  const resumenes = Object.fromEntries(escenarios.map((e) => [e.id, `Margen ${fmtCompact((e.resultado as { margenTotal?: number }).margenTotal)}`]));

  return (
    <>
      <PageHeader title={actual?.nombre ?? 'Crecimiento del rodeo de cría'} description="Modelo año por año: vientres, terneros, kg vendidos, ingresos, margen y carga, con el tope de hectáreas del campo." />
      <ModeloCria key={actual?.id ?? 'nuevo'} inicial={inicial} guardados={guardados} escenario={actual ? { id: actual.id, nombre: actual.nombre } : undefined} puedeEditar={editable} />
      <Section title="Escenarios guardados" flush>
        <EscenariosList escenarios={escenarios} activo={actual?.id} puedeEditar={editable} resumenes={resumenes} />
      </Section>
    </>
  );
}
