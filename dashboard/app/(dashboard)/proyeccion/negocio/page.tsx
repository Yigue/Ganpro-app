import { CierreReal } from '@/components/proyeccion/cierre-real';
import { EscenariosList } from '@/components/proyeccion/escenarios-list';
import { SimuladorNegocio } from '@/components/proyeccion/simulador-negocio';
import { PageHeader, Section } from '@/components/ui/section';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { fmtARS, fmtNum } from '@/lib/calc/format';
import { MODELOS_EJEMPLO } from '@/lib/calc/proyeccion-presets';
import type { NegocioInput } from '@/lib/calc/proyeccion';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { getLotes, selectAll } from '@/lib/db/client';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Simulador de negocio' };

interface ResultadoGuardado {
  modelos?: { nombre: string; tropa: { margenBruto: number; ingreso: number; compra: number } ; costosDirectos: number; precioEquilibrio: number | null }[];
}

export default async function NegocioPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const [{ id }, lotes, escenarios, perfil] = await Promise.all([
    searchParams,
    getLotes(),
    selectAll('escenarios', { filter: (q) => q.eq('tipo', 'negocio'), order: 'fecha', ascending: false }),
    getSessionPerfil(),
  ]);
  const actual = escenarios.find((e) => e.id === id);
  const modelos = ((actual?.supuestos as { modelos?: NegocioInput[] } | undefined)?.modelos ?? MODELOS_EJEMPLO) as NegocioInput[];
  const editable = canEdit(perfil?.rol);
  const real = actual?.resultado_real as Record<string, number> | null | undefined;
  const proyectados = (actual?.resultado as ResultadoGuardado | undefined)?.modelos ?? [];
  const resumenes = Object.fromEntries(
    escenarios.map((e) => {
      const ms = (e.resultado as ResultadoGuardado).modelos ?? [];
      return [e.id, ms.map((m) => `${m.nombre}: ${fmtARS(m.tropa.margenBruto)}`).join(' · ')];
    }),
  );

  return (
    <>
      <PageHeader
        title={actual ? actual.nombre : 'Simulador de invernada y recría'}
        description="Compra, costos directos, costo de oportunidad de la tierra, margen y renta. Mirá el precio de equilibrio antes de comprar."
        actions={actual && editable && <CierreReal id={actual.id} lotes={lotes} loteId={actual.lote_id} desde={new Date(actual.fecha).toISOString().slice(0, 10)} />}
      />
      <SimuladorNegocio
        key={actual?.id ?? 'nuevo'}
        inicial={modelos}
        lotes={lotes}
        escenario={actual ? { id: actual.id, nombre: actual.nombre, loteId: actual.lote_id } : undefined}
        puedeEditar={editable}
      />
      {actual && real && (
        <Section title="Proyectado vs. real" description={`Movimientos del lote del ${new Date(real.desde).toLocaleDateString('es-AR')} al ${new Date(real.hasta).toLocaleDateString('es-AR')}`} flush>
          <Table>
            <THead>
              <tr>
                <TH />
                {proyectados.map((m) => (
                  <TH key={m.nombre} className="text-right">
                    {m.nombre}
                  </TH>
                ))}
                <TH className="text-right">Real</TH>
              </tr>
            </THead>
            <TBody>
              <TR>
                <TD>Venta</TD>
                {proyectados.map((m) => (
                  <TD key={m.nombre} className="text-right tabular-nums">{fmtARS(m.tropa.ingreso)}</TD>
                ))}
                <TD className="text-right font-medium tabular-nums">{fmtARS(real.ingreso)}</TD>
              </TR>
              <TR>
                <TD>Compra</TD>
                {proyectados.map((m) => (
                  <TD key={m.nombre} className="text-right tabular-nums">{fmtARS(m.tropa.compra)}</TD>
                ))}
                <TD className="text-right font-medium tabular-nums">{fmtARS(real.compra)}</TD>
              </TR>
              <TR className="font-semibold">
                <TD>Margen bruto</TD>
                {proyectados.map((m) => (
                  <TD key={m.nombre} className={cn('text-right tabular-nums', m.tropa.margenBruto < 0 && 'text-danger')}>{fmtARS(m.tropa.margenBruto)}</TD>
                ))}
                <TD className={cn('text-right tabular-nums', real.margenBruto < 0 ? 'text-danger' : 'text-success')}>{fmtARS(real.margenBruto)}</TD>
              </TR>
              <TR>
                <TD>Precio de venta por kg</TD>
                {proyectados.map((m) => (
                  <TD key={m.nombre} className="text-right tabular-nums text-muted-foreground">equilibrio {fmtARS(m.precioEquilibrio)}</TD>
                ))}
                <TD className="text-right tabular-nums">{fmtARS(real.precioVentaKg)}</TD>
              </TR>
              <TR>
                <TD>Cabezas y kg vendidos</TD>
                {proyectados.map((m) => (
                  <TD key={m.nombre} />
                ))}
                <TD className="text-right tabular-nums">
                  {fmtNum(real.cabezasVendidas)} cab · {fmtNum(real.kgVendidos)} kg
                </TD>
              </TR>
            </TBody>
          </Table>
        </Section>
      )}
      <Section title="Escenarios guardados" flush>
        <EscenariosList escenarios={escenarios} activo={actual?.id} puedeEditar={editable} resumenes={resumenes} />
      </Section>
    </>
  );
}
