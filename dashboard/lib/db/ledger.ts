import 'server-only';
import {createClient} from '@/lib/supabase/server';
import {databaseError} from '@/lib/commands/errors';
import {ledgerSchema,monthSchema} from './ledger-types';
export async function getLedger(month:string){
 const client=await createClient();
 const result=await client.rpc('ganpro_ledger_snapshot',{p_month:monthSchema.parse(month)});
 if(result.error)throw databaseError(result.error);
 return ledgerSchema.parse(result.data);
}
