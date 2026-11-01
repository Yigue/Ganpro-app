'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Select } from '@/components/ui/input';
import { fmtDate } from '@/lib/calc/format';

export interface FilaHistorial {
  fecha: number;
  tipo: string;
  animal: string;
  detalle: string;
  dte: string | null;
}

const TONE: Record<string, BadgeTone> = { VENTA: 'info', MUERTE: 'danger', TRASLADO: 'neutral', COMPRA: 'warning', NACIMIENTO: 'success' };

const columns: ColumnDef<FilaHistorial, unknown>[] = [
  { accessorKey: 'fecha', header: 'Fecha', cell: ({ getValue }) => fmtDate(getValue() as number) },
  { accessorKey: 'tipo', header: 'Tipo', cell: ({ getValue }) => <Badge tone={TONE[getValue() as string] ?? 'neutral'}>{getValue() as string}</Badge> },
  { accessorKey: 'animal', header: 'Animal' },
  { accessorKey: 'detalle', header: 'Detalle', cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span> },
  { accessorKey: 'dte', header: 'DTE', cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span> },
];

export function HistorialTable({ filas }: { filas: FilaHistorial[] }) {
  const [tipo, setTipo] = useState('');
  const data = useMemo(() => (tipo ? filas.filter((f) => f.tipo === tipo) : filas), [filas, tipo]);
  return (
    <div className="flex flex-col gap-3">
      <div className="px-5">
        <Select value={tipo} onChange={(e) => setTipo(e.target.value)} className="sm:w-56" aria-label="Tipo">
          <option value="">Todos los tipos</option>
          {Object.keys(TONE).map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
      </div>
      <DataTable data={data} columns={columns} pageSize={15} empty="Sin movimientos" />
    </div>
  );
}
