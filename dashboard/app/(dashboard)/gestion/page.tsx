import Link from 'next/link';
import {PageHeader} from '@/components/ui/section';
import {Supplies} from '@/components/gestion/supplies';
import {Reproduction} from '@/components/gestion/reproduction';
import {Grazing} from '@/components/gestion/grazing';
import {Closings} from '@/components/gestion/closings';
import {Banking} from '@/components/gestion/banking';
import {Projections} from '@/components/gestion/projections';
import {Documents} from '@/components/gestion/documents';
import type {ManagementProps} from '@/components/gestion/types';
import {getManagement} from '@/lib/management/data';
import {getAnimals,getLotes,getPotreros,getSuplementos,getCatalogo,selectAll} from '@/lib/db/client';
import {getLedger} from '@/lib/db/ledger';
import {businessToday} from '@/lib/calc/business-date';
import {getSessionPerfil,canEdit} from '@/lib/db/auth';
export const metadata={title:'Gestión integrada'};
export default async function Page({searchParams}:{searchParams:Promise<{vista?:string}>}){
 const [params,data,animals,lotes,potreros,suplementos,catalogo,servicios,ledger,perfil,lineas,escenarios,reales]=await Promise.all([searchParams,getManagement(),getAnimals(),getLotes(),getPotreros(),getSuplementos(),getCatalogo(),selectAll('servicios'),getLedger(businessToday().slice(0,7)),getSessionPerfil(),selectAll('escenario_lineas'),selectAll('escenarios'),selectAll('movimientos_financieros',{filter:q=>q.is('anulado_en',null)})]);
 const p:ManagementProps={data,animals,lotes,potreros,suplementos,catalogo,servicios,ledger,lineas,escenarios,reales,editable:canEdit(perfil?.rol),admin:perfil?.rol==='admin'};
 const tabs=[['insumos','Insumos'],['reproduccion','Reproducción'],['pastoreo','Pastoreo'],['inventarios','Inventarios'],['bancos','Bancos'],['documentos','Comprobantes'],['planes','Plan vs. real']];
 const active=tabs.some(([key])=>key===params.vista)?params.vista:'insumos';
 return <><PageHeader title="Gestión integrada" description="Conexiones entre el campo, las existencias y la administración."/><nav aria-label="Módulos de gestión" className="flex flex-wrap gap-2">{tabs.map(([key,label])=><Link key={key} href={`/gestion?vista=${key}`} aria-current={active===key?'page':undefined} className={`rounded border px-3 py-2 text-sm ${active===key?'bg-primary text-primary-foreground':''}`}>{label}</Link>)}</nav>
 {active==='insumos'&&<Supplies p={p}/>}{active==='reproduccion'&&<Reproduction p={p}/>}{active==='pastoreo'&&<Grazing p={p}/>}{active==='inventarios'&&<Closings p={p}/>}{active==='bancos'&&<Banking p={p}/>}{active==='documentos'&&<Documents p={p}/>}{active==='planes'&&<Projections p={p}/>}
 </>;
}
