import type {Forecast,Climate} from './schema';
import type {Polygon,Point} from '@/lib/maps/geometry';
/** A weather grid reference is not a raster analysis of vegetation inside the polygon. */
export function weatherReference(polygon:Polygon):Point{const ring=polygon.coordinates[0];return [(Math.min(...ring.map(p=>p[0]))+Math.max(...ring.map(p=>p[0])))/2,(Math.min(...ring.map(p=>p[1]))+Math.max(...ring.map(p=>p[1])))/2];}
function period(data:Forecast,indices:number[]){const d=data.daily;
 const aggregate=(values:(number|null)[],mode:'sum'|'min'|'max')=>{const selected=indices.map(i=>values[i]);if(!selected.length||selected.some(v=>v==null))return null;const numbers=selected as number[];return mode==='sum'?numbers.reduce((a,b)=>a+b,0):mode==='min'?Math.min(...numbers):Math.max(...numbers);};
 const rain=aggregate(d.precipitation_sum,'sum'),et0=aggregate(d.et0_fao_evapotranspiration,'sum');return {days:indices.length,from:d.time[indices[0]]??null,to:d.time[indices.at(-1)??-1]??null,rain,et0,balance:rain!=null&&et0!=null?rain-et0:null,min:aggregate(d.temperature_2m_min,'min'),max:aggregate(d.temperature_2m_max,'max'),wind:aggregate(d.wind_speed_10m_max,'max')};
}
/** Screening rules expose their evidence; they never estimate biomass or move animals. */
export function analyzeWeather(data:Forecast,today:string,reference:Point,fetchedAt=Date.now()):Climate{
 const recent=period(data,data.daily.time.flatMap((t,i)=>t<today?[i]:[]).slice(-7));const forecast=period(data,data.daily.time.flatMap((t,i)=>t>=today?[i]:[]).slice(0,7));const recommendations:string[]=[];
 if(recent.days===7&&recent.balance!=null&&recent.balance<-15)recommendations.push('Balance reciente lluvia − ET₀ inferior a −15 mm: revisar altura y disponibilidad de forraje antes de aumentar la carga. No mide humedad del suelo.');
 if(forecast.min!=null&&forecast.min<=0)recommendations.push('Se prevé temperatura mínima de 0 °C o menos: revisar riesgo de heladas para el recurso y los animales.');
 if(forecast.max!=null&&forecast.max>=32)recommendations.push('Se prevén 32 °C o más: revisar acceso a agua y sombra, especialmente durante manejos.');
 if(forecast.wind!=null&&forecast.wind>=35)recommendations.push('Se prevé viento de 35 km/h o más: comprobar condiciones locales antes de aplicaciones o trabajos.');
 if(forecast.rain!=null&&forecast.rain>=40)recommendations.push('Lluvia prevista acumulada de al menos 40 mm: revisar accesos y estado del piso antes de planificar entradas.');
 if(!recommendations.length)recommendations.push('Sin alertas por estos umbrales en los datos disponibles. Verificar el potrero y el pronóstico antes de decidir.');
 return {fetchedAt,reference,recent,forecast,recommendations};
}
