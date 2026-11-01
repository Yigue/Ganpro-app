'use client';

import { useMemo, useState } from 'react';
import { LineChartView } from '@/components/charts/charts';
import { Field, Input, Select } from '@/components/ui/input';
import { Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { fmtARS, fmtCompact, fmtNum } from '@/lib/calc/format';
import { simularCria, type CriaAnio, type CriaInput } from '@/lib/calc/proyeccion';
import { cn } from '@/lib/utils';
import { GuardarEscenario } from './guardar-escenario';

export interface CriaGuardado {
  id: string;
  nombre: string;
  anios: CriaAnio[];
}

type CampoNum = { key: keyof CriaInput; label: string; step?: number };

const GRUPOS: { titulo: string; campos: CampoNum[] }[] = [
  {
    titulo: 'Rodeo',
    campos: [
      { key: 'vientres', label: 'Vientres entorados hoy' },
      { key: 'prenezPct', label: 'Preñez (%)', step: 0.5 },
      { key: 'perdidasPct', label: 'Pérdidas hasta destete (%)', step: 0.5 },
      { key: 'mortandadPct', label: 'Mortandad de vacas (%)', step: 0.5 },
    ],
  },
  {
    titulo: 'Decisiones',
    campos: [
      { key: 'retencionPct', label: 'Terneras retenidas (%)', step: 5 },
      { key: 'refugoPct', label: 'Refugo de vacas (%), incluye vacías', step: 1 },
      { key: 'compraVientresAnual', label: 'Compra de vientres por año' },
      { key: 'ventaVientresAnual', label: 'Venta de vientres por año' },
    ],
  },
  {
    titulo: 'Precios y costos',
    campos: [
      { key: 'pesoDesteteKg', label: 'Peso al destete (kg)' },
      { key: 'precioTerneroKg', label: 'Precio ternero ($/kg)', step: 10 },
      { key: 'pesoVacaKg', label: 'Peso vaca de refugo (kg)' },
      { key: 'precioVacaKg', label: 'Precio vaca ($/kg)', step: 10 },
      { key: 'costoVientre', label: 'Costo directo por vientre ($/año)', step: 1000 },
    ],
  },
  {
    titulo: 'Campo',
    campos: [
      { key: 'hectareas', label: 'Hectáreas ganaderas' },
      { key: 'evHa', label: 'Capacidad (EV/ha)', step: 0.05 },
    ],
  },
];

export function ModeloCria({
  inicial,
  guardados,
  escenario,
  puedeEditar,
}: {
  inicial: CriaInput;
  guardados: CriaGuardado[];
  escenario?: { id: string; nombre: string };
  puedeEditar: boolean;
}) {
  const [i, setI] = useState<CriaInput>(inicial);
  const [comparar, setComparar] = useState<string[]>([]);
  const anios = useMemo(() => simularCria(i), [i]);
  const set = (k: keyof CriaInput, v: number | boolean) => setI({ ...i, [k]: v });

  const totalMargen = anios.reduce((a, x) => a + x.margen, 0);
  const ultimo = anios[anios.length - 1];
  const excedidos = anios.filter((a) => a.cargaEvHa != null && i.evHa > 0 && a.cargaEvHa > i.evHa).length;

  const series = [{ id: 'actual', nombre: 'Este escenario', anios }, ...guardados.filter((g) => comparar.includes(g.id))];
  const datosVientres = anios.map((_, k) => ({
    anio: `Año ${k + 1}`,
    ...Object.fromEntries(series.map((s) => [s.nombre, s.anios[k] ? Math.round(s.anios[k].vientres) : null])),
  }));
  const datosMargen = anios.map((_, k) => ({
    anio: `Año ${k + 1}`,
    ...Object.fromEntries(series.map((s) => [s.nombre, s.anios[k]?.margen ?? null])),
  }));

  return (
    <>
      <Section
        title="Supuestos"
        description="Arranca con el rodeo, la preñez y los precios actuales. Cambiá las decisiones para ver cómo crece."
        actions={
          puedeEditar && (
            <GuardarEscenario
              tipo="cria"
              id={escenario?.id}
              nombre={escenario?.nombre ?? `Cría ${i.prenezPct} % preñez, ${i.retencionPct} % retención`}
              supuestos={i}
              resultado={{ anios, margenTotal: totalMargen, vientresFinal: ultimo?.vientres }}
            />
          )
        }
      >
        <div className="grid gap-6 lg:grid-cols-4">
          {GRUPOS.map((g) => (
            <div key={g.titulo} className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.titulo}</p>
              {g.campos.map((c) => (
                <Field key={c.key} label={c.label}>
                  <Input type="number" step={c.step ?? 1} min="0" value={i[c.key] as number} onChange={(e) => set(c.key, Number(e.target.value))} />
                </Field>
              ))}
              {g.titulo === 'Rodeo' && (
                <Field label="Años a proyectar">
                  <Select value={i.anios} onChange={(e) => set('anios', Number(e.target.value))}>
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} años
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {g.titulo === 'Decisiones' && (
                <>
                  <Field label="Primer entore de las vaquillonas">
                    <Select value={i.demoraEntore} onChange={(e) => set('demoraEntore', Number(e.target.value) as 1 | 2)}>
                      <option value={1}>A los 15 meses</option>
                      <option value={2}>A los 27 meses</option>
                    </Select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={i.venderVacias} onChange={(e) => set('venderVacias', e.target.checked)} /> Vender además todas las vacías al tacto
                  </label>
                </>
              )}
              {g.titulo === 'Campo' && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={i.topeHectareas} onChange={(e) => set('topeHectareas', e.target.checked)} /> Respetar el tope de hectáreas (vende el excedente)
                </label>
              )}
            </div>
          ))}
        </div>
      </Section>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={`Vientres año ${i.anios}`} value={fmtNum(ultimo?.vientres)} hint={`Hoy ${fmtNum(i.vientres)}`} />
        <StatCard label="Terneros vendidos" value={fmtNum(anios.reduce((a, x) => a + x.ternerosVendidos, 0))} hint={`En ${i.anios} años`} />
        <StatCard label="Margen acumulado" value={fmtCompact(totalMargen)} hint={fmtARS(totalMargen)} tone={totalMargen >= 0 ? 'success' : 'danger'} />
        <StatCard label="Carga" value={excedidos ? `${excedidos} años excedida` : 'Dentro del campo'} hint={i.evHa ? `Tope ${fmtNum(i.hectareas * i.evHa)} EV` : 'Sin tope'} tone={excedidos ? 'danger' : 'default'} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Vientres por año">
          <LineChartView data={datosVientres} xKey="anio" series={series.map((s) => ({ key: s.nombre }))} height={260} />
        </Section>
        <Section title="Margen por año">
          <LineChartView data={datosMargen} xKey="anio" series={series.map((s) => ({ key: s.nombre }))} height={260} compactY />
        </Section>
      </div>
      {guardados.length > 0 && (
        <Section title="Comparar con escenarios guardados" description="Por ejemplo, 75 % contra 85 % de preñez, o retener más terneras durante dos años">
          <div className="flex flex-wrap gap-3">
            {guardados.map((g) => (
              <label key={g.id} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={comparar.includes(g.id)}
                  onChange={(e) => setComparar(e.target.checked ? [...comparar, g.id] : comparar.filter((x) => x !== g.id))}
                />
                {g.nombre}
                <span className="text-xs text-muted-foreground">({fmtCompact(g.anios.reduce((a, x) => a + x.margen, 0))})</span>
              </label>
            ))}
          </div>
        </Section>
      )}
      <Section title="Año por año" flush>
        <Table>
          <THead>
            <tr>
              <TH>Año</TH>
              <TH className="text-right">Vientres</TH>
              <TH className="text-right">Terneros</TH>
              <TH className="text-right">Retenidas</TH>
              <TH className="text-right">Vendidos</TH>
              <TH className="text-right">Refugo</TH>
              <TH className="text-right">Kg vendidos</TH>
              <TH className="text-right">Ingresos</TH>
              <TH className="text-right">Costos</TH>
              <TH className="text-right">Margen</TH>
              <TH className="text-right">EV/ha</TH>
            </tr>
          </THead>
          <TBody>
            {anios.map((a) => {
              const excede = a.cargaEvHa != null && i.evHa > 0 && a.cargaEvHa > i.evHa + 1e-9;
              return (
                <TR key={a.anio}>
                  <TD className="font-medium">{a.anio}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(a.vientres)}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(a.terneros)}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(a.retenidas)}</TD>
                  <TD className="text-right tabular-nums">{fmtNum(a.ternerosVendidos)}</TD>
                  <TD className="text-right tabular-nums">
                    {fmtNum(a.refugo)}
                    {a.ajustePorTope > 0 && <span className="ml-1 text-xs text-warning">(+{fmtNum(a.ajustePorTope)} por tope)</span>}
                  </TD>
                  <TD className="text-right tabular-nums">{fmtNum(a.kgVendidos)}</TD>
                  <TD className="text-right tabular-nums">{fmtCompact(a.ingresos)}</TD>
                  <TD className="text-right tabular-nums">{fmtCompact(a.costos)}</TD>
                  <TD className={cn('text-right font-medium tabular-nums', a.margen < 0 && 'text-danger')}>{fmtCompact(a.margen)}</TD>
                  <TD className={cn('text-right tabular-nums', excede && 'font-semibold text-danger')}>{fmtNum(a.cargaEvHa, 2)}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
        <p className="px-5 pt-3 text-xs text-muted-foreground">
          Terneros destetados = vientres × preñez × (1 − pérdidas). La mitad son hembras; las retenidas entran al servicio con la demora elegida. Precios constantes de hoy.
        </p>
      </Section>
    </>
  );
}
