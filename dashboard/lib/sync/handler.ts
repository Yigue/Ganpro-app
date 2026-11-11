import 'server-only';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { databaseError, publicFailure } from '@/lib/commands/errors';
import { logFailure } from '@/lib/commands/events';
import { z } from 'zod';
function validKey(received: string | null): boolean {
 const expected=process.env.SYNC_API_KEY;if(!received||!expected)return false;
 const a=Buffer.from(received),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b);
}
/** The mobile protocol is unchanged; internal SQL/API errors never leave the server. */
export async function handleSync(request:NextRequest,action:string,keyFromPath:string|null){
 const requestId=randomUUID();
 const response=(status:number,body:unknown)=>NextResponse.json(body,{status,headers:{'X-Request-Id':requestId,'Cache-Control':'no-store'}});
 if(!validKey(keyFromPath??request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')??null))return response(401,{error:'Clave de sincronización inválida',requestId});
 if(action==='ping'&&request.method==='GET')return response(200,{ok:true,timestamp:Date.now()});
 const since=z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER).safeParse(request.nextUrl.searchParams.get('last_pulled_at')??0);
 if(!since.success)return response(400,{error:'Fecha de sincronización inválida',requestId});
 try{
  const client=createAdminClient();
  if(action==='pull'&&request.method==='GET'){
   const result=await client.rpc('ganpro_sync_pull',{p_last_pulled_at:since.data});
   if(result.error)throw databaseError(result.error);return response(200,result.data);
  }
  if(action==='push'&&request.method==='POST'){
   let changes:unknown;try{changes=await request.json();}catch{return response(400,{error:'JSON inválido',requestId});}
   if(!changes||typeof changes!=='object'||Array.isArray(changes))return response(400,{error:'Formato de sincronización inválido',requestId});
   const result=await client.rpc('ganpro_sync_push',{p_changes:changes,p_last_pulled_at:since.data});
   if(result.error)throw databaseError(result.error);return response(200,{ok:true});
  }
  return response(404,{error:'Acción desconocida',requestId});
 }catch(error){
  const failure=publicFailure(error);logFailure(error,requestId,'sync.'+action);
  return response(failure.code==='CONFLICT'?409:failure.code==='INVALID_INPUT'?400:503,{error:failure.error,code:failure.code,requestId});
 }
}
