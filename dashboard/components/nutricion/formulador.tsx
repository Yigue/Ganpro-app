'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { guardarFormula } from '@/app/(dashboard)/nutricion/actions';
import { Button } from '@/components/ui/button';
import { ActionMessage, useAccion } from '@/components/ui/form-dialog';
import { Input, Select } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { fmtARS, fmtNum, fmtPct } from '@/lib/calc/format';
import type { CategoriaConfig, Racion, Suplemento } from '@/lib/db/types';
import { cn } from '@/lib/utils';

interface Item {
  suplemento_id: string;
  porcentaje: number;
}

export function Formulador({
  raciones,
  suplementos,
  formulas,
  categorias,
  cabezas,
  puedeEditar,
}: {
  raciones: Racion[];
  suplementos: Suplemento[];
  formulas: Record<string, Item[]>;
  categorias: CategoriaConfig[];
  cabezas: Record<string, number>;
  puedeEditar: boolean;
}) {
  const [racionId, setRacionId] = useState(raciones[0]?.id ?? '');
  const [items, setItems] = useState<Item[]>(formulas[racionId] ?? []);
  const [state, action, pending] = useAccion(guardarFormula);
  const sup = useMemo(() => new Map(suplementos.map((s) => [s.id, s])), [suplementos]);

  const total = items.reduce((a, i) => a + (i.porcentaje || 0), 0);
  const costoKg = total ? items.reduce((a, i) => a + ((i.porcentaje || 0) / 100) * ((sup.get(i.suplemento_id)?.precio_por_tonelada ?? 0) / 1000), 0) / (total / 100) : 0;
  const ms = total ? items.reduce((a, i) => a + ((i.porcentaje || 0) / 100) * (sup.get(i.suplemento_id)?.materia_seca_pct ?? 0), 0) / (total / 100) : 0;

  const cambiarRacion = (id: string) => {
    setRacionId(id);
    setItems(formulas[id] ?? []);
  };

  if (!raciones.length) return <p className="py-6 text-center text-sm text-muted-foreground">Creá una ración para formular.</p>;

  return (
    <div className="flex flex-col gap-4">
      <Select value={racionId} onChange={(e) => cambiarRacion(e.target.value)} className="sm:w-72" aria-label="Ración">
        {raciones.map((r) => (
          <option key={r.id} value={r.id}>
            {r.nombre}
          </option>
        ))}
      </Select>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <Select
                value={it.suplemento_id}
                disabled={!puedeEditar}
                onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, suplemento_id: e.target.value } : x)))}
                aria-label="Ingrediente"
              >
                {suplementos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Select>
              <div className="relative w-28 shrink-0">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={it.porcentaje}
                  disabled={!puedeEditar}
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, porcentaje: Number(e.target.value) } : x)))}
                  aria-label="Porcentaje"
                />
                <span className="absolute right-3 top-2 text-sm text-muted-foreground">%</span>
              </div>
              {puedeEditar && (
                <Button variant="ghost" size="icon" type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label="Quitar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {puedeEditar && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="w-fit"
              onClick={() => setItems([...items, { suplemento_id: suplementos[0]?.id ?? '', porcentaje: 0 }])}
            >
              <Plus className="h-4 w-4" /> Ingrediente
            </Button>
          )}
          <div className="mt-2 grid grid-cols-3 gap-3 rounded-md bg-muted/50 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className={cn('font-semibold tabular-nums', Math.abs(total - 100) > 0.5 && 'text-danger')}>{fmtPct(total)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Costo por kg</p>
              <p className="font-semibold tabular-nums">{fmtARS(costoKg)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Materia seca</p>
              <p className="font-semibold tabular-nums">{fmtPct(ms)}</p>
            </div>
          </div>
          {puedeEditar && (
            <form action={action} className="flex items-center gap-3">
              <input type="hidden" name="racion_id" value={racionId} />
              <input type="hidden" name="formula" value={JSON.stringify(items.filter((i) => i.porcentaje > 0))} />
              <Button type="submit" size="sm" disabled={pending || Math.abs(total - 100) > 0.5}>
                Guardar fórmula
              </Button>
              <ActionMessage state={state} />
            </form>
          )}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Consumo estimado por categoría</p>
          <Table>
            <THead>
              <tr>
                <TH>Categoría</TH>
                <TH className="text-right">Cab.</TH>
                <TH className="text-right">g/día</TH>
                <TH className="text-right">kg/mes</TH>
                <TH className="text-right">$/cab/día</TH>
              </tr>
            </THead>
            <TBody>
              {categorias
                .filter((c) => c.consumo_sal_g_dia && cabezas[c.categoria])
                .map((c) => {
                  const g = c.consumo_sal_g_dia ?? 0;
                  const n = cabezas[c.categoria] ?? 0;
                  return (
                    <TR key={c.categoria}>
                      <TD>{c.categoria}</TD>
                      <TD className="text-right tabular-nums">{n}</TD>
                      <TD className="text-right tabular-nums">{g}</TD>
                      <TD className="text-right tabular-nums">{fmtNum((n * g * 30) / 1000)}</TD>
                      <TD className="text-right tabular-nums">{fmtARS((g / 1000) * costoKg)}</TD>
                    </TR>
                  );
                })}
            </TBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
