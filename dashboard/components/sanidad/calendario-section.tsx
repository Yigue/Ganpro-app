'use client';
import {useState} from 'react';
import {Section} from '@/components/ui/section';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {businessToday} from '@/lib/calc/business-date';
import {calendarDays,calendarMove,eventDay,type CalendarView} from '@/lib/calc/calendar';
import {CalendarEvent,type ItemCalendario,type CalendarContext} from './calendar-event';
export type {ItemCalendario} from './calendar-event';
export function CalendarioSection({items,puedeEditar,context}:{meses:string[];items:Record<string,ItemCalendario[]>;puedeEditar:boolean;context:CalendarContext}){
 const [day,setDay]=useState(businessToday()),[view,setView]=useState<CalendarView>('mes');const days=calendarDays(day,view),events=Object.values(items).flat();
 return <Section title="Calendario sanitario" description="Programá, registrá la aplicación o cancelá una tarea. El retiro comienza en la fecha real de aplicación.">
 <div className="mb-4 flex flex-wrap items-center gap-2">{(['mes','semana','dia'] as const).map(v=><Button key={v} variant={view===v?'default':'outline'} onClick={()=>setView(v)} aria-pressed={view===v}>{v==='dia'?'Día':v==='mes'?'Mes':'Semana'}</Button>)}<Button variant="outline" aria-label="Período anterior" onClick={()=>setDay(calendarMove(day,view,-1))}>←</Button><Input aria-label="Fecha del calendario" type="date" value={day} onChange={e=>{if(e.target.value)setDay(e.target.value);}} className="w-40"/><Button variant="outline" aria-label="Período siguiente" onClick={()=>setDay(calendarMove(day,view,1))}>→</Button><Button variant="ghost" onClick={()=>setDay(businessToday())}>Hoy</Button></div>
 <div className="overflow-x-auto"><div className={view==='dia'?'space-y-3':'grid min-w-[630px] grid-cols-7 gap-1'}>
 {view!=='dia'&&['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=><p key={d} className="text-center text-xs font-medium">{d}</p>)}
 {days.map(d=><div key={d} className={`min-h-28 space-y-2 rounded border p-2 ${d.slice(0,7)!==day.slice(0,7)&&view==='mes'?'bg-muted/50':''}`}><p className="text-sm font-medium">{view==='mes'?Number(d.slice(-2)):d.split('-').reverse().join('/')}</p>{events.filter(it=>eventDay(it.fecha)===d).map(it=><CalendarEvent key={`${it.estado}-${it.id}`} item={it} editable={puedeEditar} context={context}/>)}{view==='dia'&&!events.some(it=>eventDay(it.fecha)===d)&&<p className="text-sm text-muted-foreground">Sin tareas en esta fecha.</p>}</div>)}
 </div></div></Section>;
}
