'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {confirmarLecturas} from '@/app/(dashboard)/stock/actions';
import {useAccion,ActionMessage} from '@/components/ui/form-dialog';
import {Button} from '@/components/ui/button';
import {Input,Textarea} from '@/components/ui/input';
import type {Animal} from '@/lib/db/types';
import {readingList,type Reading} from '@/lib/stock/intake';
import {IntakeDefaults,type IntakeOptions} from './intake-defaults';
import {ReadingQueue} from './reading-queue';
export function ReadingSession({animals,userId,...options}:IntakeOptions&{animals:Animal[];userId:string}){
 const [rows,setRows]=useState<Reading[]>([]),[input,setInput]=useState(''),[paste,setPaste]=useState(''),[notice,setNotice]=useState(''),[ready,setReady]=useState(false);
 const [state,action,pending]=useAccion(confirmarLecturas,true);const router=useRouter();const focus=()=>document.getElementById('manga-reader')?.focus();const storageKey=`ganpro:stock:manga:${userId}`;
 useEffect(()=>{try{const saved=localStorage.getItem(storageKey);if(saved){const parsed=readingList.safeParse(JSON.parse(saved));if(parsed.success)setRows(parsed.data);}}catch{setNotice('No se pudo recuperar la sesión local.');}setReady(true);},[storageKey]);
 useEffect(()=>{if(!ready)return;try{if(rows.length)localStorage.setItem(storageKey,JSON.stringify(rows));else localStorage.removeItem(storageKey);}catch{setNotice('El navegador no pudo guardar el borrador local. Conservá la página abierta.');}},[rows,ready,storageKey]);
 useEffect(()=>{if(state.ok){setRows([]);setInput('');focus();}},[state]);
 const add=(text:string)=>{
  const tags=text.split(/[\r\n;,\t]+/).map(v=>v.trim().toUpperCase()).filter(Boolean);let message='';
  const next=[...rows];for(const rfid of tags){if(!/^[A-Z0-9-]{6,24}$/.test(rfid)){message='Alguna lectura no tiene un formato válido (6–24 letras, números o guiones).';continue;}if(next.some(r=>r.rfid===rfid)){message='Se omitieron lecturas repetidas.';continue;}if(next.length>=500){message='La sesión admite hasta 500 animales.';break;}next.push({rfid,captured_at:Date.now()});}setRows(next);

  setNotice(message);setInput('');focus();
 };
 const payload=rows.map(r=>{const target=r.animal_id?animals.find(a=>a.id===r.animal_id):animals.find(a=>a.rfid===r.rfid||!a.rfid&&a.id_caravana===r.rfid&&a.estado==='ACTIVO');return {...r,expected_version:target?.server_updated_at};});
 return <div className="space-y-4">
 <p className="text-sm">Conectá un bastón que envíe la lectura como teclado y presioná Enter después de cada RFID. También podés pegar lecturas. Revisalas antes de confirmar.</p>
 <div className="flex gap-2"><Input id="manga-reader" aria-label="Lectura RFID" autoFocus value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add(input);}}}/><Button type="button" onClick={()=>add(input)} disabled={!input.trim()||pending}>Agregar lectura</Button></div>
 <details><summary className="cursor-pointer text-sm">Pegar varias lecturas</summary><Textarea aria-label="Lecturas pegadas" value={paste} onChange={e=>setPaste(e.target.value)} rows={4}/><Button type="button" onClick={()=>{add(paste);setPaste('');}}>Agregar lecturas pegadas</Button></details>
 {notice&&<p role="status" className="text-sm text-amber-700">{notice}</p>}
 <form action={action} className="space-y-4"><input type="hidden" name="lecturas" value={JSON.stringify(payload)}/><IntakeDefaults {...options}/>
 <p className="text-sm font-medium">{rows.length} lecturas en revisión</p><ReadingQueue rows={rows} animals={animals} change={(i,patch)=>setRows(old=>old.map((r,k)=>k===i?{...r,...patch}:r))} remove={i=>setRows(old=>old.filter((_,k)=>i!==k))}/>
 <ActionMessage state={state}/><div className="flex flex-wrap gap-2"><Button type="submit" disabled={!ready||!rows.length||pending}>{pending?'Confirmando…':`Confirmar ${rows.length} lecturas`}</Button><Button type="button" variant="outline" onClick={()=>router.refresh()}>Actualizar animales</Button><Button type="button" variant="ghost" disabled={pending} onClick={()=>{if(window.confirm('¿Descartar las lecturas todavía no confirmadas?'))setRows([]);}}>Descartar sesión</Button></div>
 </form><p className="text-xs text-muted-foreground">Elegí un animal pendiente para vincular el RFID a su ficha existente. Las lecturas conocidas no dan otra alta. La confirmación requiere conexión y se guarda completa; el borrador local no es un respaldo.</p>
 </div>;
}
