'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { convertirLineaEnReal } from '@/app/(dashboard)/proyeccion/actions';
import { BarChartView } from '@/components/charts/charts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormDialog } from '@/components/ui/form-dialog';
import { Field, Input } from '@/components/ui/input';
import { Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { mesLabel } from '@/lib/calc/fechas';
import { fmtARS, fmtCompact, fmtNum } from '@/lib/calc/format';
import { montoLinea, simularPlan, type LineaPlan } from '@/lib/calc/proyeccion';
import { cn } from '@/lib/utils';
import { GuardarEscenario } from './guardar-escenario';

export interface DatosPlan {
  stockInicial: Record<string, number>;
  categorias: { categoria: string; ev: number; pesoProm: number | null; precioKg: number | null }[];
  capacidadEv: number | null;
  gastoMensual: number;
  mesInicio: string;
}

function sumarMeses(inicio: string, n: number): string {
  const [y, m] = inicio.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function RegistrarReal({ linea }: { linea: LineaPlan }) {
  return (
    <FormDialog
      title={`Registrar ${linea.tipo === 'VENTA' ? 'venta' : 'compra'} real`}
      description="Crea el movimiento en Finanzas con el DTE. El stock se baja cargando el movimiento de hacienda en Movimientos."
      trigger={<CheckCircle2 className="h-4 w-4" />}
      triggerVariant="ghost"
      action={convertirLineaEnReal}
      submitLabel="Registrar"
    >
      <input type="hidden" name="id" value={linea.id} />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Fecha">
          <Input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </Field>
        <Field label="N° de DTE">
          <Input name="dte_numero" />
        </Field>
        <Field label="Monto real (ARS)">
          <Input name="monto" type="number" min="0" defaultValue={Math.round(montoLinea(linea))} />
        </Field>
      </div>
    </FormDialog>
  );
}

export function PlanCompraVenta({
  datos,
  inicial,
  horizonteInicial,
  escenario,
  puedeEditar,
}: {
  datos: DatosPlan;
  inicial: LineaPlan[];
  horizonteInicial: number;
  escenario?: { id: string; nombre: string };
  puedeEditar: boolean;
}) {
  const [lineas, setLineas] = useState<LineaPlan[]>(inicial);
  const [horizonte, setHorizonte] = useState(horizonteInicial);
  const meses = useMemo(() => Array.from({ length: horizonte }, (_, i) => sumarMeses(datos.mesInicio, i)), [horizonte, datos.mesInicio]);
  const cat = useMemo(() => new Map(datos.categorias.map((c) => [c.categoria, c])), [datos.categorias]);
  const evMap = useMemo(() => new Map(datos.categorias.map((c) => [c.categoria, c.ev])), [datos.categorias]);

  const resultado = useMemo(
    () => simularPlan({ meses, stockInicial: datos.stockInicial, lineas, gastoMensual: datos.gastoMensual, ev: evMap, capacidadEv: datos.capacidadEv }),
    [meses, datos, lineas, evMap],
  );

  const nueva = (tipo: 'VENTA' | 'COMPRA', categoria: string, cabezas: number, mes: string) => {
    const c = cat.get(categoria);
    setLineas([...lineas, { mes, tipo, categoria, cabezas: Math.max(1, Math.round(cabezas)), kg: Math.round(c?.pesoProm ?? 300), precioKg: Math.round(c?.precioKg ?? 0) }]);
  };
  const editar = (i: number, cambios: Partial<LineaPlan>) => setLineas(lineas.map((l, j) => (j === i ? { ...l, ...cambios } : l)));

  const st = datos.stockInicial;
  const presets = [
    { label: 'Terneros al destete', fn: () => nueva('VENTA', 'Ternero', st.Ternero || 30, sumarMeses(datos.mesInicio, 4)) },
    { label: 'Terneras (no retenidas)', fn: () => nueva('VENTA', 'Ternera', Math.round((st.Ternera || 30) * 0.6), sumarMeses(datos.mesInicio, 4)) },
    { label: 'Refugo de vacas', fn: () => nueva('VENTA', 'Vaca Descarte', Math.round((st.Vaca || 100) * 0.12), sumarMeses(datos.mesInicio, 5)) },
    { label: 'Reposición de vientres', fn: () => nueva('COMPRA', 'Vaquillona', 10, sumarMeses(datos.mesInicio, 6)) },
    { label: 'Toro', fn: () => nueva('COMPRA', 'Toro', 1, sumarMeses(datos.mesInicio, 8)) },
  ];

  const totalIngresos = resultado.reduce((a, m) => a + m.ingresos, 0);
  const totalCompras = resultado.reduce((a, m) => a + m.compras, 0);
  const final = resultado[resultado.length - 1];
  const minimo = resultado.reduce((min, m) => Math.min(min, m.acumulado), 0);
  const mesesExcedidos = resultado.filter((m) => m.sobreCapacidad);
  const categoriasStock = [...new Set([...Object.keys(datos.stockInicial), ...lineas.map((l) => l.categoria)])];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Ventas proyectadas" value={fmtCompact(totalIngresos)} hint={fmtARS(totalIngresos)} />
        <StatCard label="Compras proyectadas" value={fmtCompact(totalCompras)} hint={fmtARS(totalCompras)} />
        <StatCard label="Caja al final" value={fmtCompact(final?.acumulado)} hint={`Peor mes: ${fmtARS(minimo)}`} tone={(final?.acumulado ?? 0) >= 0 ? 'success' : 'danger'} />
        <StatCard
          label="Carga"
          value={mesesExcedidos.length ? `${mesesExcedidos.length} meses excedida` : 'Dentro de la capacidad'}
          hint={datos.capacidadEv ? `Capacidad ${fmtNum(datos.capacidadEv)} EV de los potreros` : 'Cargá capacidad_ev en los potreros'}
          tone={mesesExcedidos.length ? 'danger' : 'default'}
        />
      </div>
      <Section
        title="Ventas y compras"
        description={`Gasto fijo estimado ${fmtARS(datos.gastoMensual)}/mes (promedio de los últimos 6 meses)`}
        actions={
          <>
            <select value={horizonte} onChange={(e) => setHorizonte(Number(e.target.value))} className="rounded-md border bg-card px-2 py-1 text-sm" aria-label="Horizonte">
              <option value={12}>12 meses</option>
              <option value={18}>18 meses</option>
              <option value={24}>24 meses</option>
            </select>
            {puedeEditar && (
              <GuardarEscenario
                tipo="plan"
                id={escenario?.id}
                nombre={escenario?.nombre}
                supuestos={{ horizonte, mesInicio: datos.mesInicio, gastoMensual: datos.gastoMensual }}
                resultado={{ ingresos: totalIngresos, compras: totalCompras, cajaFinal: final?.acumulado ?? 0, peorMes: minimo, mesesExcedidos: mesesExcedidos.length }}
                lineas={lineas.filter((l) => !l.movimientoId)}
              />
            )}
          </>
        }
        flush
      >
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {presets.map((p) => (
            <Button key={p.label} variant="outline" size="sm" onClick={p.fn}>
              <Plus className="h-3.5 w-3.5" /> {p.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => nueva('VENTA', datos.categorias[0]?.categoria ?? 'Vaca', 1, datos.mesInicio)}>
            <Plus className="h-3.5 w-3.5" /> Línea vacía
          </Button>
        </div>
        <Table>
          <THead>
            <tr>
              <TH>Mes</TH>
              <TH>Operación</TH>
              <TH>Categoría</TH>
              <TH className="text-right">Cabezas</TH>
              <TH className="text-right">Kg/cab</TH>
              <TH className="text-right">$/kg</TH>
              <TH className="text-right">Monto</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {lineas.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                  Agregá ventas y compras con los botones de arriba.
                </td>
              </tr>
            )}
            {lineas
              .map((l, i) => ({ l, i }))
              .sort((a, b) => a.l.mes.localeCompare(b.l.mes))
              .map(({ l, i }) => {
                const bloqueada = Boolean(l.movimientoId);
                const cls = 'h-8 rounded-md border bg-card px-2 text-sm disabled:opacity-60';
                return (
                  <TR key={i}>
                    <TD>
                      <select value={l.mes} disabled={bloqueada} onChange={(e) => editar(i, { mes: e.target.value })} className={cls} aria-label="Mes">
                        {[...new Set([...meses, l.mes])].sort().map((m) => (
                          <option key={m} value={m}>
                            {mesLabel(m)}
                          </option>
                        ))}
                      </select>
                    </TD>
                    <TD>
                      <select value={l.tipo} disabled={bloqueada} onChange={(e) => editar(i, { tipo: e.target.value as LineaPlan['tipo'] })} className={cls} aria-label="Operación">
                        <option value="VENTA">Venta</option>
                        <option value="COMPRA">Compra</option>
                      </select>
                    </TD>
                    <TD>
                      <select value={l.categoria} disabled={bloqueada} onChange={(e) => editar(i, { categoria: e.target.value })} className={cls} aria-label="Categoría">
                        {datos.categorias.map((c) => (
                          <option key={c.categoria}>{c.categoria}</option>
                        ))}
                      </select>
                    </TD>
                    {(['cabezas', 'kg', 'precioKg'] as const).map((k) => (
                      <TD key={k} className="text-right">
                        <input
                          type="number"
                          min="0"
                          value={l[k]}
                          disabled={bloqueada}
                          onChange={(e) => editar(i, { [k]: Number(e.target.value) })}
                          className={cn(cls, 'w-24 text-right tabular-nums')}
                          aria-label={k}
                        />
                      </TD>
                    ))}
                    <TD className={cn('text-right tabular-nums', l.tipo === 'VENTA' ? 'text-success' : 'text-danger')}>{fmtARS(montoLinea(l))}</TD>
                    <TD className="text-right">
                      {bloqueada ? (
                        <Badge tone="success">Real</Badge>
                      ) : (
                        <div className="flex justify-end gap-1">
                          {l.id && puedeEditar && <RegistrarReal linea={l} />}
                          <Button variant="ghost" size="icon" onClick={() => setLineas(lineas.filter((_, j) => j !== i))} aria-label="Quitar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TD>
                  </TR>
                );
              })}
          </TBody>
        </Table>
        {lineas.some((l) => !l.id) && escenario && <p className="px-5 pt-3 text-xs text-muted-foreground">Guardá los cambios para poder registrar las líneas nuevas como reales.</p>}
        {!escenario && lineas.length > 0 && <p className="px-5 pt-3 text-xs text-muted-foreground">Guardá el escenario para poder convertir cada venta en real cuando emitas el DTE.</p>}
      </Section>
      <Section title="Flujo de caja" description="Ingresos y egresos por mes">
        <BarChartView
          data={resultado.map((m) => ({ mes: mesLabel(m.mes), Ingresos: m.ingresos, Egresos: m.compras + m.gastos, Acumulado: m.acumulado }))}
          xKey="mes"
          series={[{ key: 'Ingresos' }, { key: 'Egresos' }]}
          height={260}
          compactY
        />
      </Section>
      <Section title="Mes a mes" description="Caja acumulada y stock que resulta del plan" flush>
        <Table>
          <THead>
            <tr>
              <TH>Mes</TH>
              <TH className="text-right">Ingresos</TH>
              <TH className="text-right">Compras</TH>
              <TH className="text-right">Gastos</TH>
              <TH className="text-right">Neto</TH>
              <TH className="text-right">Acumulado</TH>
              {categoriasStock.map((c) => (
                <TH key={c} className="text-right">
                  {c}
                </TH>
              ))}
              <TH className="text-right">EV</TH>
            </tr>
          </THead>
          <TBody>
            {resultado.map((m) => (
              <TR key={m.mes} className={cn(m.sobreCapacidad && 'bg-danger/5')}>
                <TD className="font-medium">{mesLabel(m.mes)}</TD>
                <TD className="text-right tabular-nums">{m.ingresos ? fmtCompact(m.ingresos) : '—'}</TD>
                <TD className="text-right tabular-nums">{m.compras ? fmtCompact(m.compras) : '—'}</TD>
                <TD className="text-right tabular-nums">{fmtCompact(m.gastos)}</TD>
                <TD className={cn('text-right tabular-nums', m.neto < 0 && 'text-danger')}>{fmtCompact(m.neto)}</TD>
                <TD className={cn('text-right font-medium tabular-nums', m.acumulado < 0 && 'text-danger')}>{fmtCompact(m.acumulado)}</TD>
                {categoriasStock.map((c) => (
                  <TD key={c} className={cn('text-right tabular-nums', (m.stock[c] ?? 0) < 0 && 'text-danger')}>
                    {m.stock[c] ?? 0}
                  </TD>
                ))}
                <TD className={cn('text-right tabular-nums', m.sobreCapacidad && 'font-semibold text-danger')}>{fmtNum(m.ev)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
        <p className="px-5 pt-3 text-xs text-muted-foreground">El stock no incluye nacimientos ni recategorizaciones; usalo para revisar compras, ventas y carga. Un stock negativo indica que se vende más de lo que hay.</p>
      </Section>
    </>
  );
}
