'use client';

import { useAccion } from '@/components/ui/form-dialog';
import { Check, X } from 'lucide-react';
import { cambiarEstadoProgramada } from '@/app/(dashboard)/sanidad/actions';
import { Section } from '@/components/ui/section';
import { mesLabel } from '@/lib/calc/fechas';
import { fmtDateShort } from '@/lib/calc/format';
import { cn } from '@/lib/utils';

export interface ItemCalendario {
  id: string;
  fecha: number;
  nombre: string;
  lote: string;
  estado: 'PENDIENTE' | 'COMPLETADO' | 'CANCELADO' | 'APLICADO';
  vencida: boolean;
}

function Acciones({ id }: { id: string }) {
  const [, action, pending] = useAccion(cambiarEstadoProgramada);
  return (
    <form action={action} className="flex gap-1">
      <input type="hidden" name="id" value={id} />
      <button name="estado" value="COMPLETADO" disabled={pending} className="rounded p-0.5 text-success hover:bg-success/10" title="Marcar hecha">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button name="estado" value="CANCELADO" disabled={pending} className="rounded p-0.5 text-muted-foreground hover:bg-muted" title="Cancelar">
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
}

export function CalendarioSection({ meses, items, puedeEditar }: { meses: string[]; items: Record<string, ItemCalendario[]>; puedeEditar: boolean }) {
  return (
    <Section title="Calendario sanitario" description="Programado y aplicado, mes a mes">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {meses.map((m) => (
          <div key={m} className="flex min-h-28 flex-col gap-1.5 rounded-md border bg-muted/30 p-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{mesLabel(m)}</p>
            {(items[m] ?? []).map((it) => (
              <div
                key={it.id}
                className={cn(
                  'flex items-start justify-between gap-1 rounded border-l-2 bg-card px-2 py-1 text-xs',
                  it.estado === 'APLICADO' || it.estado === 'COMPLETADO' ? 'border-success' : it.vencida ? 'border-danger' : 'border-warning',
                  it.estado === 'CANCELADO' && 'opacity-50 line-through',
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{it.nombre}</p>
                  <p className="truncate text-muted-foreground">
                    {fmtDateShort(it.fecha)} · {it.lote}
                  </p>
                </div>
                {puedeEditar && it.estado === 'PENDIENTE' && <Acciones id={it.id} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Section>
  );
}
