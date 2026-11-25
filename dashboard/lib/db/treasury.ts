import 'server-only';
import {z} from 'zod';
import {createClient} from '@/lib/supabase/server';
import {databaseError,DomainError,DataError} from '@/lib/commands/errors';
import {ledgerDocumentSchema} from './ledger-types';
const schema=z.object({as_of:z.number(),saldo:z.string().regex(/^-?\d+(\.\d{1,2})?$/),documentos:z.array(ledgerDocumentSchema)});
export async function getTreasury(asOf?:number){
 const client=await createClient();const result=await client.rpc('ganpro_treasury_snapshot',asOf===undefined?{}:{p_as_of:asOf});
 if(result.error){if(result.error.code==='PGRST202')throw new DomainError('SETUP_REQUIRED');throw databaseError(result.error);}
 const parsed=schema.safeParse(result.data);if(!parsed.success)throw new DataError('INVALID_OUTPUT');return parsed.data;
}
