'use client';

import { confirmarRecategorizacion } from '@/app/(dashboard)/stock/actions';
import { Button } from '@/components/ui/button';
import { ActionMessage, useAccion } from '@/components/ui/form-dialog';
import { Section } from '@/components/ui/section';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { fmtNum } from '@/lib/calc/format';

export interface FilaRecat {
  id: string;
  caravana: string;
  de: string;
  a: string;
  edadMeses: number;
}

export function RecategorizacionSection({ filas, puedeEditar }: { filas: FilaRecat[]; puedeEditar: boolean }) {
  const [state, action, pending] = useAccion(confirmarRecategorizacion);
  if (!filas.length) return null;
  return (
    <div id="recategorizacion">
      <Section
        title="Recategorización por edad"
        description={`${filas.length} animales según las edades de Configuración. Destildá los que no correspondan y confirmá.`}
        flush
      >
        <form action={action}>
          <div className="max-h-96 overflow-y-auto">
          <Table>
            <THead>
              <tr>
                <TH className="w-10" />
                <TH>Caravana</TH>
                <TH>Edad</TH>
                <TH>Cambio</TH>
              </tr>
            </THead>
            <TBody>
              {filas.map((f) => (
                <TR key={f.id}>
                  <TD>
                    <input type="checkbox" name="cambio" value={`${f.id}|${f.a}`} defaultChecked disabled={!puedeEditar} />
                  </TD>
                  <TD className="font-medium">{f.caravana}</TD>
                  <TD>{fmtNum(f.edadMeses)} meses</TD>
                  <TD>
                    {f.de} → <span className="font-medium text-primary">{f.a}</span>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 pt-3">
            <ActionMessage state={state} />
            {puedeEditar && (
              <Button type="submit" size="sm" disabled={pending} className="ml-auto">
                Confirmar seleccionados
              </Button>
            )}
          </div>
        </form>
      </Section>
    </div>
  );
}
