import type { ServerClient } from '@/lib/supabase/server';
import { commandContext } from './context';
import {assertOperationSchema} from './schema-check';
import {z} from 'zod';
import { databaseError,DomainError,DataError } from './errors';
/** Native PostgreSQL transaction; no service role for user operations. */
export async function runOperation(client: ServerClient, name: string, data: unknown) {
  const key = commandContext.getStore()?.key;
  if (!key) throw new Error('Command context required');
  await assertOperationSchema(name,async(table,columns)=>{const {error}=await client.from(table).select(columns).limit(0);return {error};});
  if(['stock.generic','stock.readings','stock.save','stock.movement','stock.lot-save','finance.settle'].includes(name)){
    const status=await client.rpc('ganpro_stock_capabilities');
    if(status.error){if(status.error.code==='PGRST202')throw new DomainError('SETUP_REQUIRED');throw databaseError(status.error);}
    const parsed=z.object({version:z.number().int(),intake:z.boolean(),movement:z.boolean(),lots:z.boolean()}).safeParse(status.data);
    if(!parsed.success)throw new DataError('INVALID_OUTPUT');
    if(parsed.data.version<60||!parsed.data.intake||!parsed.data.movement||!parsed.data.lots)throw new DomainError('SETUP_REQUIRED');
  }
  const result = await client.rpc('ganpro_command', { p_name: name, p_key: key, p_data: data });
  if (result.error) throw databaseError(result.error);
  return result.data as unknown;
}
