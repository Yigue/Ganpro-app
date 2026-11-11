'use client';
import Link from 'next/link';
export {DocumentForm as MovimientoFinancieroForm} from './document-form';
export function MarcarCobrado({id}:{id:string}){return <Link className="text-sm text-primary underline" href={`/finanzas#${encodeURIComponent(id)}`}>Registrar cobro en caja</Link>;}
