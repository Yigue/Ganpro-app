import { BarChartView } from '@/components/charts/charts';
import { Formulador } from '@/components/nutricion/formulador';
import { EntregaForm, RacionForm, SuplementoForm } from '@/components/nutricion/nutricion-forms';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader, Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { DAY_MS, mesLabel } from '@/lib/calc/fechas';
import { fmtARS, fmtNum, fmtPct } from '@/lib/calc/format';
import { cadenaForrajera, cargaPorPotrero, composicionRacion, entregasPorPotrero, suplementosBajoMinimo } from '@/lib/calc/nutricion';
import { activos, cargaEVha, contarPor, totalEV } from '@/lib/calc/stock';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { byId, getAnimals, getCategoriasConfig, getEstablecimiento, getPotreros, getSuplementos, selectAll } from '@/lib/db/client';

export const metadata = { title: 'Nutrición y forraje' };

export default async function NutricionPage() {
  const [animals, potreros, config, suplementos, raciones, ingredientes, logs, movimientos, est, perfil] = await Promise.all([
    getAnimals(),
    getPotreros(),
    getCategoriasConfig(),
    getSuplementos(),
    selectAll('raciones', { order: 'nombre' }),
    selectAll('racion_ingredientes'),
    selectAll('potrero_feeding_logs', { order: 'fecha', ascending: false }),
    selectAll('animal_movements', { order: 'fecha', ascending: false }),
    getEstablecimiento(),
    getSessionPerfil(),
  ]);

  const ahora = Date.now();
  const supById = byId(suplementos);
  const potrerosById = byId(potreros);
  const vivos = activos(animals);
  const ev = totalEV(vivos, config);
  const hectareas = est.hectareas_ganaderas ?? potreros.reduce((a, p) => a + (p.hectareas ?? 0), 0);
  const cargas = cargaPorPotrero(potreros, animals, config);

  // Días de ocupación: desde el último ingreso de animales al potrero.
  const ultimoIngreso = new Map<string, number>();
  for (const m of movimientos) {
    if (m.potrero_destino_id && !ultimoIngreso.has(m.potrero_destino_id)) ultimoIngreso.set(m.potrero_destino_id, m.fecha);
  }

  const composiciones = new Map(raciones.map((r) => [r.id, composicionRacion(ingredientes.filter((i) => i.racion_id === r.id), supById)]));
  const desde = ahora - 30 * DAY_MS;
  const entregas = entregasPorPotrero(logs, composiciones, desde);
  const totalKgMS = entregas.reduce((a, e) => a + e.kgMS, 0);
  const totalCosto = entregas.reduce((a, e) => a + (e.costo ?? 0), 0);
  const bajos = suplementosBajoMinimo(suplementos);
  const sobrecargados = cargas.filter((c) => (c.ocupacionPct ?? 0) > 100);

  const cadena = cadenaForrajera(potreros, ev, new Date(ahora).getFullYear()).map((c) => ({
    label: mesLabel(`2000-${String(c.mes + 1).padStart(2, '0')}`).split(' ')[0],
    Oferta: c.oferta / 1000,
    Demanda: c.demanda / 1000,
  }));

  const formulas = Object.fromEntries(
    raciones.map((r) => [r.id, ingredientes.filter((i) => i.racion_id === r.id).map((i) => ({ suplemento_id: i.suplemento_id, porcentaje: i.porcentaje }))]),
  );
  const editable = canEdit(perfil?.rol);

  return (
    <>
      <PageHeader
        title="Nutrición y forraje"
        description="Carga de los potreros, suplementación y sal mineral"
        actions={
          editable && (
            <>
              <RacionForm />
              <SuplementoForm />
              <EntregaForm potreros={potreros} raciones={raciones} />
            </>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Carga general" value={`${fmtNum(cargaEVha(ev, hectareas), 2)} EV/ha`} hint={`${fmtNum(ev, 0)} EV en ${fmtNum(hectareas)} ha`} />
        <StatCard label="Potreros sobrecargados" value={sobrecargados.length} hint="Más EV que su capacidad" tone={sobrecargados.length ? 'danger' : 'default'} />
        <StatCard label="MS entregada (30 días)" value={`${fmtNum(totalKgMS / 1000, 1)} t`} hint={fmtARS(totalCosto)} />
        <StatCard label="Insumos bajo mínimo" value={bajos.length} hint={bajos.map((b) => b.nombre).join(', ') || 'Stock OK'} tone={bajos.length ? 'warning' : 'default'} />
      </div>
      <Section title="Potreros" description="Carga actual contra capacidad" flush>
        <Table>
          <THead>
            <tr>
              <TH>Potrero</TH>
              <TH>Recurso</TH>
              <TH className="text-right">Ha</TH>
              <TH className="text-right">Cabezas</TH>
              <TH className="text-right">EV</TH>
              <TH className="text-right">EV/ha</TH>
              <TH className="w-48">Ocupación</TH>
              <TH className="text-right">Días</TH>
            </tr>
          </THead>
          <TBody>
            {cargas.map((c) => {
              const ingreso = ultimoIngreso.get(c.potrero.id);
              return (
                <TR key={c.potrero.id}>
                  <TD className="font-medium">{c.potrero.nombre}</TD>
                  <TD className="text-muted-foreground">{c.potrero.recurso_forrajero ?? '—'}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(c.potrero.hectareas)}</TD>
                  <TD className="text-right tabular-nums">{c.cabezas}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(c.ev, 1)}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(c.evHa, 2)}</TD>
                  <TD>
                    {c.ocupacionPct == null ? (
                      <span className="text-xs text-muted-foreground">Sin capacidad cargada</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Progress value={c.ocupacionPct} tone={c.ocupacionPct > 100 ? 'danger' : c.ocupacionPct > 85 ? 'warning' : 'success'} />
                        <span className="w-12 text-right text-xs tabular-nums">{fmtPct(c.ocupacionPct, 0)}</span>
                      </div>
                    )}
                  </TD>
                  <TD className="text-right tabular-nums">{ingreso && c.cabezas ? Math.floor((ahora - ingreso) / DAY_MS) : '—'}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Section>
      <Section title="Formulador de sal mineral y raciones" description="Ingredientes, costo por kg y consumo por categoría">
        <Formulador
          raciones={raciones}
          suplementos={suplementos}
          formulas={formulas}
          categorias={config}
          cabezas={contarPor(vivos, (a) => a.categoria)}
          puedeEditar={editable}
        />
      </Section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Cadena forrajera" description="Oferta aprovechable vs demanda del rodeo (t MS/mes). Estimada con curvas de referencia de Entre Ríos.">
          <BarChartView data={cadena} xKey="label" series={[{ key: 'Oferta' }, { key: 'Demanda' }]} height={260} />
        </Section>
        <Section title="Entregas por potrero (30 días)" flush>
          <Table>
            <THead>
              <tr>
                <TH>Potrero</TH>
                <TH className="text-right">Kg tal cual</TH>
                <TH className="text-right">Kg MS</TH>
                <TH className="text-right">Costo</TH>
              </tr>
            </THead>
            <TBody>
              {entregas.map((e) => (
                <TR key={e.potreroId}>
                  <TD className="font-medium">{potrerosById.get(e.potreroId)?.nombre ?? '?'}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(e.kg)}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(e.kgMS)}</TD>
                  <TD className="text-right tabular-nums">{fmtARS(e.costo)}</TD>
                </TR>
              ))}
              {!entregas.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    Sin entregas en los últimos 30 días
                  </td>
                </tr>
              )}
            </TBody>
          </Table>
        </Section>
      </div>
      <Section title="Insumos" flush>
        <Table>
          <THead>
            <tr>
              <TH>Insumo</TH>
              <TH>Tipo</TH>
              <TH className="text-right">MS</TH>
              <TH className="text-right">PB</TH>
              <TH className="text-right">$/t</TH>
              <TH className="text-right">Stock</TH>
              <TH className="text-right">Mínimo</TH>
              <TH>Proveedor</TH>
              {editable && <TH />}
            </tr>
          </THead>
          <TBody>
            {suplementos.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">{s.nombre}</TD>
                <TD>{s.tipo}</TD>
                <TD className="text-right tabular-nums">{fmtPct(s.materia_seca_pct, 0)}</TD>
                <TD className="text-right tabular-nums">{fmtPct(s.proteina_bruta_pct, 0)}</TD>
                <TD className="text-right tabular-nums">{fmtARS(s.precio_por_tonelada)}</TD>
                <TD className="text-right tabular-nums">
                  {bajos.includes(s) ? <Badge tone="warning">{fmtNum(s.stock_kg)} kg</Badge> : `${fmtNum(s.stock_kg)} kg`}
                </TD>
                <TD className="text-right tabular-nums">{s.stock_minimo_kg != null ? `${fmtNum(s.stock_minimo_kg)} kg` : '—'}</TD>
                <TD className="text-muted-foreground">{s.proveedor ?? '—'}</TD>
                {editable && (
                  <TD>
                    <SuplementoForm suplemento={s} />
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      </Section>
    </>
  );
}
