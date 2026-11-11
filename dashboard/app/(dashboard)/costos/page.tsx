import {loadCostos} from '@/lib/db/page-costos';
import {CostosView0} from '@/components/costos/page/view-0';
import {CostosView1} from '@/components/costos/page/view-1';
export const metadata = { title: 'Costos' };
export default async function Page({ searchParams }: { searchParams: Promise<{ ej?: string }> }){const data=await loadCostos({ searchParams });return <><CostosView0 data={data}/><CostosView1 data={data}/></>;}
