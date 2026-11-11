'use client';
import Link from 'next/link';
import {planificarPastoreo,iniciarPastoreo,finalizarPastoreo} from '@/app/(dashboard)/gestion/actions';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input} from '@/components/ui/input';
import {Section} from '@/components/ui/section';
import {fmtDate,fmtNum} from '@/lib/calc/format';
import {DateField,NumberField,Options} from './fields';
import type {ManagementProps} from './types';
export function Grazing({p}:{p:ManagementProps}){const options=p.data.pastoreo.map(g=>({id:g.id,nombre:`${p.lotes.find(l=>l.id===g.lote_id)?.nombre} → ${p.potreros.find(t=>t.id===g.potrero_id)?.nombre} · ${g.estado}`}));return <Section title="Rotaciones y descanso" description="Planificá con forraje medido, remanente y consumo estimado. Registrar la entrada o salida realiza también el traslado de animales.">
 {p.editable&&<div className="mb-4 flex flex-wrap gap-2"><FormDialog title="Planificar pastoreo" trigger="Planificar rotación" action={planificarPastoreo}>
 <Options name="lote_id" label="Lote ganadero" rows={p.lotes}/><Options name="potrero_id" label="Potrero" rows={p.potreros}/><DateField name="entrada" label="Entrada prevista" future/><DateField name="salida" label="Salida prevista" future/>
 <NumberField name="forraje_kg_ms_ha" label="Forraje disponible (kg MS/ha)"/><NumberField name="remanente_kg_ms_ha" label="Remanente a conservar (kg MS/ha)" zero/>
 <Field label="Consumo estimado (kg MS/EV/día)"><Input name="consumo_ev_dia" type="number" step="0.1" min="0.1" defaultValue="10" required/></Field><Field label="Descanso posterior (días)"><Input name="descanso_dias" type="number" min="1" max="365" defaultValue="30" required/></Field>
 </FormDialog><FormDialog title="Registrar entrada al potrero" trigger="Registrar entrada" action={iniciarPastoreo}><Options name="id" label="Plan" rows={options.filter(o=>p.data.pastoreo.find(g=>g.id===o.id)?.estado==='PLANIFICADO')}/><DateField/></FormDialog>
 <FormDialog title="Registrar salida y descanso" trigger="Registrar salida" action={finalizarPastoreo}><Options name="id" label="Ocupación" rows={options.filter(o=>p.data.pastoreo.find(g=>g.id===o.id)?.estado==='EN_CURSO')}/><Options name="potrero_destino_id" label="Potrero al que se traslada" rows={p.potreros}/><DateField/></FormDialog></div>}
 {p.data.pastoreo.map(g=><div key={g.id} className="mb-3 rounded border p-3 text-sm"><strong>{options.find(o=>o.id===g.id)?.nombre}</strong><p>{fmtDate(g.entrada)} → {fmtDate(g.salida)} · descanso: {g.descanso_dias} días</p><p>Forraje: {fmtNum(g.forraje_kg_ms_ha)} kg MS/ha · remanente: {fmtNum(g.remanente_kg_ms_ha)} · consumo: {g.consumo_ev_dia} kg MS/EV/día</p>{g.salida_real&&<p>Descanso hasta {fmtDate(g.salida_real+g.descanso_dias*86400000)}</p>}<Link className="underline" href={`/mapa?potrero=${g.potrero_id}`}>Ver potrero en el mapa</Link></div>)}
 </Section>;}
