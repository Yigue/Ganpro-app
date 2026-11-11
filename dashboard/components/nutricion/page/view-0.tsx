import { Formulador } from '@/components/nutricion/formulador';
import { EntregaForm,RacionForm,SuplementoForm } from '@/components/nutricion/nutricion-forms';
import { Progress } from '@/components/ui/progress';
import { PageHeader,Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { Table,TBody,TD,TH,THead,TR } from '@/components/ui/table';
import { DAY_MS } from '@/lib/calc/fechas';
import { fmtARS,fmtNum,fmtPct } from '@/lib/calc/format';
import { cargaEVha,contarPor } from '@/lib/calc/stock';
import type { PageData } from '@/lib/db/page-nutricion';
import Link from 'next/link';
export function NutricionView0({data}:{data:PageData}){const {potreros,config,suplementos,raciones,lotes,ahora,vivos,ev,hectareas,cargas,ultimoIngreso,totalKgMS,totalCosto,bajos,sobrecargados,formulas,editable}=data;return <><Link className="text-sm text-primary underline" href="/gestion?vista=insumos">Compras, existencias y costos de insumos</Link>
<PageHeader
        title="Nutrición y forraje"
        description="Carga de los potreros, suplementación y sal mineral"
        actions={
          editable && (
            <>
              <RacionForm />
              <SuplementoForm />
              <EntregaForm lotes={lotes} potreros={potreros} raciones={raciones} />
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
      </Section></>;}
