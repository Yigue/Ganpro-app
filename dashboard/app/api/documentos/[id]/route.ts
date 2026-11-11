import {randomUUID} from 'node:crypto';
import {getSessionPerfil} from '@/lib/db/auth';
import {createClient} from '@/lib/supabase/server';
import {databaseError} from '@/lib/commands/errors';
import {logFailure} from '@/lib/commands/events';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const requestId=randomUUID();try{
  if(!await getSessionPerfil())return Response.json({error:'Iniciá sesión',requestId},{status:401});
  const client=await createClient(),{id}=await params;
  const result=await client.from('documentos_comprobantes').select('path').eq('id',id).maybeSingle();
  if(result.error)throw databaseError(result.error);if(!result.data)return Response.json({error:'No se encontró el comprobante',requestId},{status:404});
  const signed=await client.storage.from('comprobantes').createSignedUrl(result.data.path,60);
  if(signed.error)throw databaseError(signed.error);
  return new Response(null,{status:303,headers:{Location:signed.data.signedUrl,'Cache-Control':'no-store'}});
 }catch(error){logFailure(error,requestId,'document.download');return Response.json({error:'No pudimos descargar el comprobante.',requestId},{status:503,headers:{'Cache-Control':'no-store'}});}
}
