'use client';
import {cambiarEstadoProgramada} from '@/app/(dashboard)/sanidad/actions';
import {useAccion,ActionMessage} from '@/components/ui/form-dialog';
import {AplicacionForm} from './sanidad-forms';
import type {Lote,OperationCatalog} from '@/lib/db/types';
import type {ManagementData} from '@/lib/management/schema';
export interface ItemCalendario{id:string;fecha:number;nombre:string;lote:string;estado:'PENDIENTE'|'COMPLETADO'|'CANCELADO'|'APLICADO';vencida:boolean;operationId?:string;loteId?:string|null}
export interface CalendarContext{catalogo:OperationCatalog[];lotes:Lote[];management:ManagementData}
function Cancel({id}:{id:string}){const [state,action,pending]=useAccion(cambiarEstadoProgramada,true);return <form action={action}><input type="hidden" name="id" value={id}/><input type="hidden" name="estado" value="CANCELADO"/><button type="submit" disabled={pending} className="text-xs text-danger underline">Cancelar programación</button><ActionMessage state={state}/></form>;}
export function CalendarEvent({item,editable,context}:{item:ItemCalendario;editable:boolean;context:CalendarContext}){return <div className={`space-y-1 rounded border-l-4 bg-card p-2 text-xs ${item.estado==='CANCELADO'?'border-muted opacity-60':item.estado==='APLICADO'||item.estado==='COMPLETADO'?'border-green-600':item.vencida?'border-red-600':'border-amber-500'}`}>
 <strong className="block">{item.nombre}</strong><span className="block text-muted-foreground">{item.lote} · {item.estado.toLowerCase()}</span>
 {editable&&item.estado==='PENDIENTE'&&item.operationId&&<><AplicacionForm catalogo={context.catalogo} lotes={context.lotes} management={context.management} programadas={[]} preset={{id:item.id,operationId:item.operationId,loteId:item.loteId??null}}/><Cancel id={item.id}/></>}
 </div>;}
