'use client';
import {useEffect,useState} from 'react';
import {guardarMapa} from '@/app/(dashboard)/mapa/actions';
import {useAccion,ActionMessage} from '@/components/ui/form-dialog';
import {Button} from '@/components/ui/button';
import {MapCanvas} from './map-canvas';
import {MapFields} from './map-fields';
import {PaddockClimate} from './paddock-climate';
import {PaddockInfo} from './paddock-info';
import {closePolygon,previewHectares,type Point} from '@/lib/maps/geometry';
import type {MapPaddock,BaseLayer} from '@/lib/maps/types';
export function MapWorkspace({paddocks,editable,initialSelected=null}:{paddocks:MapPaddock[];editable:boolean;initialSelected?:string|null}){
 const [selected,setSelected]=useState<string|null>(initialSelected),[points,setPoints]=useState<Point[]>([]),[drawing,setDrawing]=useState(false),[editing,setEditing]=useState(false),[layer,setLayer]=useState<BaseLayer>('satelite');
 const [state,action,pending]=useAccion(guardarMapa);const p=paddocks.find(p=>p.id===selected)??null;
 useEffect(()=>{if(state.ok){setDrawing(false);setEditing(false);setPoints([]);}},[state]);
 const start=(existing:boolean)=>{setEditing(existing);if(!existing)setSelected(null);setPoints(existing&&p?.geometry?p.geometry.coordinates[0].slice(0,-1):[]);setDrawing(true);};
 const exportGeo=()=>{const blob=new Blob([JSON.stringify({type:'FeatureCollection',features:paddocks.filter(p=>p.geometry).map(p=>({type:'Feature',geometry:p.geometry,properties:{nombre:p.nombre,hectareas:p.hectareas,tipo:p.tipo}}))},null,2)],{type:'application/geo+json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='potreros-ganpro.geojson';a.click();URL.revokeObjectURL(url);};
 return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
 <div className="min-w-0 space-y-3"><div className="flex flex-wrap gap-2">{(['calles','satelite','relieve']as const).map(l=><Button key={l} type="button" variant={layer===l?'default':'outline'} onClick={()=>setLayer(l)} aria-pressed={layer===l}>{l==='satelite'?'Satélite':l==='calles'?'Calles':'Relieve'}</Button>)}<Button type="button" variant="outline" onClick={exportGeo}>Exportar GeoJSON</Button></div>
 <div className="relative"><MapCanvas paddocks={paddocks} layer={layer} points={points} drawing={drawing} select={id=>{if(!drawing)setSelected(id);}} add={point=>setPoints(old=>old.length<500?[...old,point]:old)} move={(i,point)=>setPoints(old=>old.map((v,k)=>k===i?point:v))}/>{p&&!drawing&&<div className="absolute right-2 top-2 z-10 max-h-[360px] w-60 overflow-auto sm:w-72"><PaddockInfo p={p} close={()=>setSelected(null)}/></div>}</div>
 <p className="text-xs text-muted-foreground">Tocá un potrero para ver su ficha. La medición es aproximada y no reemplaza una mensura. Las capas requieren Internet.</p>
 {editable&&<><div className="flex flex-wrap gap-2"><Button type="button" onClick={()=>start(false)}>Dibujar potrero</Button>{p&&<Button type="button" variant="outline" onClick={()=>start(true)}>Editar límite</Button>}{drawing&&<><Button type="button" variant="outline" onClick={()=>setPoints(old=>old.slice(0,-1))}>Deshacer punto</Button><Button type="button" variant="outline" onClick={()=>{setDrawing(false);setPoints([]);}}>Cancelar dibujo</Button></>}</div>
 {drawing&&<form action={action} className="space-y-4 rounded-lg border bg-card p-4" key={editing?p?.id:'new'}>
 <p className="text-sm">Tocá el mapa para agregar puntos; arrastrá los vértices para ajustar. {points.length} puntos · {previewHectares(points).toFixed(2)} ha de vista previa. El servidor valida y mide al guardar.</p>
 {editing&&p&&<><input type="hidden" name="id" value={p.id}/><input type="hidden" name="expected_version" value={p.version}/></>}
 <input type="hidden" name="geometry" value={JSON.stringify(closePolygon(points))}/><MapFields p={editing?p:null}/><ActionMessage state={state}/><Button type="submit" disabled={pending||points.length<3}>{pending?'Guardando…':'Cerrar y guardar polígono'}</Button>
 </form>}{!drawing&&<ActionMessage state={state}/>}</>}
 </div><aside className="space-y-3"><h2 className="font-semibold">Potreros del establecimiento</h2>{paddocks.length===0&&<p className="text-sm">Sin potreros. Dibujá el primero para comenzar.</p>}{paddocks.map(plot=><button key={plot.id} type="button" onClick={()=>{if(!drawing)setSelected(plot.id);}} className={`w-full rounded-lg border p-3 text-left text-sm ${selected===plot.id?'border-primary bg-muted':'bg-card'}`}><strong>{plot.nombre}</strong><span className="block">{plot.hectareas??'—'} ha · {plot.cabezas} cabezas</span><span className="text-xs text-muted-foreground">{plot.invalid?'Geometría a revisar':plot.geometry?'Ubicado en el mapa':'Sin ubicar'}</span></button>)}{p&&<><PaddockInfo p={p}/>{p.geometry&&<PaddockClimate key={`${p.id}:${p.version}`} id={p.id}/>}</>}</aside>
 </div>;
}
