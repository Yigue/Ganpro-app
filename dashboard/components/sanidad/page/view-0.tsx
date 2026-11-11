import { CalendarioSection } from '@/components/sanidad/calendario-section';
import { AplicacionForm,ProductoForm,ProgramarForm } from '@/components/sanidad/sanidad-forms';
import { PageHeader } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { fmtARS } from '@/lib/calc/format';
import type { PageData } from '@/lib/db/page-sanidad';
export function SanidadView0({data}:{data:PageData}){const {catalogo,lotes,logs,management,ahora,ejercicio,carencias,proximas,costoEjercicio,meses,items,editable,programadas}=data;return <><PageHeader
        title="Sanidad"
        description="Plan sanitario, aplicaciones y períodos de retiro"
        actions={
          editable && (
            <>
              <ProductoForm />
              <ProgramarForm catalogo={catalogo} lotes={lotes} />
              <AplicacionForm management={management} catalogo={catalogo} lotes={lotes} programadas={programadas} />
            </>
          )
        }
      />
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Próximos 30 días" value={proximas.length} hint="Operaciones programadas" tone={proximas.some((p) => p.fecha_programada < ahora) ? 'danger' : 'default'} />
        <StatCard label="En carencia" value={carencias.length} hint="Animales que no se pueden vender" tone={carencias.length ? 'warning' : 'default'} />
        <StatCard label="Aplicaciones" value={logs.filter((l) => l.fecha_aplicacion >= ejercicio.inicio).length} hint={`Ejercicio ${ejercicio.label}`} />
        <StatCard label="Costo sanitario" value={fmtARS(costoEjercicio)} hint={`${logs.filter(l=>l.fecha_aplicacion>=ejercicio.inicio&&l.costo_total==null).length} aplicaciones sin costo conservado · suma de costos conocidos`} />
      </div>
<CalendarioSection context={{catalogo,lotes,management}} meses={meses} items={items} puedeEditar={editable} /></>;}
