'use client';

import { useMemo, useState } from 'react';
import { Copy, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { fmtARS, fmtNum, fmtPct } from '@/lib/calc/format';
import { ejes, sensibilidad, simularNegocio, type NegocioInput, type NegocioResultado } from '@/lib/calc/proyeccion';
import type { Lote } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { GuardarEscenario } from './guardar-escenario';

type Campo = { key: keyof NegocioInput; label: string; step?: number; grupo: string };

const CAMPOS: Campo[] = [
  { key: 'cabezas', label: 'Cabezas', grupo: 'Hacienda' },
  { key: 'kgEntrada', label: 'Kg de entrada', grupo: 'Hacienda' },
  { key: 'kgSalida', label: 'Kg de salida', grupo: 'Hacienda' },
  { key: 'dias', label: 'Días', grupo: 'Hacienda' },
  { key: 'precioCompra', label: 'Precio compra ($/kg)', grupo: 'Precios', step: 10 },
  { key: 'precioVenta', label: 'Precio venta ($/kg)', grupo: 'Precios', step: 10 },
  { key: 'alimentacion', label: 'Alimentación ($/cab)', grupo: 'Costos directos por cabeza', step: 1000 },
  { key: 'sanidad', label: 'Sanidad ($/cab)', grupo: 'Costos directos por cabeza', step: 500 },
  { key: 'pastura', label: 'Verdeo o pastura ($/cab)', grupo: 'Costos directos por cabeza', step: 1000 },
  { key: 'otrosDirectos', label: 'Otros ($/cab)', grupo: 'Costos directos por cabeza', step: 500 },
  { key: 'hectareas', label: 'Hectáreas usadas', grupo: 'Tierra', step: 1 },
  { key: 'alquilerHa', label: 'Alquiler ($/ha/año)', grupo: 'Tierra', step: 1000 },
  { key: 'gastosCompraPct', label: 'Gastos de compra (%)', grupo: 'Gastos comerciales', step: 0.5 },
  { key: 'gastosVentaPct', label: 'Gastos de venta (%)', grupo: 'Gastos comerciales', step: 0.5 },
  { key: 'desbastePct', label: 'Desbaste (%)', grupo: 'Gastos comerciales', step: 0.5 },
  { key: 'mortandadPct', label: 'Mortandad esperada (%)', grupo: 'Gastos comerciales', step: 0.5 },
];

type Fila = { label: string; valor: (r: NegocioResultado, i: NegocioInput) => string; destacado?: boolean; signo?: (r: NegocioResultado) => number };

const RESULTADOS: Fila[] = [
  { label: 'Ganancia diaria', valor: (r) => `${fmtNum(r.gdp, 3)} kg/día` },
  { label: 'Kg producidos por cabeza', valor: (r) => fmtNum(r.kgProducidos) },
  { label: 'Compra por cabeza', valor: (r) => fmtARS(r.compra) },
  { label: 'Costos directos por cabeza', valor: (r) => fmtARS(r.costosDirectos) },
  { label: 'Venta neta por cabeza', valor: (r) => fmtARS(r.ingreso) },
  { label: 'Margen bruto por cabeza', valor: (r) => fmtARS(r.margenBruto), signo: (r) => r.margenBruto },
  { label: 'Costo de oportunidad de la tierra', valor: (r) => fmtARS(r.costoTierra) },
  { label: 'Margen neto por cabeza', valor: (r) => fmtARS(r.margenNeto), destacado: true, signo: (r) => r.margenNeto },
  { label: 'Margen neto de la tropa', valor: (r) => fmtARS(r.tropa.margenNeto), destacado: true, signo: (r) => r.margenNeto },
  { label: 'Inversión de la tropa', valor: (r) => fmtARS(r.tropa.inversion) },
  { label: 'Renta del ciclo', valor: (r) => fmtPct(r.renta == null ? null : r.renta * 100), signo: (r) => r.renta ?? 0 },
  { label: 'Renta anualizada', valor: (r) => fmtPct(r.rentaAnual == null ? null : r.rentaAnual * 100), destacado: true, signo: (r) => r.rentaAnual ?? 0 },
  { label: 'Costo por kg producido', valor: (r) => fmtARS(r.costoKgProducido) },
  { label: 'Costo por kg vendido', valor: (r) => fmtARS(r.costoKgVendido) },
  { label: 'Precio de venta de equilibrio', valor: (r) => (r.precioEquilibrio ? `${fmtARS(r.precioEquilibrio)}/kg` : '—'), destacado: true },
];

function Sensibilidad({ modelo }: { modelo: NegocioInput }) {
  const gdpBase = modelo.dias > 0 ? (modelo.kgSalida - modelo.kgEntrada) / modelo.dias : 0.7;
  const pasoPrecio = Math.max(10, Math.round((modelo.precioVenta * 0.05) / 10) * 10);
  const precios = ejes(modelo.precioVenta, pasoPrecio, 3);
  const gdps = ejes(Math.round(gdpBase * 100) / 100, 0.1, 3).filter((g) => g > 0);
  const tabla = sensibilidad(modelo, precios, gdps);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr>
            <th className="p-2 text-left font-medium text-muted-foreground">GDP \ $/kg</th>
            {precios.map((p) => (
              <th key={p} className={cn('p-2 text-right font-medium', p === modelo.precioVenta ? 'text-foreground' : 'text-muted-foreground')}>
                {fmtNum(p)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gdps.map((g, i) => (
            <tr key={g}>
              <th className="p-2 text-left font-medium text-muted-foreground">{fmtNum(g, 2)}</th>
              {tabla[i].map((v, j) => (
                <td
                  key={j}
                  className={cn(
                    'p-2 text-right',
                    v >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
                    precios[j] === modelo.precioVenta && Math.abs(g - gdpBase) < 0.05 && 'font-bold ring-1 ring-inset ring-foreground/30',
                  )}
                >
                  {fmtNum(v / 1000, 0)}k
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">Margen neto por cabeza en miles de pesos. Verde gana, rojo pierde.</p>
    </div>
  );
}

export function SimuladorNegocio({
  inicial,
  lotes,
  escenario,
  puedeEditar,
}: {
  inicial: NegocioInput[];
  lotes: Lote[];
  escenario?: { id: string; nombre: string; loteId: string | null };
  puedeEditar: boolean;
}) {
  const [modelos, setModelos] = useState<NegocioInput[]>(inicial);
  const [sel, setSel] = useState(0);
  const resultados = useMemo(() => modelos.map(simularNegocio), [modelos]);

  const set = (i: number, key: keyof NegocioInput, v: string) =>
    setModelos(modelos.map((m, j) => (j === i ? { ...m, [key]: key === 'nombre' ? v : Number(v) } : m)));
  const usarLote = (i: number, loteId: string) => {
    const l = lotes.find((x) => x.id === loteId);
    if (l) setModelos(modelos.map((m, j) => (j === i ? { ...m, hectareas: l.hectareas ?? 0, alquilerHa: l.costo_alquiler_ha ?? 0 } : m)));
  };
  const grupos = [...new Set(CAMPOS.map((c) => c.grupo))];
  const modeloSel = modelos[Math.min(sel, modelos.length - 1)];

  return (
    <>
      <Section
        title="Modelos"
        description="Hasta cuatro alternativas lado a lado. Los costos van por cabeza y para todo el ciclo."
        actions={
          <>
            {modelos.length < 4 && (
              <Button variant="outline" size="sm" onClick={() => setModelos([...modelos, { ...modelos[modelos.length - 1], nombre: `Modelo ${modelos.length + 1}` }])}>
                <Plus className="h-4 w-4" /> Modelo
              </Button>
            )}
            {puedeEditar && (
              <GuardarEscenario
                tipo="negocio"
                id={escenario?.id}
                nombre={escenario?.nombre}
                loteId={escenario?.loteId}
                lotes={lotes}
                supuestos={{ modelos }}
                resultado={{ modelos: resultados.map((r, i) => ({ nombre: modelos[i].nombre, ...r })) }}
              />
            )}
          </>
        }
        flush
      >
        <Table>
          <THead>
            <tr>
              <TH className="w-56" />
              {modelos.map((m, i) => (
                <TH key={i} className="min-w-40">
                  <div className="flex items-center gap-1">
                    <input
                      value={m.nombre}
                      onChange={(e) => set(i, 'nombre', e.target.value)}
                      className="w-full rounded border-transparent bg-transparent px-1 py-0.5 text-xs font-semibold normal-case text-foreground hover:border-border focus:border-border"
                      aria-label="Nombre del modelo"
                    />
                    <button onClick={() => setModelos([...modelos.slice(0, i + 1), { ...m, nombre: `${m.nombre} (copia)` }, ...modelos.slice(i + 1)].slice(0, 4))} title="Duplicar" className="p-0.5 hover:text-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    {modelos.length > 1 && (
                      <button onClick={() => { setModelos(modelos.filter((_, j) => j !== i)); setSel(0); }} title="Quitar" className="p-0.5 hover:text-danger">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {grupos.map((g) => (
              <GrupoCampos key={g} grupo={g} modelos={modelos} set={set} lotes={lotes} usarLote={usarLote} />
            ))}
            <tr>
              <td colSpan={modelos.length + 1} className="bg-muted/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resultado
              </td>
            </tr>
            {RESULTADOS.map((f) => (
              <TR key={f.label} className={cn(f.destacado && 'font-semibold')}>
                <TD className="text-muted-foreground">{f.label}</TD>
                {resultados.map((r, i) => (
                  <TD key={i} className={cn('text-right tabular-nums', f.signo && (f.signo(r) >= 0 ? 'text-success' : 'text-danger'))}>
                    {f.valor(r, modelos[i])}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </Section>
      <Section
        title="Sensibilidad"
        description="Margen neto según precio de venta y ganancia diaria. Mirá en qué combinación se empieza a perder plata."
        actions={
          modelos.length > 1 && (
            <select value={sel} onChange={(e) => setSel(Number(e.target.value))} className="rounded-md border bg-card px-2 py-1 text-sm" aria-label="Modelo">
              {modelos.map((m, i) => (
                <option key={i} value={i}>
                  {m.nombre}
                </option>
              ))}
            </select>
          )
        }
      >
        <Sensibilidad modelo={modeloSel} />
      </Section>
    </>
  );
}

function GrupoCampos({
  grupo,
  modelos,
  set,
  lotes,
  usarLote,
}: {
  grupo: string;
  modelos: NegocioInput[];
  set: (i: number, k: keyof NegocioInput, v: string) => void;
  lotes: Lote[];
  usarLote: (i: number, loteId: string) => void;
}) {
  return (
    <>
      <tr>
        <td colSpan={modelos.length + 1} className="bg-muted/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {grupo}
        </td>
      </tr>
      {grupo === 'Tierra' && lotes.length > 0 && (
        <TR>
          <TD className="text-muted-foreground">Tomar del lote</TD>
          {modelos.map((_, i) => (
            <TD key={i}>
              <select defaultValue="" onChange={(e) => usarLote(i, e.target.value)} className="w-full rounded-md border bg-card px-2 py-1 text-xs" aria-label="Lote">
                <option value="">—</option>
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </TD>
          ))}
        </TR>
      )}
      {CAMPOS.filter((c) => c.grupo === grupo).map((c) => (
        <TR key={c.key}>
          <TD className="text-muted-foreground">{c.label}</TD>
          {modelos.map((m, i) => (
            <TD key={i}>
              <input
                type="number"
                step={c.step ?? 1}
                value={m[c.key] as number}
                onChange={(e) => set(i, c.key, e.target.value)}
                className="h-8 w-full rounded-md border bg-card px-2 text-right text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={c.label}
              />
            </TD>
          ))}
        </TR>
      ))}
    </>
  );
}
