import {businessToday} from './business-date';
export type CalendarView='ano'|'mes'|'semana'|'dia';
export function shiftDay(day:string,n:number):string{const d=new Date(`${day}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function calendarDays(day:string,view:CalendarView):string[]{
 if(view==='ano')return [];
 if(view==='dia')return [day];
 const first=view==='mes'?day.slice(0,7)+'-01':day;
 const offset=(new Date(`${first}T12:00:00Z`).getUTCDay()+6)%7;
 const start=shiftDay(first,-offset);return Array.from({length:view==='mes'?42:7},(_,i)=>shiftDay(start,i));
}
export function calendarMove(day:string,view:CalendarView,n:number):string{
 if(view==='ano')return `${Number(day.slice(0,4))+n}-01-01`;
 if(view!=='mes')return shiftDay(day,n*(view==='semana'?7:1));
 const d=new Date(day.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,10);
}
export const eventDay=(ms:number)=>businessToday(new Date(ms));
