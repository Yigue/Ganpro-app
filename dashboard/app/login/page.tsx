import { Card } from '@/components/ui/card';
import { LoginForm } from './login-form';

export const metadata = { title: 'Ingresar' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-xl font-bold text-primary-foreground">G</div>
          <div>
            <h1 className="text-lg font-semibold">GanPro</h1>
            <p className="text-sm text-muted-foreground">Gestión de Loma Alta</p>
          </div>
        </div>
        <LoginForm next={next} />
        <p className="mt-6 text-xs text-muted-foreground">
          El primer usuario queda como administrador. Los siguientes entran como asesor (solo lectura) hasta que el admin les cambie el rol.
        </p>
      </Card>
    </div>
  );
}
