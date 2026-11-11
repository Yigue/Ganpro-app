'use client';
import {anularComprobante,revertirPago,cerrarPeriodo,conciliarAnterior} from '@/app/(dashboard)/finanzas/actions';
import {FormDialog} from '@/components/ui/form-dialog';
import {Field,Input,Select} from '@/components/ui/input';
import type {LedgerSnapshot} from '@/lib/db/ledger-types';
import {businessToday} from '@/lib/calc/business-date';
import {money} from './money';
export function Corrections({data}:{data:LedgerSnapshot}){
 const today=businessToday();const date=<Field label="Fecha efectiva"><Input name="fecha" type="date" defaultValue={today} max={today} required/></Field>;
 const reason=<Field label="Motivo"><Input name="motivo" required/></Field>;
 return <>
 <FormDialog title="Revertir cobro / pago" trigger="Revertir pago" triggerVariant="outline" action={revertirPago}>
 <Field label="Pago original"><Select name="id" required><option value="">Elegir…</option>{data.asientos.filter(e=>e.movimiento_id&&!e.reversa_de&&!data.asientos.some(r=>r.reversa_de===e.id)).map(e=><option key={e.id} value={e.id}>{new Date(e.fecha).toLocaleDateString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})} · {money(e.monto)}</option>)}</Select></Field>{date}{reason}</FormDialog>
 <FormDialog title="Anular comprobante" description="Requiere revertir sus pagos y que el ganado asociado esté disponible. Conserva el historial." trigger="Anular comprobante" triggerVariant="outline" action={anularComprobante}>
 <Field label="Comprobante"><Select name="id" required>{data.documentos.map(d=><option key={d.id} value={d.id}>{d.descripcion??d.categoria} · {money(d.monto)}</option>)}</Select></Field>{date}{reason}</FormDialog>
 <FormDialog title="Cerrar período" description="Bloquea operaciones de ese día y anteriores. No admite reapertura automática." trigger="Cerrar período" triggerVariant="outline" action={cerrarPeriodo}>
 {date}<label className="flex gap-2 text-sm"><input type="checkbox" required/>Confirmo que concilié los saldos y comprobantes del período.</label></FormDialog>
 {data.anteriores.filas.length>0&&<FormDialog title="Conciliar movimiento anterior" description="Adopta el registro existente sin duplicarlo. El monto ya pagado al corte no genera asientos de caja nuevos." trigger="Conciliar anteriores" triggerVariant="outline" action={conciliarAnterior}>
 <Field label="Registro anterior"><Select name="id" required>{data.anteriores.filas.map(d=><option key={d.id} value={d.id}>{d.descripcion??d.tipo} · {money(d.monto)}</option>)}</Select></Field>
 <Field label="Cliente / proveedor"><Input name="contraparte" required/></Field>{date}<Field label="Vencimiento"><Input name="vencimiento" type="date" defaultValue={today} required/></Field>
 <Field label="Ya cobrado / pagado al corte (ARS)"><Input name="conciliado" type="number" min="0" step="0.01" defaultValue="0" required/></Field>
 </FormDialog>}
 </>;
}
