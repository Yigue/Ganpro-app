import {MapWorkspace} from '@/components/mapa/map-workspace';
import {PageHeader} from '@/components/ui/section';
import {getMapData} from '@/lib/maps/data';
import {getSessionPerfil,canEdit} from '@/lib/db/auth';
export const metadata={title:'Mapa de potreros'};
export default async function MapPage({searchParams}:{searchParams:Promise<{potrero?:string}>}){const [paddocks,profile,params]=await Promise.all([getMapData(),getSessionPerfil(),searchParams]);return <><PageHeader title="Mapa del campo" description="Potreros reales, hectáreas y ocupación. Lotes ganaderos y potreros mantienen sus registros existentes."/><MapWorkspace initialSelected={params.potrero} paddocks={paddocks} editable={canEdit(profile?.rol)}/></>;}
