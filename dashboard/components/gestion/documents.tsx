'use client';
import {adjuntarComprobante} from '@/app/(dashboard)/gestion/documents';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input} from '@/components/ui/input';
import {Section} from '@/components/ui/section';
import {Options} from './fields';
import type {ManagementProps} from './types';
export function Documents({p}:{p:ManagementProps}){return <Section title="Comprobantes adjuntos" description="Archivos privados asociados a la obligación financiera. La descarga verifica la sesión y genera un enlace de corta duración.">
 {p.editable&&<FormDialog title="Adjuntar comprobante" trigger="Adjuntar comprobante" action={adjuntarComprobante}>
 <Options name="movimiento_id" label="Comprobante financiero" rows={p.ledger.documentos.map(d=>({id:d.id,nombre:`${d.contraparte} · ${d.descripcion??d.categoria} · ${d.monto}`}))}/>
 <Field label="Archivo PDF, PNG o JPEG (máximo 4 MB)"><Input name="archivo" type="file" accept="application/pdf,image/png,image/jpeg" required/></Field>
 </FormDialog>}
 {p.data.documentos.map(d=><p key={d.id} className="border-b py-3 text-sm"><a className="underline" href={`/api/documentos/${d.id}`} target="_blank" rel="noreferrer">{d.nombre}</a></p>)}
 </Section>;}
