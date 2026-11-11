import {loadSanidad} from '@/lib/db/page-sanidad';
import {SanidadView0} from '@/components/sanidad/page/view-0';
import {SanidadView1} from '@/components/sanidad/page/view-1';
import {SanidadView2} from '@/components/sanidad/page/view-2';
export const metadata = { title: 'Sanidad' };
export default async function Page(){const data=await loadSanidad();return <><SanidadView0 data={data}/><SanidadView1 data={data}/><SanidadView2 data={data}/></>;}
