import 'server-only';
import {cache} from 'react';
import {createClient} from '@/lib/supabase/server';
import {databaseError} from '@/lib/commands/errors';
import {managementSchema} from './schema';
export const getManagement=cache(async()=>{
 const client=await createClient();const result=await client.rpc('ganpro_management_snapshot');
 if(result.error)throw databaseError(result.error);
 return managementSchema.parse(result.data);
});
