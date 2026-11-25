'use client';
import {useState} from 'react';
import type {Animal,Lote} from '@/lib/db/types';
import {animalLabel,pendingVisual} from '@/lib/stock/identity';
import {filterAnimals,categoryCounts,addGenericSelection} from '@/lib/stock/selection';
import {Select,Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
export function AnimalPicker({animals,lotes,selected,onChange}:{animals:Animal[];lotes:Lote[];selected:string[];onChange:(ids:string[])=>void}){
 const [lote,setLote]=useState(''),[search,setSearch]=useState(''),[categoria,setCategoria]=useState(''),[identity,setIdentity]=useState(''),[quantityText,setQuantityText]=useState('1');
 const quantity=Number(quantityText);
 const here=filterAnimals(animals,{lote,categoria,identificacion:identity,search}),all=here.length>0&&here.every(a=>selected.includes(a.id));
 const pending=here.filter(a=>pendingVisual(a)&&!selected.includes(a.id));const groups=categoryCounts(animals,selected),hidden=selected.filter(id=>!here.some(a=>a.id===id)).length;
 return <div className="space-y-3 rounded border p-3">
 <div className="grid gap-2 sm:grid-cols-2"><Select aria-label="Categoría de animales" value={categoria} onChange={e=>{const c=e.target.value;setCategoria(c);if(c)onChange(selected.filter(id=>animals.some(a=>a.id===id&&a.categoria===c)));}}><option value="">Todas las categorías</option>{groups.map(g=><option key={g.categoria}>{g.categoria}</option>)}</Select><Select aria-label="Filtrar animales por lote" value={lote} onChange={e=>setLote(e.target.value)}><option value="">Todos los lotes</option>{lotes.map(l=><option key={l.id} value={l.id}>{l.nombre}</option>)}</Select><Select aria-label="Identificación para movimiento" value={identity} onChange={e=>setIdentity(e.target.value)}><option value="">Con y sin caravana</option><option value="pendiente">Sin caravana visual</option><option value="identificado">Con caravana visual</option></Select><Input aria-label="Buscar animales para movimiento" placeholder="Caravana, RFID o referencia" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <div className="flex flex-wrap gap-2 text-xs">{groups.map(g=><span key={g.categoria} className="rounded bg-muted px-2 py-1">{g.categoria}: {g.disponibles} disponibles · {g.seleccionados} seleccionados</span>)}</div>
 <label className="flex gap-2 text-sm"><input type="checkbox" checked={all} onChange={()=>onChange(all?selected.filter(id=>!here.some(a=>a.id===id)):[...new Set([...selected,...here.map(a=>a.id)])])}/>Seleccionar todos los animales filtrados ({here.length})</label>
 {pending.length>0&&<div className="flex flex-wrap items-center gap-2"><Input className="w-24" aria-label="Cantidad sin caravana a seleccionar" type="text" inputMode="numeric" value={quantityText} onChange={e=>setQuantityText(e.target.value)}/><Button type="button" variant="outline" disabled={!Number.isInteger(quantity)||quantity<1||quantity>pending.length} onClick={()=>{onChange(addGenericSelection(here,selected,quantity));setQuantityText('1');}}>Seleccionar sin caravana ({pending.length} disponibles)</Button></div>}
 <div className="max-h-40 space-y-1 overflow-auto">{here.map(a=><label key={a.id} className="flex gap-2 text-sm"><input type="checkbox" checked={selected.includes(a.id)} onChange={()=>onChange(selected.includes(a.id)?selected.filter(id=>id!==a.id):[...selected,a.id])}/>{animalLabel(a)} · {a.categoria}</label>)}</div>
 <div className="flex items-center justify-between"><p className="text-sm font-medium">{selected.length} animales seleccionados{hidden>0?` · ${hidden} fuera del filtro`:''}</p><Button type="button" variant="ghost" onClick={()=>onChange([])}>Limpiar selección</Button></div><input type="hidden" name="animal_ids" value={JSON.stringify(selected)}/><input type="hidden" name="categoria_filtro" value={categoria}/></div>;
}
