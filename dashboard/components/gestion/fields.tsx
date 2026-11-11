'use client';
import {Field,Input,Select} from '@/components/ui/input';
import {businessToday} from '@/lib/calc/business-date';
export function DateField({name='fecha',label='Fecha',future=false}:{name?:string;label?:string;future?:boolean}){return <Field label={label}><Input name={name} type="date" defaultValue={businessToday()} max={future?undefined:businessToday()} required/></Field>;}
export function NumberField({name,label,zero=false}:{name:string;label:string;zero?:boolean}){return <Field label={label}><Input name={name} type="number" min={zero?'0':'0.0001'} step="0.0001" required/></Field>;}
export function Options({name,label,rows,optional=false}:{name:string;label:string;rows:Array<{id:string;nombre:string}>;optional?:boolean}){return <Field label={label}><Select name={name} required={!optional}><option value="">{optional?'Sin informar':'Elegir…'}</option>{rows.map(r=><option value={r.id} key={r.id}>{r.nombre}</option>)}</Select></Field>;}
