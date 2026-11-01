import Link from 'next/link';
import { AlertTriangle, CalendarClock, PackageMinus, RefreshCcw, Scale, Shuffle } from 'lucide-react';
import { Section } from '@/components/ui/section';
import { cn } from '@/lib/utils';

export interface Alerta {
  tipo: 'sanidad' | 'sigsa' | 'insumo' | 'pesada' | 'recategorizacion' | 'sync';
  titulo: string;
  detalle: string;
  href: string;
  nivel: 'alta' | 'media';
}

const ICON = {
  sanidad: CalendarClock,
  sigsa: Shuffle,
  insumo: PackageMinus,
  pesada: Scale,
  recategorizacion: RefreshCcw,
  sync: AlertTriangle,
};

export function AlertasSection({ alertas }: { alertas: Alerta[] }) {
  return (
    <Section title="Alertas" description="Lo que conviene resolver esta semana">
      {alertas.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Todo en orden.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alertas.map((a, i) => {
            const Icon = ICON[a.tipo];
            return (
              <li key={i}>
                <Link href={a.href} className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50">
                  <span
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      a.nivel === 'alta' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground">{a.detalle}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
