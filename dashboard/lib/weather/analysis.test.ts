import {expect,it} from 'vitest';
import {forecastSchema} from './schema';
import {analyzeWeather,weatherReference} from './analysis';
import {closePolygon} from '@/lib/maps/geometry';
function sample(){return forecastSchema.parse({latitude:-32.4,longitude:-58.4,daily_units:{temperature_2m_max:'°C',temperature_2m_min:'°C',precipitation_sum:'mm',et0_fao_evapotranspiration:'mm',wind_speed_10m_max:'km/h'},daily:{time:Array.from({length:14},(_,i)=>`2026-11-${String(i+1).padStart(2,'0')}`),temperature_2m_max:Array(14).fill(33),temperature_2m_min:Array(14).fill(-1),precipitation_sum:[...Array(7).fill(0),...Array(7).fill(10)],et0_fao_evapotranspiration:Array(14).fill(4),wind_speed_10m_max:Array(14).fill(36)}});}
it('separates modeled recent weather and forecast and exposes evidence for screening rules',()=>{
 const analysis=analyzeWeather(sample(),'2026-11-08',[-58.4,-32.4],123);
 expect(analysis.recent).toMatchObject({days:7,rain:0,et0:28,balance:-28});expect(analysis.forecast.rain).toBe(70);expect(analysis.recommendations).toHaveLength(5);
});
it('never turns missing rainfall into zero or claims a soil water measurement',()=>{
 const data=sample();data.daily.precipitation_sum[0]=null;const result=analyzeWeather(data,'2026-11-08',[-58.4,-32.4]);expect(result.recent.rain).toBeNull();expect(result.recent.balance).toBeNull();expect(result.recommendations.some(t=>t.includes('Balance reciente'))).toBe(false);
});
it('rejects mismatched arrays or units instead of generating a recommendation',()=>{
 const data=sample();data.daily.time.pop();expect(forecastSchema.safeParse(data).success).toBe(false);
 expect(forecastSchema.safeParse({...sample(),daily_units:{...sample().daily_units,precipitation_sum:'inch'}}).success).toBe(false);
 expect(weatherReference(closePolygon([[-59,-33],[-58,-33],[-58,-32],[-59,-32]]))).toEqual([-58.5,-32.5]);
});
