import { Simulador } from '@/components/costos/simulador';
import { Section } from '@/components/ui/section';
import type { PageData } from '@/lib/db/page-costos';
export function CostosView1({data}:{data:PageData}){const {directos,estructura,vientres,pr,pesoTerneros,anual}=data;return <><Section title="Simulador de cría" description="Cuánto cambia el costo por kg y por ternero si mejora la preñez o sube la carga. Los costos se anualizan.">
        <Simulador
          base={{
            vientres,
            prenezPct: Math.round(pr.pct ?? 85),
            destetePct: 92,
            pesoDesteteKg: Math.round(pesoTerneros.length ? pesoTerneros.reduce((a, t) => a + (t.peso_actual ?? 0), 0) / pesoTerneros.length : 180),
            costoDirectoVientre: Math.round(vientres ? anual(directos) / vientres : 0),
            estructura: Math.round(anual(estructura)),
          }}
        />
      </Section></>;}
