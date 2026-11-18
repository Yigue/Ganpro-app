'use client';
import {useState} from 'react';
import {Field,Select} from '@/components/ui/input';
import type {CategoriaConfig} from '@/lib/db/types';
export function CategoryFields({categorias,initialCategory='Vaca',initialSex='H',birth=false,preserveInitial=false}:{categorias:CategoriaConfig[];initialCategory?:string;initialSex?:'M'|'H';birth?:boolean;preserveInitial?:boolean}){
 const options=birth?categorias.filter(c=>['Ternero','Ternera'].includes(c.categoria)):categorias;
 const [category,setCategory]=useState((preserveInitial||options.some(c=>c.categoria===initialCategory))?initialCategory:options[0]?.categoria??'');
 const config=options.find(c=>c.categoria===category);
 return <><Field label="Categoría"><Select name="categoria" required value={category} onChange={e=>setCategory(e.target.value)}>{preserveInitial&&!options.some(c=>c.categoria===initialCategory)&&<option>{initialCategory}</option>}{options.map(c=><option key={c.categoria}>{c.categoria}</option>)}</Select></Field>
 {config?.sexo?<><input type="hidden" name="sexo" value={config.sexo}/><p className="self-center text-xs text-muted-foreground">{config.sexo==='H'?'Hembra':'Macho'} según la categoría seleccionada.</p></>:<Field label="Sexo (categoría mixta)"><Select name="sexo" defaultValue={initialSex}><option value="H">Hembra</option><option value="M">Macho</option></Select></Field>}</>;
}
