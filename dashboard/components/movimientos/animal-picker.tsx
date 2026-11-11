'use client';
import {useState} from 'react';
import type {Animal,Lote} from '@/lib/db/types';
import {animalLabel} from '@/lib/stock/identity';
import {Select,Input} from '@/components/ui/input';
export function AnimalPicker({animals,lotes,selected,onChange}:{animals:Animal[];lotes:Lote[];selected:string[];onChange:(ids:string[])=>void}){
 const [lote,setLote]=useState(''),[search,setSearch]=useState('');const here=animals.filter(a=>a.estado==='ACTIVO'&&(!lote||a.lote_id===lote)&&(!search||animalLabel(a).toLowerCase().includes(search.toLowerCase())||(a.rfid??'').includes(search)));
 const all=here.length>0&&here.every(a=>selected.includes(a.id));
 return <div className="space-y-2 rounded border p-3"><div className="grid gap-2 sm:grid-cols-2"><Select aria-label="Filtrar animales por lote" value={lote} onChange={e=>setLote(e.target.value)}><option value="">Todos los lotes</option>{lotes.map(l=><option key={l.id} value={l.id}>{l.nombre}</option>)}</Select><Input aria-label="Buscar animales para movimiento" placeholder="Caravana o referencia" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <label className="flex gap-2 text-sm"><input type="checkbox" checked={all} onChange={()=>onChange(all?selected.filter(id=>!here.some(a=>a.id===id)):[...new Set([...selected,...here.map(a=>a.id)])])}/>Seleccionar todos los animales filtrados ({here.length})</label>
 <div className="max-h-48 space-y-1 overflow-auto">{here.map(a=><label key={a.id} className="flex gap-2 text-sm"><input type="checkbox" checked={selected.includes(a.id)} onChange={()=>onChange(selected.includes(a.id)?selected.filter(id=>id!==a.id):[...selected,a.id])}/>{animalLabel(a)} · {a.categoria}</label>)}</div><p className="text-sm font-medium">{selected.length} animales seleccionados</p><input type="hidden" name="animal_ids" value={JSON.stringify(selected)}/></div>;
}
