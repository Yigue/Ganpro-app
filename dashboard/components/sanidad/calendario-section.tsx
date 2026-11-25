'use client';
import {useState} from 'react';
import {Section} from '@/components/ui/section';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {businessToday} from '@/lib/calc/business-date';
import {calendarDays,calendarMove,eventDay,type CalendarView} from '@/lib/calc/calendar';
import {CalendarYear} from './calendar-year';
import {CalendarEvent,type ItemCalendario,type CalendarContext} from './calendar-event';
export type {ItemCalendario} from './calendar-event';
export function CalendarioSection({items,puedeEditar,context}:{meses:string[];items:Record<string,ItemCalendario[]>;puedeEditar:boolean;context:CalendarContext}){
 const [day,setDay]=useState(businessToday()),[view,setView]=useState<CalendarView>('ano');const days=calendarDays(day,view),events=Object.values(items).flat();
 const openDay=(date:string)=>{setDay(date);setView('dia');};
 return <Section title="Calendario sanitario" description="Panorama del año. Abrí un mes o día para programar, aplicar o cancelar tareas.">
 <div className="mb-4 flex flex-wrap items-center gap-2">{(['ano','mes','semana','dia'] as const).map(v=><Button key={v} variant={view===v?'default':'outline'} onClick={()=>setView(v)} aria-pressed={view===v}>{v==='ano'?'Año':v==='dia'?'Día':v==='mes'?'Mes':'Semana'}</Button>)}<Button variant="outline" aria-label="Período anterior" onClick={()=>setDay(calendarMove(day,view,-1))}>←</Button><Input aria-label="Fecha del calendario" type="date" value={day} onChange={e=>{if(e.target.value)setDay(e.target.value);}} className="w-40"/><Button variant="outline" aria-label="Período siguiente" onClick={()=>setDay(calendarMove(day,view,1))}>→</Button><Button variant="ghost" onClick={()=>setDay(businessToday())}>Hoy</Button><strong className="text-sm">{view==='ano'?day.slice(0,4):day.slice(0,7)}</strong></div>
 {view==='ano'?<CalendarYear year={day.slice(0,4)} events={events} open={month=>{setDay(month);setView('mes');}}/>:<div className="overflow-x-auto"><div className={view==='dia'?'space-y-3':'grid min-w-[630px] grid-cols-7 gap-1'}>
 {view!=='dia'&&['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=><p key={d} className="text-center text-xs font-medium">{d}</p>)}
 {days.map(d=>{const here=events.filter(it=>eventDay(it.fecha)===d);return <div key={d} className={`space-y-1 rounded border p-2 ${view==='mes'?'h-28 overflow-hidden':view==='semana'?'max-h-80 min-h-28 overflow-auto':'min-h-28'} ${d.slice(0,7)!==day.slice(0,7)&&view==='mes'?'bg-muted/50':''}`}><button type="button" className="text-sm font-medium underline" onClick={()=>openDay(d)} aria-label={`Ver tareas ${d}`}>{view==='mes'?Number(d.slice(-2)):d.split('-').reverse().join('/')}</button>{view==='mes'?<>{here.slice(0,2).map(it=><button type="button" key={`${it.estado}-${it.id}`} className="block w-full truncate text-left text-xs" onClick={()=>openDay(d)}>{it.nombre}</button>)}{here.length>0&&<button type="button" className="text-xs text-primary underline" onClick={()=>openDay(d)}>Ver {here.length} tareas</button>}</>:here.map(it=><CalendarEvent key={`${it.estado}-${it.id}`} item={it} editable={puedeEditar} context={context}/>)}{view==='dia'&&!here.length&&<p className="text-sm text-muted-foreground">Sin tareas en esta fecha.</p>}</div>;})}
 </div></div>}</Section>;
}
