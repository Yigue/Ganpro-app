'use client';
import {useEffect,useState} from 'react';
import type {Climate} from '@/lib/weather/schema';
import {climateSchema} from '@/lib/weather/schema';
import {fmtNum} from '@/lib/calc/format';
import {Button} from '@/components/ui/button';
export function PaddockClimate({id}:{id:string}){const [data,setData]=useState<Climate|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;const controller=new AbortController();setData(null);setError('');const timer=setTimeout(()=>controller.abort(),15000);fetch(`/api/potreros/${encodeURIComponent(id)}/clima`,{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error();const parsed=climateSchema.safeParse(await r.json());if(!parsed.success)throw new Error();if(active)setData(parsed.data);}).catch(()=>{if(active)setError('No se pudo consultar el clima. El mapa y los registros siguen disponibles.');}).finally(()=>clearTimeout(timer));return()=>{active=false;clearTimeout(timer);controller.abort();};},[id,retry]);
 const number=(n:number|null)=>n==null?'Sin datos':fmtNum(n,1);
 return <section className="space-y-2 rounded-lg border bg-card p-3 text-sm"><h3 className="font-semibold">Clima y revisión del potrero</h3>{error?<><p role="status">{error}</p><Button type="button" variant="outline" onClick={()=>setRetry(v=>v+1)}>Reintentar clima</Button></>:!data?<p role="status">Consultando clima…</p>:<><p className="text-xs text-muted-foreground">Datos de grilla estimados para un punto de referencia. Actualización: {new Date(data.fetchedAt).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires'})}.</p><p>Últimos {data.recent.days} días: lluvia {number(data.recent.rain)} mm · ET₀ {number(data.recent.et0)} mm · balance {number(data.recent.balance)} mm.</p><p>Próximos {data.forecast.days} días: lluvia {number(data.forecast.rain)} mm · mínima {number(data.forecast.min)} °C · máxima {number(data.forecast.max)} °C.</p><ul className="list-disc space-y-1 pl-4 text-xs">{data.recommendations.map(t=><li key={t}>{t}</li>)}</ul></>}
 <p className="text-xs text-muted-foreground">La imagen de fondo no mide pastura. Para estimar kg de materia seca se necesita un muestreo o un índice satelital calibrado.</p><a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="text-xs underline">Datos meteorológicos: Open-Meteo · CC BY 4.0</a></section>;
}
