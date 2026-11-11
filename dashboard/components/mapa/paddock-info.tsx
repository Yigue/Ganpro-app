import Link from 'next/link';
import type {MapPaddock} from '@/lib/maps/types';
import {fmtNum} from '@/lib/calc/format';
export function PaddockInfo({p,close}:{p:MapPaddock;close?:()=>void}){return <div className="rounded-lg border bg-card p-3 text-sm shadow-lg">
 <div className="flex justify-between gap-3"><strong>{p.nombre}</strong>{close&&<button type="button" aria-label="Cerrar ficha" onClick={close}>✕</button>}</div>
 <p>{p.hectareas==null?'Superficie sin definir':`${fmtNum(p.hectareas,2)} ha`} · {p.cabezas} cabezas</p>
 <p>{p.ev==null?'EV sin coeficiente':`${fmtNum(p.ev,2)} EV`} · {p.hectareas?`${fmtNum(p.cabezas/p.hectareas,2)} cabezas/ha`:'Sin densidad'}</p>
 <p>{p.tipo.replaceAll('_',' ')} · Forraje {p.forraje.toLowerCase()}</p>
 <p>{p.recurso}</p><p>Agua: {p.agua==null?'sin dato':p.agua?'sí':'no'} · Sombra: {p.sombra==null?'sin dato':p.sombra?'sí':'no'}</p>
 {p.capacidadEV!=null&&<p>Capacidad declarada: {fmtNum(p.capacidadEV,1)} EV</p>}
 {p.capacidadCabezas!=null&&<p>Capacidad: {p.capacidadCabezas} cabezas</p>}
 {((p.capacidadEV!=null&&p.ev!=null&&p.ev>p.capacidadEV)||(p.capacidadCabezas!=null&&p.cabezas>p.capacidadCabezas))&&<p className="font-medium text-danger">Sobre la capacidad declarada</p>}
 {p.categorias.map(c=><p key={c.categoria}>{c.categoria}: {c.cabezas}</p>)}
 {p.perimetro!=null&&<p>Perímetro: {fmtNum(p.perimetro)} m</p>}{p.notas&&<p>{p.notas}</p>}
 <Link className="text-primary underline" href={`/stock?potrero=${encodeURIComponent(p.id)}`}>Ver animales de este potrero</Link>
 </div>;}
