/** Cells containing formulas are text; numeric monetary values remain usable as numbers. */
export function csvCell(value:unknown):string{
 let text=value==null?'':String(value);
 if(/^[=+@\t\r-]/.test(text)&&!/^[-+]?\d+(\.\d+)?$/.test(text))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
export function csvFile(rows:unknown[][]):string{return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');}
