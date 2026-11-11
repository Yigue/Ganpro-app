import {InputError} from '@/lib/commands/errors';
export interface BankRow{fecha:number;referencia:string;descripcion:string;monto:string}
/** Explicit semicolon CSV; quoted delimiters and escaped quotes are preserved. No rows are skipped. */
export function parseBankCsv(text:string,toDate:(value:string)=>number):BankRow[]{
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(char==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(!quoted&&(char===';'||char==='\n')){row.push(cell.trim());cell='';if(char==='\n'){if(row.some(Boolean))rows.push(row);row=[];}}
  else if(char!=='\r')cell+=char;
 }
 if(quoted)throw new InputError({csv:['Hay comillas sin cerrar.']});
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);
 if(rows.shift()?.join(';').toLowerCase().replace(/^\uFEFF/,'')!=='fecha;referencia;descripcion;monto'||!rows.length||rows.length>2000)throw new InputError({csv:['Usá fecha;referencia;descripcion;monto, con hasta 2.000 filas.']});
 const seen=new Set<string>();
 return rows.map((cells,index)=>{
  const [date,reference,description,amount]=cells;
  if(cells.length!==4||!reference||reference.length>200||seen.has(reference)||description.length>500||!/^[-]?\d{1,12}(\.\d{1,2})?$/.test(amount)||Number(amount)===0)throw new InputError({csv:[`Revisá la fila ${index+2}: referencia única e importe con punto decimal.`]});
  seen.add(reference);return {fecha:toDate(date),referencia:reference,descripcion:description,monto:amount};
 });
}
