import {afterEach,expect,it,vi} from 'vitest';
import {z} from 'zod';
vi.mock('server-only',()=>({}));
vi.mock('@/lib/db/auth',()=>({requireRol:vi.fn(async()=>{})}));
vi.mock('@/lib/supabase/server',()=>({createClient:vi.fn(async()=>({}))}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
import {crearAccion,fechaOperacionMs} from '@/lib/db/actions';
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it('preserves the original form clock when the same operation is resent after midnight',async()=>{
 vi.spyOn(console,'info').mockImplementation(()=>{});vi.useFakeTimers();
 const captured=Date.parse('2026-11-18T23:50:00-03:00'),sent:number[]=[];
 const action=crearAccion(z.object({fecha:z.string()}),async data=>{sent.push(fechaOperacionMs(data.fecha));},{name:'test.clock',revalidate:[]});
 const form=new FormData();form.set('fecha','2026-11-18');
 form.set('_commandKey','10000000-0000-4000-8000-000000000001');form.set('_operationAt',String(captured));
 vi.setSystemTime(captured+60000);expect((await action({},form)).ok).toBe(true);
 vi.setSystemTime(captured+3600000);expect((await action({},form)).ok).toBe(true);
 expect(sent).toEqual([captured,captured]);
});
it('rejects an invalid or far-future submitted clock before calling the handler',async()=>{
 vi.spyOn(console,'info').mockImplementation(()=>{});vi.spyOn(console,'error').mockImplementation(()=>{});
 const handler=vi.fn(async()=>{}),action=crearAccion(z.object({}),handler,{name:'test.clock',revalidate:[]});
 for(const value of ['NaN',String(Date.now()+86400000)]){
  const form=new FormData();form.set('_operationAt',value);
  expect((await action({},form)).code).toBe('VALIDATION');
 }
 expect(handler).not.toHaveBeenCalled();
});
