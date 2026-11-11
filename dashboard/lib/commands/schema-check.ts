import {databaseError,DomainError} from './errors';
type SchemaTable='animals'|'movimientos_financieros';
type ProbeResult={error:{code?:string;message?:string}|null};
export type SchemaProbe=(table:SchemaTable,columns:string)=>Promise<ProbeResult>;
const stockColumns='visual_pendiente';
const commercialColumns='modalidad_precio,precio_unitario,detalle_categorias';
/** A newer dashboard must not send writes to the old stock contract. Read metadata only. */
export async function assertOperationSchema(name:string,probe:SchemaProbe):Promise<void>{
 const checks:[SchemaTable,string][]=[];
 if(['stock.generic','stock.readings','stock.save','stock.movement'].includes(name))checks.push(['animals',stockColumns]);
 if(name==='stock.movement')checks.push(['movimientos_financieros',commercialColumns]);
 const results=await Promise.allSettled(checks.map(([table,columns])=>probe(table,columns)));
 for(const result of results){
  if(result.status==='rejected')throw result.reason;
  const error=result.value.error;if(!error)continue;
  if(['42703','42P01','PGRST204','PGRST205'].includes(error.code??''))throw new DomainError('SETUP_REQUIRED');
  throw databaseError(error);
 }
}
