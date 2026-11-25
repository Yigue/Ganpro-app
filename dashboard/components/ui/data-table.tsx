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
  type VisibilityState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { Table, TBody, TD, TH, THead, TR } from './table';

export function DataTable<T>({
  data,
  columns,
  globalFilter,
  pageSize = 25,
  empty = 'Sin datos',columnChooser=false,initialVisibility={},initialSorting=[],getRowId,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  globalFilter?: string;
  pageSize?: number;
  empty?: string;columnChooser?:boolean;initialVisibility?:VisibilityState;initialSorting?:SortingState;getRowId?:(row:T)=>string;
}) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnVisibility,setColumnVisibility]=useState<VisibilityState>(initialVisibility);
  const table = useReactTable({
    getRowId,
    data,
    columns,
    state: { sorting, globalFilter,columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange:setColumnVisibility,
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
      {columnChooser&&<details className="relative self-end px-5 text-sm"><summary className="cursor-pointer">Columnas visibles</summary><div className="absolute right-5 z-20 grid gap-2 rounded border bg-card p-3 shadow-lg">{table.getAllLeafColumns().filter(c=>c.getCanHide()).map(c=><label className="flex gap-2" key={c.id}><input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()}/>{typeof c.columnDef.header==='string'?c.columnDef.header:c.id}</label>)}</div></details>}
      <Table>
        <THead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <TH scope="col" key={h.id} aria-sort={h.column.getIsSorted()==='asc'?'ascending':h.column.getIsSorted()==='desc'?'descending':'none'}>
                  {h.column.getCanSort() ? (
                    <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={h.column.getToggleSortingHandler()}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted()==='asc'?<ChevronUp className="h-3 w-3"/>:h.column.getIsSorted()==='desc'?<ChevronDown className="h-3 w-3"/>:<ArrowUpDown className="h-3 w-3"/>}
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
              <td colSpan={table.getVisibleLeafColumns().length} className="py-8 text-center text-sm text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
        </TBody>
      </Table>
      {(
        <div className="flex items-center justify-between px-3 text-xs text-muted-foreground">
          <span>
            {total} registros · página {table.getState().pagination.pageIndex + 1} de {Math.max(1,table.getPageCount())}
          </span>
          <div className="flex items-center gap-2"><label>Filas <select aria-label="Filas por página" value={table.getState().pagination.pageSize} onChange={e=>table.setPageSize(Number(e.target.value))} className="rounded border bg-card p-1">{[...new Set([10,25,50,100,pageSize])].sort((a,b)=>a-b).map(n=><option value={n} key={n}>{n}</option>)}</select></label>
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
