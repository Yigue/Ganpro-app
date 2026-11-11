import { DonutChartView } from '@/components/charts/charts';
import { PrenezTable } from '@/components/reproduccion/prenez-table';
import { RevisacionForm,ServicioForm } from '@/components/reproduccion/repro-forms';
import { PageHeader,Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { fmtDate,fmtNum,fmtPct } from '@/lib/calc/format';
import { ccPromedio,porcentaje,prenezPor,prenezPorToro } from '@/lib/calc/reproduccion';
import type { PageData } from '@/lib/db/page-reproduccion';
import Link from 'next/link';
export function ReproduccionView0({data}:{data:PageData}){const {lotes,animalsById,loteNombre,ultima,delaTemporada,inicioTemporada,listaTactos,general,vientres,toros,ccServicio,destetados,kgDestetados,tercios,editable,anio}=data;return <><Link className="text-sm text-primary underline" href="/gestion?vista=reproduccion">Seguimiento de servicio, tacto, parto y destete</Link>
<PageHeader
        title="Reproducción"
        description={ultima ? `Temporada ${ultima} · toros desde el ${fmtDate(inicioTemporada)}` : 'Cargá la temporada de servicio para calcular la preñez por toro'}
        actions={
          editable && (
            <>
              <RevisacionForm />
              <ServicioForm lotes={lotes} temporada={`${anio}-${String(anio + 1).slice(2)}`} />
            </>
          )
        }
      />
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Preñez"
          value={fmtPct(general.pct)}
          hint={`${general.prenadas} de ${general.tactadas} tactadas`}
          tone={general.pct == null ? 'default' : general.pct >= 85 ? 'success' : general.pct >= 75 ? 'warning' : 'danger'}
        />
        <StatCard label="Vientres entorados" value={vientres ?? '—'} hint={toros ? `${toros} toros` : undefined} />
        <StatCard label="Toro / vientre" value={vientres && toros ? fmtPct((toros / vientres) * 100) : '—'} hint="Recomendado 3 a 4 %" />
        <StatCard label="CC al servicio" value={fmtNum(ccPromedio(ccServicio), 2)} hint={`${ccServicio.length} evaluaciones`} />
        <StatCard
          label="Destete"
          value={fmtPct(porcentaje(destetados, vientres))}
          hint={vientres ? `Estimado · ${fmtNum(kgDestetados / vientres)} kg por vaca entorada` : 'Necesita vientres entorados'}
        />
      </div>
<div className="grid gap-6 lg:grid-cols-3">
        <Section title="Preñez por lote" className="lg:col-span-2" flush>
          <PrenezTable titulo="Lote" filas={prenezPor(listaTactos, animalsById, (a) => loteNombre(a.lote_id))} />
        </Section>
        <Section title="Cabeza, cuerpo y cola" description="Si el tacto lo anota en las notas">
          {tercios.some((t) => t.value) ? (
            <DonutChartView data={tercios} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Agregá &quot;cabeza&quot;, &quot;cuerpo&quot; o &quot;cola&quot; en las notas del tacto.</p>
          )}
        </Section>
      </div>
<div className="grid gap-6 lg:grid-cols-2">
        <Section title="Preñez por categoría" flush>
          <PrenezTable titulo="Categoría" filas={prenezPor(listaTactos, animalsById, (a) => a.categoria)} />
        </Section>
        <Section title="Preñez por toro" description="Según el lote donde estuvo cada toro" flush>
          <PrenezTable titulo="Toro" filas={prenezPorToro(listaTactos, animalsById, delaTemporada)} />
        </Section>
      </div></>;}
