'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/proyeccion', label: 'Resumen' },
  { href: '/proyeccion/negocio', label: 'Negocio' },
  { href: '/proyeccion/precios', label: 'Precios' },
  { href: '/proyeccion/peso', label: 'Peso' },
  { href: '/proyeccion/plan', label: 'Compras y ventas' },
  { href: '/proyeccion/cria', label: 'Rodeo de cría' },
];

export function ProyeccionTabs() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <div className="inline-flex gap-1 rounded-md border bg-card p-1">
        {TABS.map((t) => {
          const active = t.href === '/proyeccion' ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
