'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { Input, Select } from '@/components/ui/input';
import { fmtDate, fmtNum } from '@/lib/calc/format';

export interface FilaStock {
  id: string;
  caravana: string;
  rfid: string | null;
  categoria: string;
  raza: string | null;
  sexo: string;
  estado: string;
  lote: string | null;
  potrero: string | null;
  peso: number | null;
  edadMeses: number | null;
  gdp: number | null;
  ultimaPesada: number | null;
  pesadaAtrasada: boolean;
  carenciaHasta: number | null;
}

const ESTADO_TONE: Record<string, BadgeTone> = { ACTIVO: 'success', VENDIDO: 'info', MUERTO: 'danger', DESCARTE: 'warning' };

const columns: ColumnDef<FilaStock, unknown>[] = [
  {
    accessorKey: 'caravana',
    header: 'Caravana',
    cell: ({ row }) => (
      <Link href={`/stock/${row.original.id}`} className="font-medium text-primary hover:underline">
        {row.original.caravana}
      </Link>
    ),
  },
  { accessorKey: 'rfid', header: 'RFID', cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as string) ?? '—'}</span> },
  { accessorKey: 'categoria', header: 'Categoría' },
  { accessorKey: 'raza', header: 'Raza', cell: ({ getValue }) => (getValue() as string) ?? '—' },
  { accessorKey: 'lote', header: 'Lote', cell: ({ getValue }) => (getValue() as string) ?? '—' },
  { accessorKey: 'potrero', header: 'Potrero', cell: ({ getValue }) => (getValue() as string) ?? '—' },
  {
    accessorKey: 'peso',
    header: 'Peso',
    cell: ({ getValue }) => <span className="tabular-nums">{getValue() ? `${fmtNum(getValue() as number)} kg` : '—'}</span>,
  },
  {
    accessorKey: 'gdp',
    header: 'GDP',
    cell: ({ getValue }) => {
      const v = getValue() as number | null;
      return <span className="tabular-nums">{v == null ? '—' : `${fmtNum(v, 2)} kg/d`}</span>;
    },
  },
  {
    accessorKey: 'edadMeses',
    header: 'Edad',
    cell: ({ getValue }) => {
      const m = getValue() as number | null;
      return m == null ? '—' : m >= 24 ? `${fmtNum(m / 12, 1)} años` : `${fmtNum(m)} meses`;
    },
  },
  {
    accessorKey: 'ultimaPesada',
    header: 'Últ. pesada',
    cell: ({ row }) => (
      <span className={row.original.pesadaAtrasada ? 'text-warning' : undefined}>{fmtDate(row.original.ultimaPesada)}</span>
    ),
  },
  {
    accessorKey: 'estado',
    header: 'Estado',
    cell: ({ row }) => (
      <div className="flex gap-1">
        <Badge tone={ESTADO_TONE[row.original.estado] ?? 'neutral'}>{row.original.estado}</Badge>
        {row.original.carenciaHasta && <Badge tone="warning">Carencia</Badge>}
      </div>
    ),
  },
];

function opciones(filas: FilaStock[], key: keyof FilaStock) {
  return [...new Set(filas.map((f) => f[key]).filter(Boolean) as string[])].sort();
}

export function StockTable({ filas, soloPesadaAtrasada }: { filas: FilaStock[]; soloPesadaAtrasada?: boolean }) {
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [raza, setRaza] = useState('');
  const [potrero, setPotrero] = useState('');
  const [estado, setEstado] = useState('ACTIVO');
  const [atrasadas, setAtrasadas] = useState(Boolean(soloPesadaAtrasada));

  const filtradas = useMemo(() => {
    const term = q.trim().toLowerCase();
    return filas.filter(
      (f) =>
        (!categoria || f.categoria === categoria) &&
        (!raza || f.raza === raza) &&
        (!potrero || f.potrero === potrero) &&
        (!estado || f.estado === estado) &&
        (!atrasadas || f.pesadaAtrasada) &&
        (!term || f.caravana.toLowerCase().includes(term) || (f.rfid ?? '').includes(term)),
    );
  }, [filas, q, categoria, raza, potrero, estado, atrasadas]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 px-5 sm:grid-cols-2 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar caravana o RFID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {opciones(filas, 'categoria').map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
        <Select value={raza} onChange={(e) => setRaza(e.target.value)} aria-label="Raza">
          <option value="">Todas las razas</option>
          {opciones(filas, 'raza').map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
        <Select value={potrero} onChange={(e) => setPotrero(e.target.value)} aria-label="Potrero">
          <option value="">Todos los potreros</option>
          {opciones(filas, 'potrero').map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
        <Select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
          <option value="">Todos los estados</option>
          <option>ACTIVO</option>
          <option>VENDIDO</option>
          <option>MUERTO</option>
          <option>DESCARTE</option>
        </Select>
      </div>
      <div className="flex items-center justify-between px-5 text-sm text-muted-foreground">
        <span>{filtradas.length} animales</span>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={atrasadas} onChange={(e) => setAtrasadas(e.target.checked)} />
          Solo pesadas atrasadas
        </label>
      </div>
      <DataTable data={filtradas} columns={columns} empty="No hay animales con esos filtros" />
    </div>
  );
}
