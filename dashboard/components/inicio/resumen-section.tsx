import Link from 'next/link';
import { Section } from '@/components/ui/section';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { fmtNum } from '@/lib/calc/format';

export interface FilaCategoria {
  categoria: string;
  cabezas: number;
  ev: number;
  pesoPromedio: number | null;
}

export function ResumenCategoriasSection({ filas }: { filas: FilaCategoria[] }) {
  return (
    <Section title="Stock actual" description="Por categoría" actions={<Link href="/stock" className="text-xs font-medium text-primary hover:underline">Ver stock</Link>} flush>
      <Table>
        <THead>
          <tr>
            <TH>Categoría</TH>
            <TH className="text-right">Cabezas</TH>
            <TH className="text-right">EV</TH>
            <TH className="text-right">Peso prom.</TH>
          </tr>
        </THead>
        <TBody>
          {filas.map((f) => (
            <TR key={f.categoria}>
              <TD className="font-medium">{f.categoria}</TD>
              <TD className="text-right tabular-nums">{fmtNum(f.cabezas)}</TD>
              <TD className="text-right tabular-nums">{fmtNum(f.ev, 1)}</TD>
              <TD className="text-right tabular-nums">{f.pesoPromedio ? `${fmtNum(f.pesoPromedio)} kg` : '—'}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Section>
  );
}
