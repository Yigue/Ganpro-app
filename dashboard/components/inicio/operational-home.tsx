import Link from 'next/link';
import {getLedger} from '@/lib/db/ledger';
import {getMapData} from '@/lib/maps/data';
import {businessToday} from '@/lib/calc/business-date';
import {LedgerSummary} from '@/components/finanzas/ledger-summary';
import {Section} from '@/components/ui/section';
/** The same snapshot serves home and finance, avoiding incompatible totals. */
export async function OperationalHome(){
 const [ledger,paddocks]=await Promise.all([getLedger(businessToday().slice(0,7)),getMapData()]);
 return <>
  <Section title="Caja y compromisos" description="Saldos al cierre del mes seleccionado. Aperturas y transferencias no son ingresos.">
   <LedgerSummary data={ledger}/>
   {ledger.anteriores.cantidad>0&&<Link href="/finanzas" className="mt-3 block text-sm text-amber-700 underline">{ledger.anteriores.cantidad} movimientos anteriores por conciliar; todavía no integran estos saldos.</Link>}
  </Section>
  <Section title="Potreros" description="Ocupación actual del campo. Tocá un potrero para abrir su ficha y dibujo en el mapa.">
   <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{paddocks.map(p=><Link key={p.id} href={`/mapa?potrero=${encodeURIComponent(p.id)}`} className="rounded-lg border p-3 hover:bg-muted">
    <strong>{p.nombre}</strong><p className="text-sm">{p.cabezas} cabezas · {p.hectareas?.toFixed(2)??'—'} ha</p>
    <p className="text-xs text-muted-foreground">{p.geometry?'Superficie dibujada':p.invalid?'Revisar geometría anterior':'Pendiente de dibujar'} · {p.tipo.replaceAll('_',' ').toLowerCase()}</p>
   </Link>)}</div>
   <Link href="/mapa" className="mt-3 inline-block text-sm underline">Abrir mapa · calles, satélite y relieve</Link>
  </Section>
 </>;
}
