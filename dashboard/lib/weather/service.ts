import 'server-only';
import {unstable_cache} from 'next/cache';
import {forecastSchema} from './schema';
import {requestJson} from '@/lib/commands/request-json';
export const loadForecast=unstable_cache(async(longitude:number,latitude:number,_day:string)=>{
 void _day; // Part of the cache key so the recent/forecast split changes at local midnight.
 const key=process.env.OPEN_METEO_API_KEY;
 const url=new URL(key?'https://customer-api.open-meteo.com/v1/forecast':'https://api.open-meteo.com/v1/forecast');
 url.search=new URLSearchParams({latitude:String(latitude),longitude:String(longitude),daily:'temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration,wind_speed_10m_max',past_days:'7',forecast_days:'7',timezone:'America/Argentina/Buenos_Aires',...(key?{apikey:key}:{})}).toString();
 return {data:await requestJson(url.toString(),forecastSchema,{},10000),fetchedAt:Date.now()};
},['potrero-weather-v1'],{revalidate:1800});
