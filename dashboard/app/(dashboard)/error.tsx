'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto mt-12 max-w-lg p-6">
      <h2 className="text-lg font-semibold">No se pudieron cargar los datos</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        Si es la primera vez, revisá que las migraciones de <code>supabase/migrations</code> estén aplicadas.
      </p>
      <Button className="mt-4" onClick={reset}>
        Reintentar
      </Button>
    </Card>
  );
}
