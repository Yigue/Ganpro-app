import Link from 'next/link';
import {financialAnalysis} from '@/lib/db/financial-analysis';
import {AnalysisHeader} from '@/components/finanzas/AnalysisHeader';
import {AnalysisMargins} from '@/components/finanzas/AnalysisMargins';
import {AnalysisDetails} from '@/components/finanzas/AnalysisDetails';
import {AnalysisHistory} from '@/components/finanzas/AnalysisHistory';
export default async function Page({searchParams}:{searchParams:Promise<{moneda?:string}>}){const data=await financialAnalysis(searchParams);return <><Link className='text-primary underline' href='/finanzas'>Volver a caja y obligaciones</Link><p className='text-sm text-muted-foreground'>Análisis por fecha de comprobante, distinto de caja. Sin cierre de inventario, el resultado es parcial. La valuación extrapola pesos conocidos y requiere precios: revisá su cobertura antes de decidir.</p><AnalysisHeader data={data}/><AnalysisMargins data={data}/><AnalysisDetails data={data}/><AnalysisHistory data={data}/></>;}
