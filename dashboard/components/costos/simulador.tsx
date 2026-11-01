'use client';

import { useState } from 'react';
import { Field, Input } from '@/components/ui/input';
import { simularCria, type SimulacionInput } from '@/lib/calc/costos';
import { fmtARS, fmtNum } from '@/lib/calc/format';
import { cn } from '@/lib/utils';

interface Base {
  vientres: number;
  prenezPct: number;
  destetePct: number;
  pesoDesteteKg: number;
  costoDirectoVientre: number;
  estructura: number;
}

function Resultado({ label, base, nuevo, fmt, menorEsMejor }: { label: string; base: number | null; nuevo: number | null; fmt: (v: number | null) => string; menorEsMejor?: boolean }) {
  const delta = base != null && nuevo != null && base !== 0 ? ((nuevo - base) / base) * 100 : null;
  const mejora = delta != null && (menorEsMejor ? delta < 0 : delta > 0);
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{fmt(nuevo)}</p>
      <p className="text-xs text-muted-foreground">
        Hoy {fmt(base)}
        {delta != null && Math.abs(delta) >= 0.05 && (
          <span className={cn('ml-1 font-medium', mejora ? 'text-success' : 'text-danger')}>
            ({delta > 0 ? '+' : ''}
            {fmtNum(delta, 1)} %)
          </span>
        )}
      </p>
    </div>
  );
}

const toInput = (b: Base): SimulacionInput => ({
  vientres: b.vientres,
  prenezPct: b.prenezPct,
  destetePct: b.destetePct,
  pesoDesteteKg: b.pesoDesteteKg,
  costoTotal: b.vientres * b.costoDirectoVientre + b.estructura,
  otrosKg: 0,
});

export function Simulador({ base }: { base: Base }) {
  const [e, setE] = useState<Base>(base);
  const actual = simularCria(toInput(base));
  const escenario = simularCria(toInput(e));
  const campo = (key: keyof Base, label: string, step = 1) => (
    <Field label={label}>
      <Input type="number" step={step} min={0} value={e[key]} onChange={(ev) => setE({ ...e, [key]: Number(ev.target.value) })} />
    </Field>
  );
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        {campo('vientres', 'Vientres (carga)')}
        {campo('prenezPct', 'Preñez (%)', 0.5)}
        {campo('destetePct', 'Destete sobre preñadas (%)', 0.5)}
        {campo('pesoDesteteKg', 'Peso al destete (kg)')}
        {campo('costoDirectoVientre', 'Costo directo por vientre ($)', 1000)}
        {campo('estructura', 'Estructura anual ($)', 10000)}
        <button type="button" onClick={() => setE(base)} className="col-span-2 w-fit text-xs text-muted-foreground underline-offset-4 hover:underline">
          Volver a los valores actuales
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Resultado label="Terneros destetados" base={actual.terneros} nuevo={escenario.terneros} fmt={(v) => fmtNum(v)} />
        <Resultado label="Kg destetados por vaca" base={actual.kgPorVaca} nuevo={escenario.kgPorVaca} fmt={(v) => `${fmtNum(v)} kg`} />
        <Resultado label="Costo por kg" base={actual.costoPorKg} nuevo={escenario.costoPorKg} fmt={fmtARS} menorEsMejor />
        <Resultado label="Costo por ternero" base={actual.costoPorTernero} nuevo={escenario.costoPorTernero} fmt={fmtARS} menorEsMejor />
      </div>
    </div>
  );
}
