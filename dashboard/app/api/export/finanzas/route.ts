import {randomUUID} from 'node:crypto';
import {getSessionPerfil} from '@/lib/db/auth';
import {getLedger} from '@/lib/db/ledger';
import {monthSchema} from '@/lib/db/ledger-types';
import {businessToday} from '@/lib/calc/business-date';
import {csvFile} from '@/lib/calc/csv-export';
import {publicFailure} from '@/lib/commands/errors';
import {logFailure} from '@/lib/commands/events';
export async function GET(request:Request){
 const requestId=randomUUID();const headers={'X-Request-Id':requestId,'Cache-Control':'no-store'};
 try{
  const profile=await getSessionPerfil();if(!profile)return Response.json({error:'Iniciá sesión',requestId},{status:401,headers});
  const month=monthSchema.safeParse(new URL(request.url).searchParams.get('mes'));if(!month.success)return Response.json({error:'Período inválido',requestId},{status:400,headers});
  const data=await getLedger(month.data);if(data.documentos.length+data.asientos.length>10000)return Response.json({error:'La exportación supera 10.000 registros. Acotá el período.',requestId},{status:400,headers});
  const rows:unknown[][]=[['Tipo','Fecha / corte','Concepto','Importe ARS','Pagado','Pendiente'],...Object.entries(data.totales).map(([key,value])=>['Resumen',data.mes,key,value,'','']),...data.cuentas.map(a=>['Cuenta',data.mes,a.nombre,a.saldo,'','']),...data.documentos.map(d=>[d.tipo,new Date(d.fecha).toISOString().slice(0,10),d.descripcion??d.categoria,d.monto,d.pagado,d.pendiente]),...data.asientos.filter(a=>businessToday(new Date(a.fecha)).slice(0,7)===data.mes).map(a=>[a.transferencia_id?'Transferencia':a.reversa_de?'Reversión':'Cobro / pago',new Date(a.fecha).toISOString().slice(0,10),data.cuentas.find(c=>c.id===a.cuenta_id)?.nombre,a.monto,'',''])];
  return new Response(csvFile(rows),{headers:{...headers,'Content-Type':'text/csv;charset=utf-8','Content-Disposition':`attachment; filename="finanzas-${data.mes}.csv"`}});
 }catch(error){logFailure(error,requestId,'finance.export');return Response.json({...publicFailure(error),requestId},{status:503,headers});}
}
