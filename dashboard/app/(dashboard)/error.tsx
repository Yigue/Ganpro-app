'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto mt-12 max-w-lg p-6">
      <h2 className="text-lg font-semibold">No se pudieron cargar los datos</h2>
      <p className="mt-2 text-sm text-muted-foreground">Ocurrió un problema al cargar la información. Probá nuevamente en unos momentos.</p>
      {error.digest && <p className="mt-2 text-xs text-muted-foreground">Referencia: {error.digest}</p>}
      <Button className="mt-4" onClick={reset}>
        Reintentar
      </Button>
    </Card>
  );
}
