import {afterEach,expect,it,vi} from 'vitest';
import {createBoundedFetch} from './fetch';
afterEach(()=>vi.unstubAllGlobals());
it('limits stalled response bodies, not just connection headers, without retrying writes',async()=>{
 const raw=vi.fn(async(_url:unknown,options:RequestInit)=>({status:200,statusText:'OK',headers:new Headers(),arrayBuffer:()=>new Promise<ArrayBuffer>((_resolve,reject)=>options.signal?.addEventListener('abort',()=>reject(new Error('aborted'))))}));
 vi.stubGlobal('fetch',raw);await expect(createBoundedFetch(5)('https://test.invalid',{method:'POST'})).rejects.toThrow('aborted');expect(raw).toHaveBeenCalledTimes(1);
});
it('preserves successful payloads and empty HTTP responses',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(null,{status:204})));expect((await createBoundedFetch()('https://test.invalid')).status).toBe(204);
});
