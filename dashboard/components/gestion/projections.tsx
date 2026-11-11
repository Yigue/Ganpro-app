import Link from 'next/link';
import {Section} from '@/components/ui/section';
import {fmtARS,fmtDate,fmtNum} from '@/lib/calc/format';
import type {ManagementProps} from './types';
export function Projections({p}:{p:ManagementProps}){return <Section title="Planificado frente a realizado" description="Comparación por línea vinculada desde Movimientos. Las operaciones aún no registradas se mantienen pendientes; no se supone que se realizaron.">
 {p.lineas.map(l=>{const real=p.reales.find(d=>d.id===l.movimiento_id);return <div key={l.id} className="mb-3 rounded border p-3 text-sm"><strong>{p.escenarios.find(e=>e.id===l.escenario_id)?.nombre} · {l.tipo} · {l.categoria}</strong><p>Plan: {l.mes} · {l.cabezas} cabezas · {fmtNum((l.kg??0)*l.cabezas)} kg · {fmtARS(l.monto)}</p>{real?<><p>Real: {fmtDate(real.fecha)} · {fmtARS(Number(real.monto))}</p><p>Real: {real.cabezas??'—'} cabezas · {fmtNum(real.kg)} kg · {real.kg?fmtARS(real.monto/real.kg):'—'} por kg</p><p>Desvío de cabezas: {real.cabezas==null?'—':real.cabezas-l.cabezas} · kg: {real.kg==null?'—':fmtNum(real.kg-(l.kg??0)*l.cabezas)} · precio/kg: {real.kg?fmtARS(real.monto/real.kg-(l.precio_kg??0)):'—'}</p><p>Desvío de importe: {fmtARS(Number(real.monto)-(l.monto??0))}</p></>:<Link className="underline" href={`/movimientos?linea=${l.id}`}>{l.movimiento_id?'Ver operación fuera del corte seleccionado':'Registrar operación real'}</Link>}</div>;})}
 {!p.lineas.length&&<Link href="/proyeccion/plan" className="underline">Crear un plan de compras y ventas</Link>}
 </Section>;}
