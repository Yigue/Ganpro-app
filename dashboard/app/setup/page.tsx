import { Card } from '@/components/ui/card';

export const metadata = { title: 'Configurar' };

const pasos = [
  'Creá un proyecto en supabase.com.',
  'En el SQL Editor, corré en orden los archivos de dashboard/supabase/migrations/. Para una demo, corré también supabase/seed.sql.',
  'En Vercel, importá el repo con Root Directory = dashboard.',
  'Cargá las variables NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY y SYNC_API_KEY (ver .env.example).',
  'Volvé a desplegar y creá tu usuario: el primero queda como administrador.',
];

export default function SetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-xl p-6">
        <h1 className="text-xl font-semibold">Falta conectar Supabase</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          El dashboard lee las mismas tablas que sincroniza la app GanPro. Para arrancar:
        </p>
        <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 text-sm">
          {pasos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
