import {loadReproduccion} from '@/lib/db/page-reproduccion';
import {ReproduccionView0} from '@/components/reproduccion/page/view-0';
import {ReproduccionView1} from '@/components/reproduccion/page/view-1';
import {ReproduccionView2} from '@/components/reproduccion/page/view-2';
export const metadata = { title: 'Reproducción' };
export default async function Page(){const data=await loadReproduccion();return <><ReproduccionView0 data={data}/><ReproduccionView1 data={data}/><ReproduccionView2 data={data}/></>;}
