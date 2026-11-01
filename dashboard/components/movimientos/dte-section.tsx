'use client';

import { useAccion } from '@/components/ui/form-dialog';
import { actualizarEstadoDte } from '@/app/(dashboard)/movimientos/actions';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Section } from '@/components/ui/section';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { fmtARS, fmtDate } from '@/lib/calc/format';
import type { MovimientoFinanciero } from '@/lib/db/types';

const TONE: Record<string, BadgeTone> = { EMITIDO: 'success', ANULADO: 'danger', RETORNO: 'warning' };

function EstadoSelect({ mov }: { mov: MovimientoFinanciero }) {
  const [, action, pending] = useAccion(actualizarEstadoDte);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={mov.id} />
      <select
        name="dte_estado"
        defaultValue={mov.dte_estado ?? 'EMITIDO'}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border bg-card px-2 py-1 text-xs"
        aria-label="Estado del DTE"
      >
        <option>EMITIDO</option>
        <option>ANULADO</option>
        <option>RETORNO</option>
      </select>
    </form>
  );
}

export function DteSection({ movs, puedeEditar }: { movs: MovimientoFinanciero[]; puedeEditar: boolean }) {
  return (
    <Section title="DTE" description="Documentos de tránsito de ventas y compras. Se emiten en SIGSA; acá se guarda el número y su estado." flush>
      {movs.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sin DTE registrados.</p>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Fecha</TH>
              <TH>N° DTE</TH>
              <TH>Operación</TH>
              <TH className="text-right">Cabezas</TH>
              <TH>RENSPA destino</TH>
              <TH className="text-right">Monto</TH>
              <TH>Estado</TH>
            </tr>
          </THead>
          <TBody>
            {movs.map((m) => (
              <TR key={m.id}>
                <TD>{fmtDate(m.fecha)}</TD>
                <TD className="font-mono text-xs">{m.dte_numero}</TD>
                <TD>{m.descripcion ?? m.categoria}</TD>
                <TD className="text-right tabular-nums">{m.cabezas ?? '—'}</TD>
                <TD className="font-mono text-xs">{m.renspa_destino ?? '—'}</TD>
                <TD className="text-right tabular-nums">{fmtARS(m.monto)}</TD>
                <TD>{puedeEditar ? <EstadoSelect mov={m} /> : <Badge tone={TONE[m.dte_estado ?? 'EMITIDO']}>{m.dte_estado ?? 'EMITIDO'}</Badge>}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Section>
  );
}
