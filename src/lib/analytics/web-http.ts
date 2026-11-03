import { createHash, createHmac, randomUUID } from 'node:crypto';
import { isIP, BlockList } from 'node:net';
import { isSuperAdmin } from '../super-admin';
import { browserFromAgent, cleanCampaignValue, deviceFromAgent, isKnownBot, type AnalyticsBatch } from './web-shared';
import { batchSchema } from './web-validation';

const LEGACY_ANALYTICS_COOKIES = ['mm_wa_v1', 'mm_wa_s1', 'mm_wa_c1'] as const;
export type AnalyticsActor = {id:string;email?:string|null;app_metadata?:Record<string,unknown>};
export type AnalyticsGeo = {country:string|null;city:string|null;latitude:number|null;longitude:number|null};
export type AnalyticsRecord = { visitorId:string;sessionId:string;batchId:string;rateKey:string;userId:string|null;
  meta:Record<string,unknown>;layouts:(AnalyticsBatch['layouts'][number]&{id:string})[];events:AnalyticsBatch['events'] };

export function analyticsVisitorId(key:string,seed:string) {
  const bytes=createHmac('sha256',key).update('web-analytics-visitor:'+seed).digest().subarray(0,16);
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const h=bytes.toString('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
/** Only expire the old analytics cookies when a browser already has them.
 * This endpoint never issues or renews tracking cookies. */
function expireLegacyAnalyticsCookies(request:Request,response:Response,secure:boolean){
  const names=new Set((request.headers.get('cookie')||'').split(';').map(item=>item.split('=')[0]?.trim()));
  for(const name of LEGACY_ANALYTICS_COOKIES){
    if(names.has(name))response.headers.append('Set-Cookie',
      name+'=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'+(secure?'; Secure':''));
  }
  return response;
}
const blocked=new BlockList();
for(const [address,prefix]of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['198.18.0.0',15],['224.0.0.0',4],['240.0.0.0',4]]as const)blocked.addSubnet(address,prefix,'ipv4');
for(const [address,prefix]of [['::',128],['::1',128],['fc00::',7],['fe80::',10],['ff00::',8]]as const)blocked.addSubnet(address,prefix,'ipv6');
// Published Cloudflare ingress ranges, checked 2026-11-02:
// https://www.cloudflare.com/ips-v4/ and https://www.cloudflare.com/ips-v6/
const cloudflare=new BlockList();
for(const cidr of ['173.245.48.0/20','103.21.244.0/22','103.22.200.0/22','103.31.4.0/22','141.101.64.0/18','108.162.192.0/18','190.93.240.0/20','188.114.96.0/20','197.234.240.0/22','198.41.128.0/17','162.158.0.0/15','104.16.0.0/13','104.24.0.0/14','172.64.0.0/13','131.0.72.0/22','2400:cb00::/32','2606:4700::/32','2803:f800::/32','2405:b500::/32','2405:8100::/32','2a06:98c0::/29','2c0f:f248::/32']){
  const [address,prefix]=cidr.split('/');cloudflare.addSubnet(address,Number(prefix),isIP(address)===4?'ipv4':'ipv6');
}
function publicIp(value:string){
  const ip=value.trim().replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i,'$1');
  const family=isIP(ip);return family&&!blocked.check(ip,family===4?'ipv4':'ipv6')?ip:null;
}
/** The ingress must overwrite this header. Never infer location from submitted
 * browser data, timezone, language, or untrusted country headers. */
export function analyticsClientIp(headers:Headers,header='x-real-ip') {
  const peer=publicIp(headers.get('x-real-ip')||'');
  const fromCloudflare=!!peer&&cloudflare.check(peer,isIP(peer)===4?'ipv4':'ipv6');
  if((header.toLowerCase()==='x-real-ip'&&fromCloudflare)||header.toLowerCase()==='cf-connecting-ip'){
    if(!fromCloudflare)return null;
    const client=publicIp(headers.get('cf-connecting-ip')||'')||publicIp(headers.get('cf-connecting-ipv6')||'');
    // Cross-zone Workers use this shared address, which is not a visitor.
    return client==='2a06:98c0:3600::103'?null:client;
  }
  let ip=(headers.get(header)||'').trim();
  if(header.toLowerCase()==='x-forwarded-for')ip=ip.split(',')[0].trim();
  return publicIp(ip);
}
export const privateHeaders={ 'Cache-Control':'private, no-store, max-age=0','Vary':'Cookie','X-Content-Type-Options':'nosniff' };
export const analyticsJson=(data:unknown,status=200)=>Response.json(data,{status,headers:privateHeaders});

async function readSmallJson(request:Request) {
  if(Number(request.headers.get('content-length')||0)>32768)throw new Error('too_large');
  if(!request.body)throw new Error('empty');
  const reader=request.body.getReader();let size=0;const chunks:Uint8Array[]=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;
    if(size>32768){await reader.cancel();throw new Error('too_large');}chunks.push(value);}}
  finally{reader.releaseLock();}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export type CollectorDependencies={
  key?:string;origins:string[];secure?:boolean;ipHeader?:string;now?:()=>number;
  actor:(request:Request)=>Promise<AnalyticsActor|null>;
  geo:(ip:string|null)=>Promise<AnalyticsGeo|null>;
  record:(record:AnalyticsRecord)=>Promise<{sessionId?:string;limited?:boolean;inserted?:number;unavailable?:boolean}>;
};
export function createAnalyticsCollector(deps:CollectorDependencies) {
  return async(request:Request):Promise<Response>=>{
    const origin=request.headers.get('origin');
    if(!origin || !deps.origins.includes(origin) || request.headers.get('sec-fetch-site')==='cross-site')return analyticsJson({error:'Origen no permitido'},403);
    if(request.method==='DELETE'){
      return expireLegacyAnalyticsCookies(request,new Response(null,{status:204,headers:privateHeaders}),!!deps.secure);
    }
    if(request.method!=='POST')return analyticsJson({error:'Método no permitido'},405);
    if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return analyticsJson({error:'Contenido no permitido'},415);
    if(!deps.key || deps.key.length<32)return analyticsJson({error:'Medición no disponible'},503);
    if(request.headers.get('sec-gpc')==='1' || request.headers.get('dnt')==='1' || isKnownBot(request.headers.get('user-agent')||''))return new Response(null,{status:204,headers:privateHeaders});
    let batch:AnalyticsBatch;
    try{const parsed=batchSchema.safeParse(await readSmallJson(request));if(!parsed.success)return analyticsJson({error:'Eventos no válidos'},400);batch=parsed.data;}
    catch(error){return analyticsJson({error:'Solicitud no válida'},error instanceof Error&&error.message==='too_large'?413:400);}
    try{
      const actor=await deps.actor(request);
      if(isSuperAdmin(actor))return new Response(null,{status:204,headers:privateHeaders});
      const now=deps.now?.()??Date.now(),key=deps.key;
      const visitorId=analyticsVisitorId(key,batch.visitorSeed);
      // The RPC merges tabs into a single active visit and starts a new visit
      // after 30 minutes of inactivity, without relying on browser cookies.
      const sessionId=randomUUID();
      const ip=analyticsClientIp(request.headers,deps.ipHeader);
      const geo=await deps.geo(ip).catch(()=>null);
      const agent=request.headers.get('user-agent')||'';
      const rateKey=createHmac('sha256',key).update('analytics-rate:'+new Date(now).toISOString().slice(0,10)+':'+(ip||visitorId)).digest('hex');
      let referrer:string|null=null;
      try{if(batch.attribution.referrer){const u=new URL('https://'+batch.attribution.referrer);if(u.hostname===batch.attribution.referrer)referrer=u.hostname;}}catch{/* Ignore invalid hosts. */}
      const result=await deps.record({visitorId,sessionId,batchId:batch.batchId,rateKey,userId:null,
        meta:{channel:batch.attribution.channel,source:cleanCampaignValue(batch.attribution.source),medium:cleanCampaignValue(batch.attribution.medium),
          campaign:cleanCampaignValue(batch.attribution.campaign),referrer,device:deviceFromAgent(agent),browser:browserFromAgent(agent),
          country:geo?.country||null,city:geo?.city||null,latitude:geo?.latitude??null,longitude:geo?.longitude??null},
        layouts:batch.layouts.map(layout=>({...layout,id:createHash('sha256').update(JSON.stringify({...layout,device:deviceFromAgent(agent)})).digest('hex').slice(0,32)})),events:batch.events});
      if(result.limited)return analyticsJson({error:'Demasiados eventos'},429);
      if(result.unavailable || !result.sessionId)return analyticsJson({error:'Medición no disponible'},503);
      return expireLegacyAnalyticsCookies(request,new Response(null,{status:204,headers:privateHeaders}),!!deps.secure);
    }catch{return analyticsJson({error:'Medición no disponible'},503);}
  };
}

/** The tested gate runs before creating a privileged data client or reading any
 * report. Ordinary workshop owners are not platform administrators. */
export function createOwnerAnalyticsHandler<T>(deps:{actor:(request:Request)=>Promise<AnalyticsActor|null>;load:(request:Request,actor:AnalyticsActor)=>Promise<T>}) {
  return async(request:Request):Promise<Response>=>{
    try{
      const actor=await deps.actor(request);
      if(!actor)return analyticsJson({error:'Inicia sesión para continuar.'},401);
      if(!isSuperAdmin(actor))return analyticsJson({error:'Acceso exclusivo del administrador de MotoManager.'},403);
      if(request.headers.get('sec-fetch-site')==='cross-site')return analyticsJson({error:'Origen no permitido.'},403);
      const result=await deps.load(request,actor);
      return result instanceof Response?result:analyticsJson(result);
    }catch(error){
      if(error instanceof AnalyticsInputError)return analyticsJson({error:error.message},400);
      if(error instanceof AnalyticsNotReadyError)return analyticsJson({error:'La analítica todavía no está activada en la base de datos.',code:'analytics_not_ready'},503);
      return analyticsJson({error:'No pudimos cargar la analítica. Intenta de nuevo.'},503);
    }
  };
}
export class AnalyticsInputError extends Error {}
export class AnalyticsNotReadyError extends Error {}
