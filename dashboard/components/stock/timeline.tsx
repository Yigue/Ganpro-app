import { Badge, type BadgeTone } from '@/components/ui/badge';
import { fmtDate } from '@/lib/calc/format';

export interface ItemTimeline {
  fecha: number;
  tipo: string;
  titulo: string;
  detalle?: string | null;
}

const TONE: Record<string, BadgeTone> = {
  PESAJE: 'info',
  TACTO: 'primary',
  SANIDAD: 'success',
  MOVIMIENTO: 'neutral',
  MUERTE: 'danger',
  VENTA: 'warning',
};

export function Timeline({ items }: { items: ItemTimeline[] }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted-foreground">Sin eventos registrados.</p>;
  return (
    <ol className="relative flex flex-col gap-4 border-l pl-5">
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={TONE[it.tipo] ?? 'neutral'}>{it.tipo}</Badge>
            <span className="text-sm font-medium">{it.titulo}</span>
            <span className="text-xs text-muted-foreground">{fmtDate(it.fecha)}</span>
          </div>
          {it.detalle && <p className="mt-1 text-xs text-muted-foreground">{it.detalle}</p>}
        </li>
      ))}
    </ol>
  );
}
