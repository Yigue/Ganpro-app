import Link from 'next/link';
import {PageHeader,Section} from '@/components/ui/section';
import {CashForms} from '@/components/finanzas/cash-forms';
import {DocumentForm} from '@/components/finanzas/document-form';
import {Corrections} from '@/components/finanzas/corrections';
import {LedgerTables} from '@/components/finanzas/ledger-tables';
import {LedgerSummary} from '@/components/finanzas/ledger-summary';
import {money} from '@/components/finanzas/money';
import {getLedger} from '@/lib/db/ledger';
import {monthSchema} from '@/lib/db/ledger-types';
import {businessToday} from '@/lib/calc/business-date';
import {getLotes} from '@/lib/db/client';
import {canEdit,getSessionPerfil} from '@/lib/db/auth';
export const metadata={title:'Finanzas'};
export default async function FinancePage({searchParams}:{searchParams:Promise<{mes?:string}>}){
 const params=await searchParams;const parsed=monthSchema.safeParse(params.mes??businessToday().slice(0,7));
 if(!parsed.success)return <p role="alert">El período es inválido. <Link href="/finanzas">Volver a finanzas</Link></p>;
 const [data,lotes,profile]=await Promise.all([getLedger(parsed.data),getLotes(),getSessionPerfil()]);
 const editable=canEdit(profile?.rol);
 return <>
 <PageHeader title="Finanzas: caja y obligaciones" description="Comprobantes, saldos, cobros y pagos reales. El saldo de caja no es la utilidad." actions={<Link className="text-sm text-primary underline" href="/finanzas/analisis">Análisis económico y proyección</Link>}/>
 <form className="flex flex-wrap items-end gap-3"><label className="text-sm">Período<input name="mes" type="month" defaultValue={parsed.data} className="ml-2 rounded border bg-card p-2"/></label><button className="rounded border px-3 py-2 text-sm">Aplicar</button><a className="text-sm text-primary underline" href={`/api/export/finanzas?mes=${parsed.data}`}>Exportar finanzas CSV</a></form>
 <p className="text-sm text-muted-foreground">Saldos y pendientes al cierre del mes (o última operación disponible); cobros/pagos dentro del mes. Las existencias del campo son actuales.</p>
 <LedgerSummary data={data}/>
 {data.anteriores.cantidad>0&&<Section title="Movimientos anteriores por conciliar" description={`${data.anteriores.cantidad} registros conservados. No se asumieron pagos ni cuentas. Adoptalos con «Conciliar anteriores» sin duplicar comprobantes.`}><p className="text-sm">Los pagos anteriores al saldo inicial se declaran al conciliar y no generan nueva caja. Los análisis económicos conservan el mismo registro original.</p></Section>}
 <Section title="Cajas y bancos">{data.cuentas.length?data.cuentas.map(a=><p key={a.id} className="flex justify-between border-b py-2"><span>{a.nombre}</span><strong>{money(a.saldo)}</strong></p>):<p>Sin cuentas: abrí una caja o banco con su saldo inicial para empezar.</p>}</Section>
 {editable&&<Section title="Registrar operación"><div className="flex flex-wrap gap-2"><DocumentForm lotes={lotes} cuentas={data.cuentas}/><CashForms data={data}/><Corrections data={data}/><Link className="px-2 py-2 text-sm text-primary underline" href="/movimientos">Compra / venta de ganado</Link></div></Section>}
 <LedgerTables data={data}/>
 <Link href="/movimientos" className="text-sm text-primary underline">Historial ganadero y comprobantes</Link>
 </>;
}
