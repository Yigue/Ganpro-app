'use server';
import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {executeCommand} from '@/lib/commands/execute';
import {commandContext} from '@/lib/commands/context';
import type {ActionState} from '@/lib/commands/result';
import {InputError,databaseError} from '@/lib/commands/errors';
import {requireRol} from '@/lib/db/auth';
import {createClient} from '@/lib/supabase/server';
import {runOperation} from '@/lib/commands/rpc';
import {operationMessage} from '@/lib/commands/message';
import {revalidatePath} from 'next/cache';
/** Binary signatures and a private bucket avoid trusting a filename or public URL. */
export async function adjuntarComprobante(_:ActionState,form:FormData):Promise<ActionState>{
 const raw=form.get('_commandKey'),key=z.string().uuid().safeParse(raw);
 return executeCommand({name:'document.attach',key:key.success?key.data:randomUUID(),handle:async()=>{
  await requireRol('admin','campo');if(raw&&!key.success)throw new InputError();
  const file=form.get('archivo'),movement=z.string().min(1).safeParse(form.get('movimiento_id'));
  if(!(file instanceof File)||!movement.success||file.size===0||file.size>4194304)throw new InputError({archivo:['Elegí PDF, PNG o JPEG de hasta 4 MB.']});
  const bytes=Buffer.from(await file.arrayBuffer());
  const type=bytes.subarray(0,5).toString()==='%PDF-'?{mime:'application/pdf',ext:'pdf'}:bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?{mime:'image/png',ext:'png'}:bytes[0]===255&&bytes[1]===216&&bytes[2]===255?{mime:'image/jpeg',ext:'jpg'}:null;
  if(!type)throw new InputError({archivo:['El contenido debe ser PDF, PNG o JPEG.']});
  const client=await createClient();const {data,error}=await client.auth.getUser();if(error)throw databaseError(error);
  if(!data.user)throw new InputError();
  const sha=createHash('sha256').update(bytes).digest('hex'),path=`${data.user.id}/${commandContext.getStore()!.key}-${sha}.${type.ext}`;
  const upload=await client.storage.from('comprobantes').upload(path,bytes,{contentType:type.mime,upsert:false});
  // A lost response may leave the same immutable object. The DB receipt verifies the command fingerprint.
  if(upload.error&&String(upload.error.statusCode)!=='409'&&upload.error.message!=='The resource already exists')throw databaseError(upload.error);
  const message=operationMessage(await runOperation(client,'document.attach',{movimiento_id:movement.data,path,sha256:sha,nombre:file.name.replace(/[\x00-\x1f]/g,'').slice(0,180)}));
  try{revalidatePath('/gestion');}catch{console.warn('Document saved; cache refresh failed');}return message;
 }});
}
