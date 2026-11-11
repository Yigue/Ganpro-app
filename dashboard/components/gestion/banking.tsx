'use client';
import {importarExtracto,conciliarBanco} from '@/app/(dashboard)/gestion/actions';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input,Textarea} from '@/components/ui/input';
import {Section} from '@/components/ui/section';
import {fmtARS,fmtDate} from '@/lib/calc/format';
import {DateField,Options} from './fields';
import type {ManagementProps} from './types';
export function Banking({p}:{p:ManagementProps}){const used=new Set(p.data.bancos.map(b=>b.asiento_id));return <Section title="Conciliación bancaria" description="Importá el extracto y vinculá cada renglón con un asiento existente de la misma cuenta e importe. No se crean pagos automáticamente.">
 {p.admin&&<div className="mb-4 flex flex-wrap gap-2"><FormDialog title="Importar extracto bancario" trigger="Importar extracto" action={importarExtracto}>
 <Options name="cuenta_id" label="Cuenta bancaria" rows={p.ledger.cuentas}/><DateField name="desde" label="Desde"/><DateField name="hasta" label="Hasta"/>
 <Field label="Saldo inicial del extracto (ARS)"><Input name="saldo_inicial" type="number" step="0.01" required/></Field><Field label="Saldo final del extracto (ARS)"><Input name="saldo_final" type="number" step="0.01" required/></Field>
 <Field label="Extracto CSV"><Textarea name="csv" rows={7} placeholder={'fecha;referencia;descripcion;monto\n2026-11-10;REF-1;Cobro;100.00'} required/></Field><p className="text-xs">Fecha AAAA-MM-DD, referencias únicas por cuenta, importes con punto decimal y signo negativo para débitos. Hasta 2.000 filas. Los saldos deben cuadrar.</p>
 </FormDialog><FormDialog title="Conciliar movimiento bancario" trigger="Conciliar movimiento" action={conciliarBanco}>
 <Options name="extracto_id" label="Renglón del banco" rows={p.data.bancos.filter(b=>!b.asiento_id).map(b=>({id:b.id,nombre:`${b.referencia} · ${b.monto} · ${p.ledger.cuentas.find(c=>c.id===b.cuenta_id)?.nombre}`}))}/>
 <Options name="asiento_id" label="Asiento del libro" rows={p.ledger.asientos.filter(a=>!used.has(a.id)).map(a=>({id:a.id,nombre:`${fmtDate(a.fecha)} · ${a.monto} · ${p.ledger.cuentas.find(c=>c.id===a.cuenta_id)?.nombre}`}))}/>
 </FormDialog></div>}
 {p.data.extractos.map(e=>{const book=p.ledger.cuentas.find(a=>a.id===e.cuenta_id);const bookBalance=Number(book?.fecha_apertura??Infinity)<=e.hasta?(Number(book?.saldo??0)-p.ledger.asientos.filter(a=>a.cuenta_id===e.cuenta_id&&a.fecha>e.hasta).reduce((sum,a)=>sum+Number(a.monto),0)):null;const rows=p.data.bancos.filter(b=>b.extracto_id===e.id);return <div key={e.id} className="mb-3 rounded border p-3 text-sm"><strong>{p.ledger.cuentas.find(a=>a.id===e.cuenta_id)?.nombre} · {fmtDate(e.desde)} a {fmtDate(e.hasta)}</strong><p>Banco: {fmtARS(Number(e.saldo_inicial))} → {fmtARS(Number(e.saldo_final))} · {rows.filter(r=>!r.asiento_id).length} movimientos por conciliar</p><p>Libro al corte: {bookBalance==null?'Sin apertura':fmtARS(bookBalance)} · diferencia banco − libro: {bookBalance==null?'—':fmtARS(Number(e.saldo_final)-bookBalance)}</p></div>;})}
 <div className="max-h-80 overflow-auto">{p.data.bancos.map(b=><p key={b.id} className="border-b py-2 text-sm">{fmtDate(b.fecha)} · {b.referencia} · {b.descripcion} · {fmtARS(Number(b.monto))} · {b.asiento_id?'Conciliado':'Pendiente'}</p>)}</div>
 </Section>;}
