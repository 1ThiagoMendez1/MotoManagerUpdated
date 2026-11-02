import 'server-only';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { open, type CityResponse, type Reader } from 'maxmind';
import { downloadAnalyticsGeo } from '../../../scripts/analytics-geo-download.mjs';
import type { AnalyticsGeo } from './web-http';
import type { GeoStatus } from './web-shared';

type State={reader:Promise<Reader<CityResponse>|null>|null;download:Promise<unknown>|null;checked:number;updatedAt:string|null;retryAt:number};
const runtime=globalThis as typeof globalThis&{__motomanagerGeo?:State};
const state=runtime.__motomanagerGeo??={reader:null,download:null,checked:0,updatedAt:null,retryAt:0};
const filename=()=>process.env.ANALYTICS_GEOIP_DB||resolve('.analytics/geoip.mmdb');
async function checkDatabase() {
  if(Date.now()-state.checked<60000)return;
  state.checked=Date.now();
  const file=await stat(filename()).catch(()=>null);
  const updatedAt=file?.mtime.toISOString()||null;
  if(updatedAt!==state.updatedAt)state.reader=null;
  state.updatedAt=updatedAt;
  const stale=!file || Date.now()-file.mtimeMs>32*86400000;
  if(stale && process.env.ANALYTICS_GEOIP_DOWNLOAD==='1' && !state.download && Date.now()>state.retryAt){
    state.download=downloadAnalyticsGeo(filename()).then(()=>{state.reader=null;state.checked=0;})
      .catch(()=>{state.retryAt=Date.now()+3600000;})
      .finally(()=>{state.download=null;});
  }
}
async function reader() {
  await checkDatabase();
  if(!state.updatedAt)return null;
  state.reader??=open<CityResponse>(filename(),{cache:{max:1000},watchForUpdates:true,watchForUpdatesNonPersistent:true}).catch(()=>null);
  return state.reader;
}
export async function analyticsGeoStatus():Promise<GeoStatus>{
  const current=await reader();
  return {available:!!current,downloading:!!state.download,updatedAt:state.updatedAt};
}
export async function analyticsGeo(ip:string|null):Promise<AnalyticsGeo|null> {
  if(!ip)return null;
  try{
    const record=(await reader())?.get(ip);
    const country=record?.country?.iso_code;
    const lat=record?.location?.latitude,lon=record?.location?.longitude;
    if(!country || !/^[A-Z]{2}$/.test(country))return null;
    return {country,city:(record?.city?.names?.es||record?.city?.names?.en||'').slice(0,100)||null,
      latitude:typeof lat==='number' && Number.isFinite(lat) && Math.abs(lat)<=90?Math.round(lat*100)/100:null,
      longitude:typeof lon==='number' && Number.isFinite(lon) && Math.abs(lon)<=180?Math.round(lon*100)/100:null};
  }catch{return null;}
}
