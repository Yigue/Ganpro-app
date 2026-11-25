'use client';
import {Button} from '@/components/ui/button';
import {Input,Select} from '@/components/ui/input';
import type {Animal} from '@/lib/db/types';
import type {Reading} from '@/lib/stock/intake';
import {animalLabel,pendingVisual} from '@/lib/stock/identity';
export function ReadingQueue({rows,animals,change,remove}:{rows:Reading[];animals:Animal[];change:(i:number,patch:Partial<Reading>)=>void;remove:(i:number)=>void}){
 return <div className="space-y-3">{rows.map((r,i)=>{const known=animals.find(a=>a.rfid===r.rfid||!a.rfid&&a.id_caravana===r.rfid&&a.estado==='ACTIVO');return <div key={r.rfid} className="grid gap-2 rounded border p-3 sm:grid-cols-2 lg:grid-cols-4">
 <div><strong>Animal {i+1}</strong><p className="font-mono text-xs text-muted-foreground">RFID: {r.rfid}</p><p className="text-sm">{known?animalLabel(known):'Lectura nueva'}</p></div>
 <label className="text-sm">Caravana visual (opcional)<Input aria-label={`Caravana visual lectura ${i+1}`} value={r.visual??''} onChange={e=>change(i,{visual:e.target.value||undefined})}/></label>
 <label className="text-sm">Peso (kg, opcional)<Input aria-label={`Peso lectura ${i+1}`} type="number" min="0.01" max="9999" step="0.01" value={r.peso??''} onChange={e=>change(i,{peso:e.target.value?Number(e.target.value):undefined})}/></label>
 <div>{!known&&<label className="text-sm">Destino<Select aria-label={`Destino lectura ${i+1}`} value={r.animal_id??''} onChange={e=>change(i,{animal_id:e.target.value||undefined})}><option value="">Registrar animal nuevo</option>{animals.filter(a=>a.estado==='ACTIVO'&&!a.rfid&&pendingVisual(a)).map(a=><option value={a.id} key={a.id}>{animalLabel(a)} · {a.categoria}</option>)}</Select></label>}<Button type="button" variant="ghost" onClick={()=>remove(i)}>Quitar lectura {i+1}</Button></div>
 </div>;})}</div>;
}
