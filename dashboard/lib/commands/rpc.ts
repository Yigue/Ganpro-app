import type { ServerClient } from '@/lib/supabase/server';
import { commandContext } from './context';
import {assertOperationSchema} from './schema-check';
import { databaseError } from './errors';
/** Native PostgreSQL transaction; no service role for user operations. */
export async function runOperation(client: ServerClient, name: string, data: unknown) {
  const key = commandContext.getStore()?.key;
  if (!key) throw new Error('Command context required');
  await assertOperationSchema(name,async(table,columns)=>{const {error}=await client.from(table).select(columns).limit(0);return {error};});
  const result = await client.rpc('ganpro_command', { p_name: name, p_key: key, p_data: data });
  if (result.error) throw databaseError(result.error);
  return result.data as unknown;
}
