'use client';
import {abrirCuenta,registrarPago,transferirCaja} from '@/app/(dashboard)/finanzas/actions';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input,Select} from '@/components/ui/input';
import type {LedgerSnapshot} from '@/lib/db/ledger-types';
import {businessToday} from '@/lib/calc/business-date';
import {money} from './money';
export function CashForms({data}:{data:LedgerSnapshot}){
 const today=businessToday();
 const date=<Field label="Fecha"><Input name="fecha" type="date" defaultValue={today} max={today} required/></Field>;
 const amount=<Field label="Importe (ARS)"><Input name="monto" type="number" step="0.01" min="0.01" required/></Field>;
 const accounts=(name:string,label:string)=><Field label={label}><Select name={name} required><option value="">Elegir…</option>{data.cuentas.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</Select></Field>;
 return <>
 <FormDialog title="Abrir cuenta" trigger="Abrir caja / banco" triggerVariant="outline" action={abrirCuenta}>
 <Field label="Nombre"><Input name="nombre" required/></Field><Field label="Saldo inicial (ARS)"><Input name="saldo_inicial" type="number" step="0.01" defaultValue="0" required/></Field>{date}</FormDialog>
 <FormDialog title="Registrar cobro / pago" trigger="Cobro / pago" triggerVariant="outline" action={registrarPago} disabled={!data.cuentas.length}>
 <Field label="Comprobante pendiente"><Select name="movimiento_id" required><option value="">Elegir…</option>{data.documentos.filter(d=>Number(d.pendiente)>0).map(d=><option value={d.id} key={d.id}>{d.descripcion??d.categoria} · {d.contraparte} · {money(d.pendiente)}</option>)}</Select></Field>
 {accounts('cuenta_id','Cuenta')}<Field label="Método del cobro / pago"><Select name="metodo_pago"><option value="A_CONVENIR">Sin informar</option>{['TRANSFERENCIA','EFECTIVO','CHEQUE','OTRO'].map(m=><option key={m}>{m}</option>)}</Select></Field>{amount}{date}</FormDialog>
 <FormDialog title="Transferir entre cuentas" trigger="Transferencia" triggerVariant="outline" action={transferirCaja} disabled={data.cuentas.length<2}>
 {accounts('origen_id','Cuenta de origen')}{accounts('destino_id','Cuenta de destino')}{amount}{date}</FormDialog>
 </>;
}
