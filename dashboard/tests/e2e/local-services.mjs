// Test-only Auth emulator. REST/RPC, PostgreSQL, RLS and Next SSR remain real.
// Never point this process at a production database or expose it outside loopback.
import {createServer} from 'node:http';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {Pool} from 'pg';
import {storageFixture} from './storage-fixture.mjs';
export const secret='ganpro_local_only_jwt_secret_32_characters';
export const token=claims=>{const head=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');const body=Buffer.from(JSON.stringify({aud:'authenticated',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+86400,...claims})).toString('base64url');const data=`${head}.${body}`;return `${data}.${createHmac('sha256',secret).update(data).digest('base64url')}`;};
const url=new URL(process.env.GANPRO_TEST_DATABASE_URL??'');
if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.endsWith('_tests'))throw new Error('Dedicated local _tests DB required');
const pool=new Pool({connectionString:url.toString()});
const users=['admin','advisor','field'].map((name,i)=>({id:`10000000-0000-4000-8000-00000000000${i+1}`,email:`${name}@test.invalid`,aud:'authenticated',role:'authenticated',app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],created_at:'2026-01-01T00:00:00Z'}));
for(const user of users)await pool.query("INSERT INTO auth.users(id,email) VALUES($1,$2) ON CONFLICT(id) DO NOTHING",[user.id,user.email]);
await pool.query("UPDATE perfiles SET rol=CASE WHEN email='admin@test.invalid' THEN 'admin' WHEN email='field@test.invalid' THEN 'campo' ELSE 'asesor' END");
const valid=jwt=>{try{const [h,b,s]=jwt.split('.');const wanted=createHmac('sha256',secret).update(`${h}.${b}`).digest();const actual=Buffer.from(s,'base64url');if(actual.length!==wanted.length||!timingSafeEqual(actual,wanted))return null;const claims=JSON.parse(Buffer.from(b,'base64url'));return claims.exp>Date.now()/1000?users.find(u=>u.id===claims.sub):null;}catch{return null;}};
const session=user=>({access_token:token({role:'authenticated',sub:user.id,email:user.email}),refresh_token:`local-${user.id}`,expires_in:86400,token_type:'bearer',user});
await pool.query("INSERT INTO suplementos(id,nombre,tipo,materia_seca_pct,stock_kg) VALUES('browser-food','Alimento navegador','MAIZ',90,100) ON CONFLICT(id) DO NOTHING");
const storage=storageFixture({pool,valid,token});
const server=createServer(async(req,res)=>{
 try{
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:3005');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204).end();return;}
  if(await storage(req,res))return;
  if(req.url.startsWith('/rest/v1')){
   const chunks=[];for await(const c of req)chunks.push(c);const headers={...req.headers};delete headers.host;delete headers['content-length'];
   const upstream=await fetch(`http://127.0.0.1:55441${req.url.slice(8)}`,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
   res.writeHead(upstream.status,Object.fromEntries(upstream.headers));res.end(Buffer.from(await upstream.arrayBuffer()));return;
  }
  res.setHeader('Content-Type','application/json');
  if(req.url.startsWith('/auth/v1/token')){
   const chunks=[];for await(const c of req)chunks.push(c);const data=JSON.parse(Buffer.concat(chunks));
   const user=users.find(u=>(data.password==='local-test-only'&&u.email===data.email)||data.refresh_token===`local-${u.id}`);
   res.writeHead(user?200:400).end(JSON.stringify(user?session(user):{error:'invalid_grant',error_description:'Invalid credentials'}));return;
  }
  if(req.url.startsWith('/auth/v1/user')){const user=valid((req.headers.authorization??'').replace(/^Bearer /,''));res.writeHead(user?200:401).end(JSON.stringify(user??{error:'unauthorized'}));return;}
  if(req.url.startsWith('/auth/v1/logout')){res.writeHead(204).end();return;}
  res.writeHead(404).end('{}');
 }catch{res.writeHead(503).end(JSON.stringify({error:'Local test service failure'}));}
});
server.listen(55442,'127.0.0.1',()=>console.log('Local Auth fixture and REST proxy on 127.0.0.1:55442'));
