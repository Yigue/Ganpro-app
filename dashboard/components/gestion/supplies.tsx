'use client';
import {abrirInsumo,comprarInsumo,consumirInsumo} from '@/app/(dashboard)/gestion/actions';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input,Select} from '@/components/ui/input';
import {Section} from '@/components/ui/section';
import {fmtARS,fmtNum,fmtDate} from '@/lib/calc/format';
import {DateField,NumberField,Options} from './fields';
import type {ManagementProps} from './types';
export function Supplies({p}:{p:ManagementProps}){const {data}=p;return <Section title="Insumos y compras" description="La apertura declara existencias y valor; no crea dinero. Las compras generan deuda y existencias; los consumos conservan su costo sin duplicar el pago.">
 {p.editable&&<div className="mb-4 flex flex-wrap gap-2">
 <FormDialog title="Incorporar insumo" trigger="Incorporar insumo" action={abrirInsumo}>
 <Field label="Nombre"><Input name="nombre" required/></Field>
 <Field label="Tipo"><Select name="tipo"><option>ALIMENTO</option><option>MEDICAMENTO</option><option>OTRO</option></Select></Field>
 <Field label="Unidad"><Select name="unidad"><option>KG</option><option>DOSIS</option><option>UNIDAD</option><option>ML</option></Select></Field>
 <Options name="suplemento_id" label="Alimento existente (obligatorio para alimento)" rows={p.suplementos} optional/>
 <Options name="operation_id" label="Producto sanitario asociado" rows={p.catalogo} optional/>
 <NumberField name="cantidad" label="Existencias iniciales" zero/><Field label="Partida inicial (medicamentos)"><Input name="partida"/></Field><Field label="Vencimiento inicial (medicamentos)"><Input name="caducidad" type="date"/></Field><Field label="Valor total inicial (ARS)"><Input name="valor_inicial" type="number" min="0" step="0.01" required/></Field><DateField/>
 <p className="text-xs">Para alimentos, la cantidad debe coincidir con su stock actual. Para medicamentos con existencias, informá partida y vencimiento.</p>
 </FormDialog>
 <FormDialog title="Comprar insumo" trigger="Comprar insumo" action={comprarInsumo}>
 <Options name="insumo_id" label="Insumo" rows={data.insumos}/><NumberField name="cantidad" label="Cantidad en la unidad del insumo"/>
 <Field label="Importe total (ARS)"><Input name="monto" type="number" min="0.01" step="0.01" required/></Field>
 <Field label="Proveedor"><Input name="contraparte" required/></Field><Field label="Comprobante"><Input name="comprobante"/></Field>
 <DateField/><DateField name="vencimiento" label="Vencimiento del pago" future/>
 <Field label="Partida / lote del producto"><Input name="partida"/></Field><Field label="Vencimiento del producto (obligatorio en medicamentos)"><Input name="caducidad" type="date"/></Field>
 <Field label="Pagado ahora (ARS, opcional)"><Input name="pagado" type="number" step="0.01" min="0.01"/></Field><Options name="cuenta_id" label="Cuenta para el pago inmediato" rows={p.ledger.cuentas} optional/>
 </FormDialog>
 <FormDialog title="Consumir insumo" trigger="Registrar consumo" action={consumirInsumo}>
 <Options name="insumo_id" label="Insumo" rows={data.insumos}/><Options name="partida_id" label="Partida (obligatoria para medicamentos)" rows={data.partidas.map(b=>({id:b.id,nombre:`${data.insumos.find(s=>s.id===b.insumo_id)?.nombre} · ${b.nombre} · ${b.cantidad}`}))} optional/>
 <Options name="lote_id" label="Lote ganadero al que se imputa" rows={p.lotes}/><NumberField name="cantidad" label="Cantidad consumida"/><Field label="Motivo"><Input name="motivo" required/></Field><DateField/>
 </FormDialog></div>}
 <div className="grid gap-3 sm:grid-cols-2">{data.insumos.map(s=><div key={s.id} className="rounded border p-3"><strong>{s.nombre}</strong><p>{fmtNum(Number(s.cantidad),4)} {s.unidad} · {fmtARS(Number(s.valor))}</p><p className="text-xs">Costo medio: {Number(s.cantidad)>0?fmtARS(Number(s.valor)/Number(s.cantidad)):'Sin existencias'}</p></div>)}</div>
 {!data.insumos.length&&<p>Sin insumos incorporados al libro de existencias.</p>}
 <h3 className="mt-4 font-medium">Movimientos de insumos</h3><div className="max-h-72 overflow-auto">{[...data.consumos].sort((a,b)=>b.fecha-a.fecha).map(c=><p key={c.id} className="border-b py-2 text-sm">{fmtDate(c.fecha)} · {data.insumos.find(s=>s.id===c.insumo_id)?.nombre} · {c.origen}: {c.cantidad} · {fmtARS(Number(c.valor))} · {p.lotes.find(l=>l.id===c.lote_id)?.nombre??'Sin imputación a lote'}</p>)}</div>
 </Section>;}
