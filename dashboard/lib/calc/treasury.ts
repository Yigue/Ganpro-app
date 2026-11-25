export interface TreasuryDocument {tipo:'INGRESO'|'GASTO';pendiente:string;vencimiento:number}
export interface TreasuryInput {saldo:string;documentos:TreasuryDocument[]}
export interface CashMonth {mes:string;cobros:string;gastos:string;neto:string;acumulado:string;vencidosCobro:number;vencidosPago:number}
const cents=(money:string)=>{if(!/^-?\d+(\.\d{1,2})?$/.test(money))throw new Error('Invalid money');const negative=money.startsWith('-');const [whole,fraction='']=money.replace('-','').split('.');const value=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));return negative?-value:value;};
const decimal=(value:bigint)=>`${value<0n?'-':''}${(value<0n?-value:value)/100n}.${String((value<0n?-value:value)%100n).padStart(2,'0')}`;

/** Project only unpaid commitments from actual cash, carrying overdue documents into the first bucket. */
export function projectTreasury(input:TreasuryInput,months:string[],asOf:number):CashMonth[]{
 let balance=cents(input.saldo);
 return months.map((month,index)=>{
  let receipts=0n,payments=0n,overdueReceipts=0,overduePayments=0;
  for(const doc of input.documentos){
   const due=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit'}).formatToParts(new Date(doc.vencimiento));
   const key=`${due.find(p=>p.type==='year')?.value}-${due.find(p=>p.type==='month')?.value}`;
   const amount=cents(doc.pendiente);if(amount<=0n||!(key===month||(index===0&&key<month)))continue;
   if(doc.tipo==='INGRESO'){receipts+=amount;if(doc.vencimiento<asOf)overdueReceipts++;}
   else{payments+=amount;if(doc.vencimiento<asOf)overduePayments++;}
  }
  const net=receipts-payments;balance+=net;
  return {mes:month,cobros:decimal(receipts),gastos:decimal(payments),neto:decimal(net),acumulado:decimal(balance),vencidosCobro:overdueReceipts,vencidosPago:overduePayments};
 });
}
