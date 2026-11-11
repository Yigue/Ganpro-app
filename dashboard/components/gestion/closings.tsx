'use client';
import {useState} from 'react';
import {cerrarInventario} from '@/app/(dashboard)/gestion/actions';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input} from '@/components/ui/input';
import {Section} from '@/components/ui/section';
import {fmtARS,fmtDate,fmtNum} from '@/lib/calc/format';
import {DateField} from './fields';
import type {ManagementProps} from './types';
export function Closings({p}:{p:ManagementProps}){const [prices,setPrices]=useState<Record<string,string>>({});const categories=[...new Set(p.animals.filter(a=>a.estado==='ACTIVO').map(a=>a.categoria))];return <Section title="Inventario físico y resultados entre cortes" description="Cada corte conserva animales, pesos, precios declarados e insumos. El primero es la apertura; desde el segundo se comparan existencias y operaciones registradas.">
 {p.admin&&<FormDialog title="Guardar corte de inventario" trigger="Guardar corte de hoy" action={cerrarInventario}>
 <DateField/><input type="hidden" name="precios" value={JSON.stringify(prices)}/>{categories.map(category=><Field key={category} label={`Precio por kg: ${category} (ARS)`}><Input type="number" min="0.01" step="0.01" required value={prices[category]??''} onChange={e=>setPrices(old=>({...old,[category]:e.target.value}))}/></Field>)}
 <p className="text-sm">Todos los animales activos deben tener peso y precio. Incorporá antes los saldos de insumos. El corte conserva los datos actuales; no permite reconstruir fechas antiguas.</p>
 <label className="text-sm"><input type="checkbox" name="confirmado" required/> Revisé las existencias físicas y los precios declarados.</label>
 </FormDialog>}
 {[...p.data.cierres].sort((a,b)=>b.fecha-a.fecha).map(c=><div key={c.id} className="mt-4 rounded border p-3"><strong>{fmtDate(c.fecha)} · {c.cabezas} cabezas · {fmtNum(Number(c.kg))} kg</strong><p>Hacienda: {fmtARS(Number(c.valor_animales))} · insumos: {fmtARS(Number(c.valor_insumos))}</p>{c.resultado?<div className="mt-2 text-sm"><p>Variación de hacienda: {fmtARS(Number(c.resultado.variacion_animales))}</p><p>Producción registrada: {c.resultado.produccion_kg==null?'Sin kilos suficientes en las operaciones':`${fmtNum(Number(c.resultado.produccion_kg))} kg`} · consumo de insumos: {fmtARS(Number(c.resultado.consumos))}</p><p>Resultado de gestión entre cortes: {fmtARS(Number(c.resultado.margen))}</p></div>:<p className="text-xs text-muted-foreground">Corte inicial. Hace falta otro corte para comparar.</p>}</div>)}
 <p className="mt-3 text-xs text-muted-foreground">Informe de gestión por operaciones capturadas entre cortes, sin liquidación fiscal. Los cambios de precio afectan la variación de valor; revisá ajustes tardíos y gastos pendientes antes de usarlo como cierre definitivo.</p>
 </Section>;}
