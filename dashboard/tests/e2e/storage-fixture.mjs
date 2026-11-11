// Local test-only Storage API. Object metadata and policies use real PostgreSQL RLS.
export function storageFixture({pool,valid,token}){
 const files=new Map();
 const actor=async(user,fn)=>{const c=await pool.connect();try{await c.query('BEGIN');await c.query('SET LOCAL ROLE authenticated');await c.query("SELECT set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:user.id,role:'authenticated'})]);const value=await fn(c);await c.query('COMMIT');return value;}catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}};
 return async(req,res)=>{
  const prefix='/storage/v1/object/',url=new URL(req.url,'http://127.0.0.1:55442');
  if(!url.pathname.startsWith(prefix))return false;
  const user=valid((req.headers.authorization??'').replace(/^Bearer /,''));
  const signed=url.pathname.startsWith(prefix+'sign/'),raw=url.pathname.slice((prefix+(signed?'sign/':'')).length);
  const path=decodeURIComponent(raw.replace(/^comprobantes\//,''));
  res.setHeader('Content-Type','application/json');
  if(req.method==='POST'&&!signed){
   if(!user){res.writeHead(401).end('{}');return true;}
   const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);
   try{await actor(user,c=>c.query("INSERT INTO storage.objects(bucket_id,name,owner_id,metadata) VALUES('comprobantes',$1,$2,$3)",[path,user.id,JSON.stringify({mimetype:req.headers['content-type'],size:body.length})]));files.set(path,body);res.writeHead(200).end(JSON.stringify({Key:`comprobantes/${path}`}));}
   catch(error){const status=error.code==='23505'?409:403;res.writeHead(status).end(JSON.stringify({statusCode:String(status),error:'Storage fixture rejected write'}));}
   return true;
  }
  if(req.method==='POST'&&signed){
   if(!user){res.writeHead(401).end('{}');return true;}
   const rows=await actor(user,async c=>(await c.query("SELECT name FROM storage.objects WHERE bucket_id='comprobantes' AND name=$1",[path])).rows);
   if(!rows.length){res.writeHead(403).end('{}');return true;}
   const access=token({role:'authenticated',sub:user.id,path,exp:Math.floor(Date.now()/1000)+60});
   res.writeHead(200).end(JSON.stringify({signedURL:`/object/sign/comprobantes/${path}?token=${access}`}));return true;
  }
  if(req.method==='GET'&&signed){
   const access=url.searchParams.get('token')??'',reader=valid(access);let claims;try{claims=JSON.parse(Buffer.from(access.split('.')[1]??'','base64url'));}catch{claims={};}
   if(!reader||claims.path!==path||!files.has(path)){res.writeHead(403).end('{}');return true;}
   res.setHeader('Content-Type','application/pdf');res.writeHead(200).end(files.get(path));return true;
  }
  res.writeHead(404).end('{}');return true;
 };
}
