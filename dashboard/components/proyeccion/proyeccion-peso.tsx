'use client';

import { useMemo, useState } from 'react';
import { LineChartView } from '@/components/charts/charts';
import { Field, Input, Select } from '@/components/ui/input';
import { Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { DAY_MS } from '@/lib/calc/fechas';
import { fmtDate, fmtDateShort, fmtNum } from '@/lib/calc/format';
import { fechaObjetivo, pesoEn, proyectarPeso } from '@/lib/calc/proyeccion';
import { GuardarEscenario } from './guardar-escenario';

export interface AnimalPeso {
  id: string;
  caravana: string;
  categoria: string;
  peso: number;
  fecha: number;
  gdp: number | null;
}

export interface LotePeso {
  id: string;
  nombre: string;
  recurso: string | null;
  gdpHistorica: number | null;
  animales: AnimalPeso[];
}

export interface SupuestosPeso {
  loteId: string;
  modo: 'historica' | 'manual';
  gdpManual: number;
  objetivo: number;
  fechaVenta: string;
  estacional: boolean;
}


export function ProyeccionPeso({
  lotes,
  inicial,
  escenario,
  puedeEditar,
}: {
  lotes: LotePeso[];
  inicial: SupuestosPeso;
  escenario?: { id: string; nombre: string };
  puedeEditar: boolean;
}) {
  const [s, setS] = useState<SupuestosPeso>(inicial);
  const lote = lotes.find((l) => l.id === s.loteId) ?? lotes[0];
  const hoy = useMemo(() => new Date(new Date().toDateString()).getTime(), []);
  const venta = new Date(`${s.fechaVenta}T12:00:00`).getTime();

  const calc = useMemo(() => {
    if (!lote || !lote.animales.length) return null;
    const gdpLote = s.modo === 'manual' ? s.gdpManual : (lote.gdpHistorica ?? s.gdpManual);
    const dias = Math.max(30, Math.ceil((Math.max(venta, hoy) - hoy) / DAY_MS) + 365);
    const pesoProm = lote.animales.reduce((a, x) => a + x.peso, 0) / lote.animales.length;
    const desde = Math.round(lote.animales.reduce((a, x) => a + x.fecha, 0) / lote.animales.length);
    const curva = proyectarPeso({ pesoInicial: pesoProm, desde, gdp: gdpLote, dias, recurso: lote.recurso, estacional: s.estacional });
    const animales = lote.animales.map((a) => {
      const g = s.modo === 'manual' ? s.gdpManual : (a.gdp ?? gdpLote);
      const c = proyectarPeso({ pesoInicial: a.peso, desde: a.fecha, gdp: g, dias, recurso: lote.recurso, estacional: s.estacional });
      return { ...a, gdpUsada: g, llega: fechaObjetivo(c, s.objetivo), pesoVenta: pesoEn(c, venta) };
    });
    const llegan = animales.filter((a) => a.llega != null && a.llega <= venta).length;
    return {
      gdpLote,
      pesoProm,
      desde,
      curva,
      llegaLote: fechaObjetivo(curva, s.objetivo),
      pesoVenta: pesoEn(curva, venta),
      kgTropa: animales.reduce((acc, a) => acc + (a.pesoVenta ?? 0), 0),
      animales,
      llegan,
    };
  }, [lote, s, venta, hoy]);

  const grafico = calc
    ? calc.curva
        .filter((_, i) => i % 7 === 0)
        .filter((p) => p.fecha <= Math.max(venta, calc.llegaLote ?? 0) + 30 * DAY_MS)
        .map((p) => ({ fecha: fmtDateShort(p.fecha), Peso: Math.round(p.peso), Objetivo: s.objetivo }))
    : [];

  return (
    <>
      <Section
        title="Supuestos"
        actions={
          puedeEditar &&
          calc && (
            <GuardarEscenario
              tipo="peso"
              id={escenario?.id}
              nombre={escenario?.nombre ?? `${lote?.nombre}: ${s.objetivo} kg`}
              supuestos={s}
              resultado={{ gdp: calc.gdpLote, pesoInicial: calc.pesoProm, llega: calc.llegaLote, pesoVenta: calc.pesoVenta, kgTropa: calc.kgTropa, cabezas: calc.animales.length }}
            />
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Lote" className="lg:col-span-2">
            <Select value={s.loteId} onChange={(e) => setS({ ...s, loteId: e.target.value })}>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} ({l.animales.length} pesados)
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ganancia diaria">
            <Select value={s.modo} onChange={(e) => setS({ ...s, modo: e.target.value as SupuestosPeso['modo'] })}>
              <option value="historica">Histórica ({lote?.gdpHistorica != null ? `${fmtNum(lote.gdpHistorica, 2)} kg/d` : 'sin datos'})</option>
              <option value="manual">Elegida</option>
            </Select>
          </Field>
          <Field label="GDP elegida (kg/día)">
            <Input type="number" step="0.05" min="0" value={s.gdpManual} disabled={s.modo !== 'manual'} onChange={(e) => setS({ ...s, gdpManual: Number(e.target.value) })} />
          </Field>
          <Field label="Peso objetivo (kg)">
            <Input type="number" step="5" value={s.objetivo} onChange={(e) => setS({ ...s, objetivo: Number(e.target.value) })} />
          </Field>
          <Field label="Fecha de venta">
            <Input type="date" value={s.fechaVenta} onChange={(e) => setS({ ...s, fechaVenta: e.target.value })} />
          </Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.estacional} onChange={(e) => setS({ ...s, estacional: e.target.checked })} />
          Curva estacional según el recurso del potrero ({lote?.recurso ?? 'campo natural'}): menos ganancia en invierno, más en primavera
        </label>
      </Section>
      {!calc ? (
        <Section title="Sin pesadas">
          <p className="text-sm text-muted-foreground">El lote no tiene animales activos con pesadas. Cargalas desde la app o con el CSV del bastón.</p>
        </Section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Peso de partida" value={`${fmtNum(calc.pesoProm)} kg`} hint={`Promedio de ${calc.animales.length} animales al ${fmtDate(calc.desde)}`} />
            <StatCard
              label={`Llega a ${s.objetivo} kg`}
              value={calc.llegaLote ? fmtDate(calc.llegaLote) : 'No llega'}
              hint={`Con ${fmtNum(calc.gdpLote, 2)} kg/día`}
              tone={calc.llegaLote && calc.llegaLote <= venta ? 'success' : 'warning'}
            />
            <StatCard label="Peso a la venta" value={calc.pesoVenta ? `${fmtNum(calc.pesoVenta)} kg` : '—'} hint={fmtDate(venta)} />
            <StatCard label="Kg de la tropa a la venta" value={fmtNum(calc.kgTropa)} hint={`${calc.llegan} de ${calc.animales.length} llegan al objetivo`} />
          </div>
          <Section title="Curva de peso del lote">
            <LineChartView data={grafico} xKey="fecha" series={[{ key: 'Peso', label: 'Peso proyectado' }, { key: 'Objetivo' }]} height={280} />
          </Section>
          <Section title="Por animal" description="Cada animal con su propia ganancia diaria histórica, o la del lote si tiene pocas pesadas" flush>
            <div className="max-h-[28rem] overflow-y-auto">
              <Table>
                <THead>
                  <tr>
                    <TH>Caravana</TH>
                    <TH>Categoría</TH>
                    <TH className="text-right">Última pesada</TH>
                    <TH className="text-right">GDP</TH>
                    <TH className="text-right">Llega a {s.objetivo} kg</TH>
                    <TH className="text-right">Peso a la venta</TH>
                  </tr>
                </THead>
                <TBody>
                  {[...calc.animales]
                    .sort((a, b) => (a.llega ?? Infinity) - (b.llega ?? Infinity))
                    .map((a) => (
                      <TR key={a.id}>
                        <TD className="font-medium">{a.caravana}</TD>
                        <TD>{a.categoria}</TD>
                        <TD className="text-right tabular-nums">
                          {fmtNum(a.peso)} kg · {fmtDateShort(a.fecha)}
                        </TD>
                        <TD className="text-right tabular-nums">{fmtNum(a.gdpUsada, 2)}</TD>
                        <TD className={a.llega && a.llega <= venta ? 'text-right text-success' : 'text-right text-warning'}>{a.llega ? fmtDate(a.llega) : 'No llega'}</TD>
                        <TD className="text-right tabular-nums">{a.pesoVenta ? `${fmtNum(a.pesoVenta)} kg` : '—'}</TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            </div>
          </Section>
        </>
      )}
    </>
  );
}

