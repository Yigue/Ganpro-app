'use client';
import {crearCiclo,registrarEtapa} from '@/app/(dashboard)/gestion/actions';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input,Select} from '@/components/ui/input';
import {Section} from '@/components/ui/section';
import {fmtDate} from '@/lib/calc/format';
import {DateField,Options} from './fields';
import type {ManagementProps} from './types';
export function Reproduction({p}:{p:ManagementProps}){const name=(id:string|null)=>p.animals.find(a=>a.id===id)?.id_caravana??'Sin informar';return <Section title="Servicio → tacto → parto → destete" description="Seguimiento individual vinculado al servicio existente. El parto crea la cría en stock y guarda su madre y padre; el destete guarda la pesada.">
 {p.editable&&<div className="mb-4 flex flex-wrap gap-2"><FormDialog title="Iniciar ciclo reproductivo" trigger="Iniciar ciclo" action={crearCiclo}>
 <Options name="madre_id" label="Madre" rows={p.animals.filter(a=>a.estado==='ACTIVO'&&a.sexo==='H'&&['Vaca','Vaquillona'].includes(a.categoria)).map(a=>({id:a.id,nombre:a.id_caravana}))}/>
 <Options name="padre_id" label="Padre (solo si se conoce)" rows={p.animals.filter(a=>a.sexo==='M'&&a.categoria==='Toro').map(a=>({id:a.id,nombre:a.id_caravana}))} optional/>
 <Options name="servicio_id" label="Servicio registrado" rows={p.servicios.map(s=>({id:s.id,nombre:`${s.temporada} · ${p.lotes.find(l=>l.id===s.lote_id)?.nombre}`}))}/><DateField label="Fecha del servicio individual"/>
 </FormDialog><FormDialog title="Registrar etapa reproductiva" trigger="Tacto / parto / destete" action={registrarEtapa}>
 <Options name="id" label="Ciclo" rows={p.data.ciclos.filter(c=>!['VACIA','DESTETADA','PERDIDA'].includes(c.estado)).map(c=>({id:c.id,nombre:`${name(c.madre_id)} · ${c.estado}`}))}/>
 <Field label="Etapa"><Select name="etapa"><option>TACTO</option><option>PARTO</option><option>DESTETE</option><option>PERDIDA</option></Select></Field><DateField/>
 <Field label="Resultado del tacto"><Select name="resultado"><option>PRENADA</option><option>VACIA</option></Select></Field>
 <Field label="Caravana de la cría (parto)"><Input name="caravana"/></Field><Field label="Sexo de la cría"><Select name="sexo"><option value="H">Hembra</option><option value="M">Macho</option></Select></Field>
 <Field label="Peso al nacer o destetar (kg)"><Input name="peso" type="number" step="0.01" min="0.01"/></Field>
 </FormDialog></div>}
 <div className="grid gap-3 md:grid-cols-2">{p.data.ciclos.map(c=><div key={c.id} className="rounded border p-3 text-sm"><strong>Madre {name(c.madre_id)} · {c.estado}</strong><p>Servicio: {fmtDate(c.fecha_servicio)} · padre {name(c.padre_id)}</p><p>Cría: {name(c.ternero_id)} · parto {fmtDate(c.fecha_parto)} · destete {fmtDate(c.fecha_destete)} {c.peso_destete!=null?`· ${c.peso_destete} kg`:''}</p>{c.estado==='PRENADA'&&<p className={Date.now()>c.fecha_servicio+283*86400000?'text-amber-700':''}>Parto estimado: {fmtDate(c.fecha_servicio+283*86400000)}</p>}</div>)}</div>
 </Section>;}
