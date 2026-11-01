'use client';

import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { eliminarEscenario } from '@/app/(dashboard)/proyeccion/actions';
import { Badge } from '@/components/ui/badge';
import { useAccion } from '@/components/ui/form-dialog';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { fmtDate } from '@/lib/calc/format';
import type { Escenario } from '@/lib/db/types';

const RUTA: Record<string, string> = { negocio: 'negocio', peso: 'peso', plan: 'plan', cria: 'cria' };
const TIPO: Record<string, string> = { negocio: 'Negocio', peso: 'Peso', plan: 'Compras y ventas', cria: 'Rodeo de cría' };

function Borrar({ id }: { id: string }) {
  const [, action, pending] = useAccion(eliminarEscenario);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm('¿Eliminar el escenario?')) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button disabled={pending} className="rounded p-1 text-muted-foreground hover:bg-danger/10 hover:text-danger" aria-label="Eliminar">
        <Trash2 className="h-4 w-4" />
      </button>
    </form>
  );
}

export function EscenariosList({
  escenarios,
  activo,
  puedeEditar,
  mostrarTipo,
  resumenes,
}: {
  escenarios: Escenario[];
  activo?: string;
  puedeEditar: boolean;
  mostrarTipo?: boolean;
  resumenes?: Record<string, string>;
}) {
  if (!escenarios.length) return <p className="px-5 py-6 text-center text-sm text-muted-foreground">Todavía no hay escenarios guardados.</p>;
  return (
    <Table>
      <THead>
        <tr>
          <TH>Escenario</TH>
          {mostrarTipo && <TH>Herramienta</TH>}
          <TH>Fecha</TH>
          {resumenes && <TH>Resultado</TH>}
          <TH>Estado</TH>
          {puedeEditar && <TH />}
        </tr>
      </THead>
      <TBody>
        {escenarios.map((e) => (
          <TR key={e.id} className={e.id === activo ? 'bg-primary/5' : undefined}>
            <TD>
              <Link href={`/proyeccion/${RUTA[e.tipo]}?id=${e.id}`} className="font-medium text-primary hover:underline">
                {e.nombre}
              </Link>
            </TD>
            {mostrarTipo && <TD>{TIPO[e.tipo]}</TD>}
            <TD>{fmtDate(e.fecha)}</TD>
            {resumenes && <TD className="tabular-nums">{resumenes[e.id] ?? '—'}</TD>}
            <TD>
              <Badge tone={e.estado === 'CERRADO' ? 'success' : e.estado === 'EN_CURSO' ? 'info' : 'neutral'}>{e.estado}</Badge>
            </TD>
            {puedeEditar && (
              <TD className="text-right">
                <Borrar id={e.id} />
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
