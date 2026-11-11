'use client';
import {useState} from 'react';
import {Field,Input,Select} from '@/components/ui/input';
import type {LedgerSnapshot} from '@/lib/db/ledger-types';
import {fmtARS,fmtNum} from '@/lib/calc/format';
export function CommerceFields({cuentas,kg,cabezas=0,price}:{sale:boolean;cuentas:LedgerSnapshot['cuentas'];monto?:number|null;kg?:number|null;cabezas?:number;price?:number|null}){
 const [mode,setMode]=useState('KG'),[weight,setWeight]=useState(kg?.toString()??''),[unit,setUnit]=useState(price?.toString()??'');const total=(mode==='KG'?Number(weight):cabezas)*Number(unit);
 return <><div className="grid gap-3 sm:grid-cols-2"><Field label="Forma de cotización"><Select name="modalidad_precio" value={mode} onChange={e=>setMode(e.target.value)}><option value="KG">Por kilo</option><option value="CABEZA">Por cabeza / pieza</option></Select></Field>
 <Field label={mode==='KG'?'Precio por kg (ARS)':'Precio por cabeza (ARS)'}><Input name="precio_unitario" type="number" min="0.01" step="0.01" required value={unit} onChange={e=>setUnit(e.target.value)}/></Field>
 <Field label={`Kg totales${mode==='CABEZA'?' (opcional)':''}`}><Input name="kg" type="number" min="0.01" step="0.01" required={mode==='KG'} value={weight} onChange={e=>setWeight(e.target.value)}/></Field><Field label="Cliente / proveedor (opcional)"><Input name="contraparte"/></Field></div>
 <div className="rounded bg-primary/10 p-3 text-sm"><strong>{cabezas} cabezas · total calculado: {total>0?fmtARS(total):'Completá la cotización'}</strong><p>Peso promedio: {cabezas&&Number(weight)>0?`${fmtNum(Number(weight)/cabezas,2)} kg por cabeza`:'Sin peso informado'}</p></div>
 <details><summary className="cursor-pointer text-sm">Pago inmediato o vencimiento (opcional)</summary><div className="mt-2 grid gap-3 sm:grid-cols-2"><Field label="Vencimiento"><Input name="vencimiento" type="date"/></Field><Field label="Cobrado / pagado ahora (ARS)"><Input name="pagado" type="number" min="0.01" step="0.01"/></Field><Field label="Cuenta"><Select name="cuenta_id"><option value="">Sin pago inmediato</option>{cuentas.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></Field></div></details></>;
}
export function DteFields({sale}:{sale:boolean}){return <details><summary className="cursor-pointer text-sm">Documentación DTE / SIGSA (opcional)</summary><div className="mt-2 grid gap-3 sm:grid-cols-2"><Field label="N° de DTE"><Input name="dte_numero"/></Field>{sale&&<Field label="RENSPA destino"><Input name="renspa_destino"/></Field>}</div></details>;}
