import Link from 'next/link';
import {Section} from '@/components/ui/section';
const operations=[
 ['Ganado','Altas, animales sin caravana y lectura electrónica','/stock','bg-emerald-50 text-emerald-900'],
 ['Movimientos','Compras, ventas por kg o cabeza y traslados','/movimientos','bg-blue-50 text-blue-900'],
 ['Insumos','Aperturas, compras y consumos','/gestion?vista=insumos','bg-amber-50 text-amber-900'],
 ['Sanidad','Programar y registrar aplicaciones','/sanidad','bg-rose-50 text-rose-900'],
 ['Reproducción','Servicio, tacto, parto y destete','/gestion?vista=reproduccion','bg-violet-50 text-violet-900'],
 ['Pastoreo','Entradas, salidas y descanso de potreros','/gestion?vista=pastoreo','bg-lime-50 text-lime-900'],
 ['Caja y bancos','Comprobantes, cobros y pagos','/finanzas','bg-cyan-50 text-cyan-900'],
 ['Administración','Inventarios físicos, conciliación y archivos','/gestion?vista=inventarios','bg-slate-50 text-slate-900'],
];
export function ManagementOverview(){return <Section title="¿Qué querés registrar?" description="Elegí una operación para continuar. Los cambios quedan vinculados con stock, producción y administración."><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{operations.map(([label,description,href,color])=><Link key={label} href={href} className={`rounded-xl border p-4 transition-shadow hover:shadow-md ${color}`}><h3 className="mb-1 font-semibold">{label}</h3><p className="text-sm">{description}</p><span className="mt-3 inline-block text-sm font-medium">Abrir →</span></Link>)}</div></Section>;}
