import {z} from 'zod';
const values=(min:number,max:number)=>z.array(z.number().finite().min(min).max(max).nullable()).min(1).max(32);
export const forecastSchema=z.object({latitude:z.number().finite(),longitude:z.number().finite(),daily_units:z.object({temperature_2m_max:z.literal('°C'),temperature_2m_min:z.literal('°C'),precipitation_sum:z.literal('mm'),et0_fao_evapotranspiration:z.literal('mm'),wind_speed_10m_max:z.literal('km/h')}),daily:z.object({time:z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(32),temperature_2m_max:values(-100,70),temperature_2m_min:values(-100,70),precipitation_sum:values(0,3000),et0_fao_evapotranspiration:values(0,50),wind_speed_10m_max:values(0,400)})}).refine(({daily:d})=>Object.values(d).every(v=>v.length===d.time.length)&&new Set(d.time).size===d.time.length&&d.time.every((t,i)=>!i||t>d.time[i-1]));
export type Forecast=z.infer<typeof forecastSchema>;
const number=z.number().finite().nullable();
const period=z.object({days:z.number().int().nonnegative(),from:z.string().nullable(),to:z.string().nullable(),rain:number,et0:number,balance:number,min:number,max:number,wind:number});
export const climateSchema=z.object({fetchedAt:z.number(),reference:z.tuple([z.number(),z.number()]),recent:period,forecast:period,recommendations:z.array(z.string()).max(10)});
export type Climate=z.infer<typeof climateSchema>;
