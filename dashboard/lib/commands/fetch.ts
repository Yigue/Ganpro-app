/** Bound both headers and body for Supabase calls; preserve cancellation and never retry writes. */
export function createBoundedFetch(timeoutMs=15000):typeof fetch{
 return async(input,init)=>{
  const controller=new AbortController(),source=init?.signal??(input instanceof Request?input.signal:undefined);
  const abort=()=>controller.abort();if(source?.aborted)abort();source?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,timeoutMs);
  try{
   const response=await fetch(input,{...init,signal:controller.signal});
   const body=await response.arrayBuffer();
   return new Response([204,205,304].includes(response.status)?null:body,{status:response.status,statusText:response.statusText,headers:response.headers});
  }finally{clearTimeout(timer);source?.removeEventListener('abort',abort);}
 };
}
export const boundedFetch=createBoundedFetch();
