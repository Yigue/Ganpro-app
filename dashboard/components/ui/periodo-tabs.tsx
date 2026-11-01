import Link from 'next/link';
import { cn } from '@/lib/utils';

export function PeriodoTabs({ opciones, activa }: { opciones: { href: string; label: string; key: string }[]; activa: string }) {
  return (
    <div className="inline-flex rounded-md border bg-card p-0.5">
      {opciones.map((o) => (
        <Link
          key={o.key}
          href={o.href}
          className={cn('rounded px-3 py-1.5 text-sm font-medium', o.key === activa ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
