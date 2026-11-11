import {loadNutricion} from '@/lib/db/page-nutricion';
import {NutricionView0} from '@/components/nutricion/page/view-0';
import {NutricionView1} from '@/components/nutricion/page/view-1';
export const metadata = { title: 'Nutrición y forraje' };
export default async function Page(){const data=await loadNutricion();return <><NutricionView0 data={data}/><NutricionView1 data={data}/></>;}
