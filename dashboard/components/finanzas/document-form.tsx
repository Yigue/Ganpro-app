'use client';
import {useState} from 'react';
import {crearMovimientoFinanciero} from '@/app/(dashboard)/finanzas/actions';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input,Select} from '@/components/ui/input';
import {CATEGORIAS_GASTO} from '@/lib/calc/finanzas';
import {businessToday} from '@/lib/calc/business-date';
import type {Lote} from '@/lib/db/types';
import type {LedgerSnapshot} from '@/lib/db/ledger-types';
export function DocumentForm({lotes,cuentas=[]}:{lotes:Lote[];cuentas?:LedgerSnapshot['cuentas']}){
 const [tipo,setTipo]=useState('GASTO');const today=businessToday();
 return <FormDialog title="Nuevo comprobante" description="Las compras y ventas de ganado se registran desde Movimientos con sus caravanas." trigger="Gasto / ingreso" action={crearMovimientoFinanciero}>
 <div className="grid gap-3 sm:grid-cols-2">
 <Field label="Tipo"><Select name="tipo" value={tipo} onChange={e=>setTipo(e.target.value)}><option value="GASTO">Gasto</option><option value="INGRESO">Ingreso</option></Select></Field>
 <Field label="Categoría"><Select name="categoria">{(tipo==='GASTO'?CATEGORIAS_GASTO.filter(c=>c!=='COMPRA'):['OTRO']).map(c=><option key={c}>{c}</option>)}</Select></Field>
 <Field label="Monto total (ARS)"><Input name="monto" type="number" min="0.01" step="0.01" required/></Field>
 <Field label="Cliente / proveedor"><Input name="contraparte" required/></Field>
 <Field label="Fecha"><Input name="fecha" type="date" defaultValue={today} max={today} required/></Field>
 <Field label="Vencimiento"><Input name="vencimiento" type="date" defaultValue={today} required/></Field>
 <Field label="Lote"><Select name="lote_id"><option value="">General</option>{lotes.map(l=><option value={l.id} key={l.id}>{l.nombre}</option>)}</Select></Field>
 <Field label="Centro de costo / actividad"><Input name="centro_costo"/></Field>
 <Field label="Comprobante"><Input name="comprobante"/></Field><Field label="Descripción"><Input name="descripcion"/></Field>
 {cuentas.length>0&&<><Field label="Pagado / cobrado ahora (opcional)"><Input name="pagado" type="number" step="0.01" min="0.01"/></Field><Field label="Cuenta del pago"><Select name="cuenta_id"><option value="">Elegir…</option>{cuentas.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></Field></>}
 </div></FormDialog>;
}
