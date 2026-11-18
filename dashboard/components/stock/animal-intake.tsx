'use client';
import {useState} from 'react';
import Link from 'next/link';
import {crearAlta} from '@/app/(dashboard)/stock/actions';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input,Select} from '@/components/ui/input';
import {AnimalFormFields} from './animal-form-fields';
import {IntakeDefaults,type IntakeOptions} from './intake-defaults';
export function AnimalIntake(props:IntakeOptions){const [mode,setMode]=useState<'IDENTIFICADO'|'GENERICO'>('IDENTIFICADO');return <FormDialog title="Nuevo animal" trigger="Nuevo animal" action={crearAlta} description="Alta de animales que ya están en el campo. Para compras o nacimientos usá Movimientos.">
 <Field label="Tipo de alta"><Select name="modo" value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="IDENTIFICADO">Con caravana visual</option><option value="GENERICO">Sin caravana · uno o varios animales</option></Select></Field>
 {mode==='IDENTIFICADO'?<AnimalFormFields {...props}/>:<><Field label="Cantidad de animales"><Input name="cantidad" type="number" min="1" max="500" defaultValue="1" required/></Field><IntakeDefaults {...props}/><Field label="Peso por animal (kg, opcional)"><Input name="peso_actual" type="number" min="0.01" max="9999" step="0.01"/></Field><p className="text-xs text-muted-foreground">Se crea una ficha por cabeza. Podés vincular la caravana después sin perder el historial.</p></>}
 <Link href="/stock/manga" className="text-sm underline">Cargar mediante lectura electrónica →</Link>
 </FormDialog>;}
