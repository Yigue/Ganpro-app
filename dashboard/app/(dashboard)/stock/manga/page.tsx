import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ReadingSession} from '@/components/stock/reading-session';
import {PageHeader} from '@/components/ui/section';
import {getAnimals,getCategoriasConfig,getLotes,getPotreros} from '@/lib/db/client';
import {getSessionPerfil,canEdit} from '@/lib/db/auth';
export const metadata={title:'Modo manga'};
export default async function MangaPage(){
 const profile=await getSessionPerfil();if(!profile||!canEdit(profile.rol))notFound();
 const [animals,categorias,lotes,potreros]=await Promise.all([getAnimals(),getCategoriasConfig(),getLotes(),getPotreros()]);
 return <><Link className="text-sm underline" href="/stock">Volver a Stock</Link><PageHeader title="Modo manga · altas y lecturas" description="Lectura, revisión y confirmación de animales en una sesión."/><ReadingSession userId={profile.id} animals={animals} categorias={categorias} lotes={lotes} potreros={potreros}/></>;
}
