'use client';
import {Field,Input,Select} from '@/components/ui/input';
import type {LedgerSnapshot} from '@/lib/db/ledger-types';
import {businessToday} from '@/lib/calc/business-date';
export function CommerceFields({sale,cuentas,monto,kg}:{sale:boolean;cuentas:LedgerSnapshot['cuentas'];monto?:number|null;kg?:number|null}){return <div className="grid gap-3 sm:grid-cols-2">
 <Field label="Kg totales"><Input name="kg" type="number" min="0.01" step="0.01" required={sale} defaultValue={kg??undefined}/></Field>
 <Field label="Monto total (ARS)"><Input name="monto" type="number" min="0.01" step="0.01" required defaultValue={monto??undefined}/></Field>
 <Field label="Cliente / proveedor"><Input name="contraparte" required/></Field>
 <Field label="Vencimiento"><Input name="vencimiento" type="date" defaultValue={businessToday()} required/></Field>
 <Field label="Cobrado / pagado ahora (opcional)"><Input name="pagado" type="number" min="0.01" step="0.01"/></Field>
 <Field label="Cuenta del cobro / pago"><Select name="cuenta_id"><option value="">Sin pago inmediato</option>{cuentas.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></Field>
 </div>;}
export function DteFields({sale}:{sale:boolean}){return <div className="grid gap-3 sm:grid-cols-2"><Field label="N° de DTE"><Input name="dte_numero" placeholder="07-2026-000000"/></Field>{sale&&<Field label="RENSPA destino"><Input name="renspa_destino"/></Field>}</div>;}
