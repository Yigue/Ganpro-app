import {expect,it,vi} from 'vitest';
import {assertOperationSchema} from './schema-check';
import {publicFailure} from './errors';
it('checks new stock and commercial columns without reading animal or financial data',async()=>{
 const probe=vi.fn(async()=>({error:null}));await assertOperationSchema('stock.generic',probe);expect(probe.mock.calls).toHaveLength(1);
 probe.mockClear();await assertOperationSchema('stock.movement',probe);expect(probe.mock.calls).toHaveLength(2);
 probe.mockClear();await assertOperationSchema('finance.account',probe);expect(probe).not.toHaveBeenCalled();
});
it('distinguishes an outdated schema from invalid user input and hides provider details',async()=>{
 for(const code of ['42703','42P01','PGRST204','PGRST205']){
  const failure=await assertOperationSchema('stock.generic',async()=>({error:{code,message:'private database details'}})).catch(publicFailure);
  expect(failure).toMatchObject({code:'SETUP_REQUIRED'});expect(JSON.stringify(failure)).not.toContain('private');
 }
});
it('does not reinterpret connectivity or authorization failures as pending migrations',async()=>{
 const failure=await assertOperationSchema('stock.movement',async()=>({error:{code:'42501',message:'private policy'}})).catch(publicFailure);
 expect(failure).toMatchObject({code:'SERVICE_UNAVAILABLE'});
});
it('never sends a stock write when its required columns are missing',async()=>{
 const {runOperation}=await import('./rpc');const {commandContext}=await import('./context');
 const rpc=vi.fn();const limit=vi.fn(async()=>({error:{code:'42703',message:'internal schema'}}));
 const client={from:vi.fn(()=>({select:vi.fn(()=>({limit}))})),rpc} as unknown as import('@/lib/supabase/server').ServerClient;
 await commandContext.run({key:'test',requestId:'test',command:'stock.generic'},async()=>{
  await expect(runOperation(client,'stock.generic',{cantidad:1})).rejects.toMatchObject({code:'SETUP_REQUIRED'});
 });
 expect(rpc).not.toHaveBeenCalled();expect(limit).toHaveBeenCalledWith(0);
});
