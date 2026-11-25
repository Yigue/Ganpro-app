'use client';
import {useState} from 'react';
import {Button} from './button';
export function OperationPanel({children,title='Registrar operación'}:{children:React.ReactNode;title?:string}){const [open,setOpen]=useState(false);return <div className="space-y-3"><Button aria-label={title} type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open} className="px-5 py-3 text-base shadow-sm">＋ {title}</Button>{open&&<div className="flex flex-wrap gap-3 rounded-xl border bg-primary/5 p-4">{children}</div>}</div>;}
