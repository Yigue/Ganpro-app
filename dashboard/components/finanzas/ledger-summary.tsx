import Link from 'next/link';
import {StatCard} from '@/components/ui/stat-card';
import type {LedgerSnapshot} from '@/lib/db/ledger-types';
import {money} from './money';
export function LedgerSummary({data}:{data:LedgerSnapshot}){return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
 ['Caja / bancos',data.cuentas.length?money(data.totales.saldo):'Sin cuentas'],['Por cobrar',money(data.totales.por_cobrar)],['Por pagar',money(data.totales.por_pagar)],['Flujo neto del mes',money(data.totales.flujo)],['Cobros del mes',money(data.totales.cobros)],['Pagos del mes',money(data.totales.pagos)],['Cobros vencidos',money(data.totales.cobros_vencidos)],['Pagos vencidos',money(data.totales.pagos_vencidos)],
 ].map(([label,value])=><Link key={label} href={`/finanzas?mes=${data.mes}`}><StatCard label={label} value={value} hint={`Corte ${data.mes} · ARS`}/></Link>)}</div>;}
