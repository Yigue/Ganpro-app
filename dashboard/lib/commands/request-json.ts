import { z } from 'zod';
import { DataError } from './errors';
/** Validate external output as internal data and bound network time; never retry mutations. */
export async function requestJson<S extends z.ZodTypeAny>(url:string,schema:S,options:RequestInit={},timeoutMs=10000):Promise<z.output<S>>{
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{...options,signal:controller.signal});
  if(!response.ok)throw new DataError(`HTTP_${response.status}`);
  return schema.parse(await response.json());
 }catch(error){if(error instanceof DataError)throw error;throw new DataError(error instanceof z.ZodError?'INVALID_OUTPUT':'NETWORK');}
 finally{clearTimeout(timer);}
}
