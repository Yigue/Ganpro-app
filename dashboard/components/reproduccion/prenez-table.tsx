import { Progress } from '@/components/ui/progress';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { fmtPct } from '@/lib/calc/format';
import type { Prenez } from '@/lib/calc/reproduccion';

export function PrenezTable({ filas, titulo }: { filas: Prenez[]; titulo: string }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>{titulo}</TH>
          <TH className="text-right">Tactadas</TH>
          <TH className="text-right">Preñadas</TH>
          <TH className="w-40">Preñez</TH>
        </tr>
      </THead>
      <TBody>
        {filas.length === 0 && (
          <tr>
            <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
              Sin tactos en el período
            </td>
          </tr>
        )}
        {filas.map((f) => (
          <TR key={f.grupo}>
            <TD className="font-medium">{f.grupo}</TD>
            <TD className="text-right tabular-nums">{f.tactadas}</TD>
            <TD className="text-right tabular-nums">{f.prenadas}</TD>
            <TD>
              <div className="flex items-center gap-2">
                <Progress value={f.pct ?? 0} tone={(f.pct ?? 0) >= 85 ? 'success' : (f.pct ?? 0) >= 75 ? 'warning' : 'danger'} />
                <span className="w-14 text-right text-xs tabular-nums">{fmtPct(f.pct, 0)}</span>
              </div>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
