import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { getSessionPerfil } from '@/lib/db/auth';
import { getEstablecimiento } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [perfil, est] = await Promise.all([getSessionPerfil(), getEstablecimiento()]);
  if (!perfil) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar
        establecimiento={est.nombre}
        renspa={est.renspa}
        usuario={perfil.nombre ?? perfil.email ?? 'Usuario'}
        rol={perfil.rol}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
