'use client';
import {Field,Input,Select,Textarea} from '@/components/ui/input';
import type {MapPaddock} from '@/lib/maps/types';
export function MapFields({p}:{p:MapPaddock|null}){return <div className="grid gap-3 sm:grid-cols-2">
 <Field label="Nombre del potrero"><Input name="nombre" defaultValue={p?.nombre??''} required/></Field>
 <Field label="Tipo de potrero"><Select name="tipo_potrero" defaultValue={p?.tipo??'CAMPO_NATURAL'}>{['SIN_DATOS','CAMPO_NATURAL','PASTURA','MONTE','AGRICOLA','OTRO'].map(t=><option key={t}>{t}</option>)}</Select></Field>
 <Field label="Recurso forrajero"><Input name="recurso_forrajero" defaultValue={p?.recurso??''}/></Field>
 <Field label="Estado del forraje"><Select name="estado_forraje" defaultValue={p?.forraje??'REGULAR'}>{['SIN_DATOS','EXCELENTE','BUENO','REGULAR','MALO','SECO'].map(t=><option key={t}>{t}</option>)}</Select></Field>
 <Field label="Capacidad estimada (EV)"><Input name="capacidad_ev" type="number" min="0" step="0.01" defaultValue={p?.capacidadEV??''}/></Field>
 <Field label="Capacidad estimada (cabezas)"><Input name="capacidad_cabezas" type="number" min="0" step="1" defaultValue={p?.capacidadCabezas??''}/></Field>
 <Field label="Agua disponible"><Select name="agua" defaultValue={p?.agua==null?'desconocido':p.agua?'si':'no'}><option value="desconocido">Sin dato</option><option value="si">Sí</option><option value="no">No</option></Select></Field>
 <Field label="Sombra disponible"><Select name="sombra" defaultValue={p?.sombra==null?'desconocido':p.sombra?'si':'no'}><option value="desconocido">Sin dato</option><option value="si">Sí</option><option value="no">No</option></Select></Field>
 <Field label="Notas"><Textarea name="notas" defaultValue={p?.notas??''}/></Field>
 </div>;}
