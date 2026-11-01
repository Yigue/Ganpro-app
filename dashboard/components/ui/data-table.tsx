'use client';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { Table, TBody, TD, TH, THead, TR } from './table';

export function DataTable<T>({
  data,
  columns,
  globalFilter,
  pageSize = 25,
  empty = 'Sin datos',
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  globalFilter?: string;
  pageSize?: number;
  empty?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <THead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <TH key={h.id}>
                  {h.column.getCanSort() ? (
                    <button className="inline-flex items-center gap-1 uppercase" onClick={h.column.getToggleSortingHandler()}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    flexRender(h.column.columnDef.header, h.getContext())
                  )}
                </TH>
              ))}
            </tr>
          ))}
        </THead>
        <TBody>
          {rows.length ? (
            rows.map((r) => (
              <TR key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <TD key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TD>
                ))}
              </TR>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
        </TBody>
      </Table>
      {total > pageSize && (
        <div className="flex items-center justify-between px-3 text-xs text-muted-foreground">
          <span>
            {total} registros · página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
