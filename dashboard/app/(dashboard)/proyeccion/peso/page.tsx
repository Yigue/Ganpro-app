import { EscenariosList } from '@/components/proyeccion/escenarios-list';
import { ProyeccionPeso, type LotePeso, type SupuestosPeso } from '@/components/proyeccion/proyeccion-peso';
import { PageHeader, Section } from '@/components/ui/section';
import { DAY_MS } from '@/lib/calc/fechas';
import { fmtDate, fmtNum } from '@/lib/calc/format';
import { gdp, gdpPorLote, pesajesPorAnimal } from '@/lib/calc/pesadas';
import { activos } from '@/lib/calc/stock';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { byId, getAnimals, getEventos, getLotes, getPotreros, selectAll } from '@/lib/db/client';

export const metadata = { title: 'Proyección de peso' };

export default async function PesoPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const [{ id }, animals, eventos, lotes, potreros, escenarios, perfil] = await Promise.all([
    searchParams,
    getAnimals(),
    getEventos(),
    getLotes(),
    getPotreros(),
    selectAll('escenarios', { filter: (q) => q.eq('tipo', 'peso'), order: 'fecha', ascending: false }),
    getSessionPerfil(),
  ]);

  const pesajes = pesajesPorAnimal(eventos);
  const vivos = activos(animals).filter((a) => a.categoria !== 'Toro');
  const gdpLotes = new Map(gdpPorLote(vivos, pesajes).map((g) => [g.loteId, g.gdpPromedio]));
  const potrerosById = byId(potreros);

  const datos: LotePeso[] = lotes
    .map((l) => {
      const delLote = vivos.filter((a) => a.lote_id === l.id);
      const conteo = new Map<string, number>();
      delLote.forEach((a) => a.potrero_id && conteo.set(a.potrero_id, (conteo.get(a.potrero_id) ?? 0) + 1));
      const potreroPrincipal = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        id: l.id,
        nombre: l.nombre,
        recurso: potreroPrincipal ? (potrerosById.get(potreroPrincipal)?.recurso_forrajero ?? null) : null,
        gdpHistorica: gdpLotes.get(l.id) ?? null,
        animales: delLote
          .map((a) => {
            const p = pesajes.get(a.id) ?? [];
            const ultima = p[p.length - 1];
            return ultima ? { id: a.id, caravana: a.id_caravana, categoria: a.categoria, peso: ultima.valor, fecha: ultima.timestamp, gdp: gdp(p) } : null;
          })
          .filter((x): x is NonNullable<typeof x> => x != null),
      };
    })
    .filter((l) => l.animales.length);

  const actual = escenarios.find((e) => e.id === id);
  const porDefecto: SupuestosPeso = {
    loteId: datos.find((l) => l.nombre.toLowerCase().includes('recr'))?.id ?? datos[0]?.id ?? '',
    modo: 'historica',
    gdpManual: 0.6,
    objetivo: 360,
    fechaVenta: new Date(Date.now() + 120 * DAY_MS).toISOString().slice(0, 10),
    estacional: true,
  };
  const inicial = { ...porDefecto, ...((actual?.supuestos as Partial<SupuestosPeso>) ?? {}) };
  const editable = canEdit(perfil?.rol);
  const resumenes = Object.fromEntries(
    escenarios.map((e) => {
      const r = e.resultado as { llega?: number | null; pesoVenta?: number | null };
      return [e.id, `${r.llega ? `objetivo el ${fmtDate(r.llega)}` : 'no llega'} · ${fmtNum(r.pesoVenta)} kg a la venta`];
    }),
  );

  return (
    <>
      <PageHeader title={actual?.nombre ?? 'Proyección de ganancia de peso'} description="Parte de las pesadas reales y proyecta el peso a una fecha: cuándo llega la tropa al objetivo y cuántos kg tendrá al vender." />
      <ProyeccionPeso key={actual?.id ?? 'nuevo'} lotes={datos} inicial={inicial} escenario={actual ? { id: actual.id, nombre: actual.nombre } : undefined} puedeEditar={editable} />
      <Section title="Escenarios guardados" flush>
        <EscenariosList escenarios={escenarios} activo={actual?.id} puedeEditar={editable} resumenes={resumenes} />
      </Section>
    </>
  );
}
