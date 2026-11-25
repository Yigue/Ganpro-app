import {CohortTable} from '@/components/reproduccion/cohort-table';
import { DonutChartView } from '@/components/charts/charts';
import { PrenezTable } from '@/components/reproduccion/prenez-table';
import { RevisacionForm,ServicioForm } from '@/components/reproduccion/repro-forms';
import { PageHeader,Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { fmtDate,fmtNum,fmtPct } from '@/lib/calc/format';
import { ccPromedio,prenezPor } from '@/lib/calc/reproduccion';
import type { PageData } from '@/lib/db/page-reproduccion';
import Link from 'next/link';
export function ReproduccionView0({data}:{data:PageData}){const {lotes,animalsById,loteNombre,ultima,inicioTemporada,listaTactos,vientres,toros,ccServicio,destetados,kgDestetados,cohort,unlinkedWeanings,tercios,editable,anio}=data;return <><Link className="text-sm text-primary underline" href="/gestion?vista=reproduccion">Seguimiento de servicio, tacto, parto y destete</Link>
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
<p className="text-sm text-muted-foreground">{cohort.registrados} ciclos registrados / {cohort.declarados??'sin cantidad declarada'} vientres. {cohort.solapados?'Hay madres en más de un servicio: consultá cada cohorte por separado.':'Los porcentajes de destete sobre vientres declarados son provisionales mientras falten ciclos.'}</p>
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Preñez"
          value={fmtPct(cohort.pctPrenez)}
          hint={`${cohort.prenadas} de ${cohort.tactadas} tactadas en ciclos registrados`}
          tone="default"
        />
        <StatCard label="Vientres declarados" value={vientres ?? '—'} hint={toros ? `${toros} toros` : undefined} />
        <StatCard label="Toro / vientre" value={vientres && toros ? fmtPct((toros / vientres) * 100) : '—'} hint="Recomendado 3 a 4 %" />
        <StatCard label="CC al servicio" value={fmtNum(ccPromedio(ccServicio), 2)} hint={`${ccServicio.length} evaluaciones`} />
        <StatCard
          label="Destete"
          value={fmtPct(cohort.pctDestete)}
          hint={`${destetados} destetes registrados · ${cohort.pesosFaltantes?'peso incompleto':`${fmtNum(kgDestetados)} kg registrados`}`}
        />
      </div>
<p className="text-sm text-muted-foreground">{unlinkedWeanings} animales con destete registrado sin vínculo a un ciclo; requieren conciliación antes de atribuirlos a un servicio.</p>
<CohortTable data={data}/>
<div className="grid gap-6 lg:grid-cols-3">
        <Section title="Tactos por lote actual" className="lg:col-span-2" flush>
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
        <Section title="Tactos por categoría actual" flush>
          <PrenezTable titulo="Categoría" filas={prenezPor(listaTactos, animalsById, (a) => a.categoria)} />
        </Section>
        <Section title="Paternidad"><p className="text-sm text-muted-foreground">La paternidad se registra en cada ciclo. Compartir un lote con un toro no permite atribuirle todas las preñeces.</p></Section>
      </div></>;}
