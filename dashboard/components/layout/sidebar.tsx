'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-items';

interface Props {
  establecimiento: string;
  renspa: string | null;
  usuario: string;
  rol: string;
}

const ROL_LABEL: Record<string, string> = { admin: 'Administración', campo: 'Encargado de campo', asesor: 'Asesor (lectura)' };

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ establecimiento, renspa }: Pick<Props, 'establecimiento' | 'renspa'>) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-foreground">G</div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{establecimiento}</p>
        {renspa && <p className="truncate text-xs text-muted-foreground">RENSPA {renspa}</p>}
      </div>
    </div>
  );
}

function UserBox({ usuario, rol }: Pick<Props, 'usuario' | 'rol'>) {
  return (
    <div className="flex items-center justify-between gap-2 border-t pt-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{usuario}</p>
        <p className="text-xs text-muted-foreground">{ROL_LABEL[rol] ?? rol}</p>
      </div>
      <form action="/auth/signout" method="post">
        <button className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Cerrar sesión">
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export function Sidebar(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r bg-card p-4 lg:flex">
        <Brand {...props} />
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <UserBox {...props} />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <Brand {...props} />
        <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-muted" aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Brand {...props} />
              <button onClick={() => setOpen(false)} className="rounded-md p-2 hover:bg-muted" aria-label="Cerrar menú">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <UserBox {...props} />
          </div>
        </div>
      )}
    </>
  );
}
