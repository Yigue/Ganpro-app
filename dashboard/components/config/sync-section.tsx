'use client';

import { useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SyncUrl({ base, clave }: { base: string; clave: string | null }) {
  const [ver, setVer] = useState(false);
  const [copiado, setCopiado] = useState(false);
  if (!clave) {
    return <p className="text-sm text-warning">Falta la variable SYNC_API_KEY en Vercel. Sin ella la app no puede sincronizar.</p>;
  }
  const url = `${base}/api/k/${clave}`;
  const visible = ver ? url : `${base}/api/k/${'•'.repeat(12)}`;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">En la app GanPro: Ajustes → URL de sincronización. Pegá esta dirección:</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 text-xs">{visible}</code>
        <Button variant="outline" size="icon" type="button" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar' : 'Mostrar'}>
          {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          type="button"
          aria-label="Copiar"
          onClick={async () => {
            await navigator.clipboard.writeText(url);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      {copiado && <p className="text-xs text-success">Copiado</p>}
    </div>
  );
}
