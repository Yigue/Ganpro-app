import {Section} from '@/components/ui/section';
import {Table,THead,TBody,TH,TR,TD} from '@/components/ui/table';
import {businessToday} from '@/lib/calc/business-date';
import {fmtDate} from '@/lib/calc/format';
import type {LedgerSnapshot} from '@/lib/db/ledger-types';
import {money} from './money';
export function LedgerTables({data}:{data:LedgerSnapshot}){return <>
 <Section title="Comprobantes al corte" description={`${data.documentos.length} documentos; hasta 100 visibles. Los saldos incluyen todos.`} flush>
 <Table><THead><tr>{['Fecha','Concepto / contraparte','Total','Cobrado / pagado','Pendiente','Vencimiento'].map(h=><TH key={h}>{h}</TH>)}</tr></THead><TBody>{data.documentos.slice(0,100).map(d=><TR key={d.id}><TD>{fmtDate(d.fecha)}</TD><TD>{d.descripcion??d.categoria}<span className="block text-xs text-muted-foreground">{d.contraparte??'Sin contraparte'} · {d.tipo}{d.metodo_pago?` · acordado: ${d.metodo_pago.replaceAll('_',' ')}`:''}{d.plazo_dias!=null?` · ${d.plazo_dias} días`:''}</span></TD><TD>{money(d.monto)}</TD><TD>{money(d.pagado)}</TD><TD>{money(d.pendiente)}</TD><TD>{fmtDate(d.vencimiento)}</TD></TR>)}</TBody></Table>
 {!data.documentos.length&&<p className="p-4 text-sm text-muted-foreground">Sin comprobantes registrados.</p>}</Section>
 <Section title="Movimientos de caja del mes" description="Hasta 100 registros. Las transferencias internas no se cuentan como cobros/pagos operativos." flush>
 <Table><THead><tr><TH>Fecha</TH><TH>Cuenta</TH><TH>Tipo</TH><TH>Método</TH><TH>Importe</TH></tr></THead><TBody>{data.asientos.filter(e=>businessToday(new Date(e.fecha)).slice(0,7)===data.mes).slice(0,100).map(e=><TR key={e.id}><TD>{fmtDate(e.fecha)}</TD><TD>{data.cuentas.find(c=>c.id===e.cuenta_id)?.nombre}</TD><TD>{e.transferencia_id?'Transferencia':e.reversa_de?'Reversión':'Cobro / pago'}</TD><TD>{e.metodo_pago??'Sin informar'}</TD><TD>{money(e.monto)}</TD></TR>)}</TBody></Table></Section>
 </>;}
