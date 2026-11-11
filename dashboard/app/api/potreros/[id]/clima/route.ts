import {randomUUID} from 'node:crypto';
import {getSessionPerfil} from '@/lib/db/auth';
import {selectOne} from '@/lib/db/client';
import {readGeometry} from '@/lib/maps/geometry';
import {businessToday} from '@/lib/calc/business-date';
import {weatherReference,analyzeWeather} from '@/lib/weather/analysis';
import {loadForecast} from '@/lib/weather/service';
import {publicFailure} from '@/lib/commands/errors';
import {logFailure} from '@/lib/commands/events';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const requestId=randomUUID(),headers={'X-Request-Id':requestId,'Cache-Control':'private,no-store'};
 try{
  if(!await getSessionPerfil())return Response.json({error:'Iniciá sesión',requestId},{status:401,headers});
  const {id}=await params;if(!id||id.length>100)return Response.json({error:'Potrero inválido',requestId},{status:400,headers});
  const p=await selectOne('potreros',id);if(!p)return Response.json({error:'No se encontró el potrero',requestId},{status:404,headers});
  const {geometry}=readGeometry(p.geo_json);if(!geometry)return Response.json({error:'Primero guardá el límite del potrero en el mapa.',requestId},{status:422,headers});
  const point=weatherReference(geometry),today=businessToday(),loaded=await loadForecast(point[0],point[1],today);
  return Response.json(analyzeWeather(loaded.data,today,point,loaded.fetchedAt),{headers});
 }catch(error){logFailure(error,requestId,'paddock.climate');return Response.json({...publicFailure(error),requestId},{status:503,headers});}
}
