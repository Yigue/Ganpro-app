'use client';
import {Field,Select} from '@/components/ui/input';
import type {CategoriaConfig,Lote,Potrero} from '@/lib/db/types';
export interface IntakeOptions{categorias:CategoriaConfig[];lotes:Lote[];potreros:Potrero[]}
export function IntakeDefaults({categorias,lotes,potreros}:IntakeOptions){return <div className="grid gap-3 sm:grid-cols-2">
 <Field label="Sexo"><Select name="sexo" defaultValue="H"><option value="H">Hembra</option><option value="M">Macho</option></Select></Field>
 <Field label="Categoría"><Select name="categoria" defaultValue="Vaca">{categorias.map(c=><option key={c.categoria}>{c.categoria}</option>)}</Select></Field>
 <Field label="Lote"><Select name="lote_id"><option value="">Sin lote</option>{lotes.map(l=><option value={l.id} key={l.id}>{l.nombre}</option>)}</Select></Field>
 <Field label="Potrero"><Select name="potrero_id"><option value="">Sin potrero</option>{potreros.map(p=><option value={p.id} key={p.id}>{p.nombre}</option>)}</Select></Field>
 </div>;}
