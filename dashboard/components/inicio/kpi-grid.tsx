import { Beef, CircleDollarSign, Gauge, HeartHandshake, Scale, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { fmtARS, fmtCompact, fmtNum, fmtPct, fmtUSD } from '@/lib/calc/format';

export interface KpisInicio {
  cabezas: number;
  ev: number;
  cargaEvHa: number | null;
  hectareas: number | null;
  prenezPct: number | null;
  tactadas: number;
  margenBruto: number;
  ejercicio: string;
  valorRodeo: number | null;
  valorRodeoUSD: number | null;
}

export function KpiGrid({ k }: { k: KpisInicio }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Cabezas" value={fmtNum(k.cabezas)} hint="Animales activos" icon={<Beef />} />
      <StatCard label="EV" value={fmtNum(k.ev, 1)} hint="Equivalentes vaca" icon={<Scale />} />
      <StatCard
        label="Carga"
        value={k.cargaEvHa != null ? `${fmtNum(k.cargaEvHa, 2)} EV/ha` : '—'}
        hint={k.hectareas ? `${fmtNum(k.hectareas)} ha ganaderas` : 'Cargá las hectáreas en Configuración'}
        icon={<Gauge />}
      />
      <StatCard
        label="Preñez"
        value={fmtPct(k.prenezPct)}
        hint={`${k.tactadas} vientres tactados (últimos 12 meses)`}
        tone={k.prenezPct == null ? 'default' : k.prenezPct >= 85 ? 'success' : k.prenezPct >= 75 ? 'warning' : 'danger'}
        icon={<HeartHandshake />}
      />
      <StatCard
        label="Margen parcial"
        value={fmtCompact(k.margenBruto)}
        hint={`Ejercicio ${k.ejercicio} · sin ajuste de inventario`}
        tone={k.margenBruto >= 0 ? 'success' : 'danger'}
        icon={<TrendingUp />}
      />
      <StatCard
        label="Valor del rodeo"
        value={fmtCompact(k.valorRodeo)}
        hint={k.valorRodeo == null ? 'Faltan pesos o precios por categoría' : `Estimado · ${fmtARS(k.valorRodeo)} · ${fmtUSD(k.valorRodeoUSD)}`}
        icon={<CircleDollarSign />}
      />
    </div>
  );
}
