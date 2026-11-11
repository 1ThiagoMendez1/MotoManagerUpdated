import 'server-only';
import { headers } from 'next/headers';
import { after } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSuperAdmin } from '@/lib/super-admin';
import { TRIAL_ERROR_LABELS, type TrialErrorCode } from '@/lib/trial-signup';
import { analyticsGeo, analyticsGeoStatus } from './geo';
import {
  analyticsClientIp, AnalyticsInputError, AnalyticsNotReadyError,
  createAnalyticsCollector, type AnalyticsActor, type AnalyticsRecord,
} from './web-http';
import { analyticsRange, browserFromAgent, CHANNELS, csvCell, deviceFromAgent, publicAnalyticsPath,
  type AnalyticsPayload, type AnalyticsReport, type HeatmapData } from './web-shared';

// The generated legacy Database type predates these migrations. Only this
// server-only boundary uses the unparameterized client; payloads are validated.
const database=()=>createAdminClient() as unknown as SupabaseClient;
const missing=(code:string|undefined)=>['PGRST202','PGRST205','42P01','42883'].includes(code||'');
let lastCleanup=0;
async function pruneIfDue(){
  if(Date.now()-lastCleanup<86400000)return;
  lastCleanup=Date.now();
  try{await database().rpc('prune_web_analytics');}catch{/* Optional maintenance never blocks access. */}
}

export async function resolveAnalyticsActor(request:Request):Promise<AnalyticsActor|null>{
  if(!/(?:^|;\s*)sb-[^=;]*-auth-token/.test(request.headers.get('cookie')||''))return null;
  const {data,error}=await(await createClient()).auth.getUser();
  return error?null:data.user;
}
export function analyticsCollector(){
  const origins=['https://www.motomanager.com.co','https://motomanager.com.co'];
  try{if(process.env.NEXT_PUBLIC_APP_URL)origins.push(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);}catch{/* Ignore invalid deployment values. */}
  return createAnalyticsCollector({
    key:process.env.SUPABASE_SERVICE_ROLE_KEY,origins,secure:process.env.NODE_ENV==='production',
    ipHeader:process.env.ANALYTICS_CLIENT_IP_HEADER||'x-real-ip',actor:resolveAnalyticsActor,geo:analyticsGeo,
    record:async(record:AnalyticsRecord)=>{
      const {data,error}=await database().rpc('record_web_analytics_batch',{
        p_visitor_id:record.visitorId,p_session_id:record.sessionId,p_batch_id:record.batchId,
        p_rate_key:record.rateKey,p_meta:record.meta,p_layouts:record.layouts,p_events:record.events,p_user_id:record.userId,
      });
      if(error){if(!missing(error.code))console.warn('[web-analytics] Ingestion unavailable:',error.code);return {unavailable:true};}
      if(data?.inserted>0)after(pruneIfDue);
      return data;
    },
  });
}

/** Only call immediately after successful Auth / atomic workshop provisioning.
 * Read request context before after(); chosen passwords and form values never
 * enter the analytics callback, storage, or logs. */
export async function scheduleAccountAccess(user:User,kind:'login'|'trial_activated',organizationId?:string){
  try{
    if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return;
    const requestHeaders=new Headers(await headers());
    const agent=requestHeaders.get('user-agent')||'';
    const ip=analyticsClientIp(requestHeaders,process.env.ANALYTICS_CLIENT_IP_HEADER||'x-real-ip');
    after(async()=>{
      try{
        const geo=await analyticsGeo(ip);
        const {error}=await database().rpc('record_web_analytics_access',{
          p_user_id:user.id,p_kind:kind,p_organization_id:organizationId||null,
          p_session_id:null,p_visitor_id:null,p_is_admin:isSuperAdmin(user),
          p_meta:{device:deviceFromAgent(agent),browser:browserFromAgent(agent),country:geo?.country||null,city:geo?.city||null},
        });
        if(error && !missing(error.code))console.warn('[web-analytics] Access unavailable:',error.code);
        if(!error)await pruneIfDue();
      }catch{console.warn('[web-analytics] Access could not be recorded');}
    });
  }catch{console.warn('[web-analytics] Access could not be scheduled');}
}

/** Aggregate service-health counts only: no identity, IP, form values or text. */
export async function scheduleTrialFailure(code:TrialErrorCode){
  if(!Object.hasOwn(TRIAL_ERROR_LABELS,code)||['validation','connection'].includes(code))return;
  try{after(async()=>{
    try{const {error}=await database().rpc('record_trial_signup_failure',{p_code:code});
      if(error)console.warn('[trial] Diagnostic unavailable:',error.code);
    }catch{console.warn('[trial] Diagnostic could not be recorded');}
  });}catch{/* Health reporting must never block registration. */}
}

type Identity={email:string|null;name:string|null;expires:number};
const identities=new Map<string,Identity>();
async function enrichIdentities(report:AnalyticsReport,db:SupabaseClient){
  const rows=[...report.sessions,...report.accesses];
  const ids=[...new Set(rows.map(row=>row.userId).filter((id):id is string=>!!id))].slice(0,60);
  const pending=ids.filter(id=>(identities.get(id)?.expires||0)<Date.now());
  // Bound Auth lookups; identities are never inferred from IPs or client IDs.
  for(let i=0;i<pending.length;i+=5){
    await Promise.allSettled(pending.slice(i,i+5).map(async(id)=>{
      const {data,error}=await db.auth.admin.getUserById(id);
      const user=!error?data.user:null;
      const name=user?[user.user_metadata?.first_name,user.user_metadata?.last_name].filter(v=>typeof v==='string').join(' ').trim().slice(0,160):'';
      identities.set(id,{email:user?.email||null,name:name||null,expires:Date.now()+60000});
    }));
  }
  for(const row of rows){const who=row.userId?identities.get(row.userId):null;row.email=who?.email||null;row.name=who?.name||null;}
  if(identities.size>500)for(const [id,who]of identities)if(who.expires<Date.now())identities.delete(id);
}

export async function loadAnalyticsPayload(request:Request):Promise<AnalyticsPayload>{
  const search=new URL(request.url).searchParams;
  let range;
  try{range=analyticsRange(search.get('period')||'today',search.get('start'),search.get('end'));}
  catch(error){throw new AnalyticsInputError(error instanceof Error?error.message:'Revisa las fechas.');}
  const channel=search.get('channel')||'all';
  if(channel!=='all' && !(CHANNELS as readonly string[]).includes(channel))throw new AnalyticsInputError('Canal no válido.');
  const path=search.get('page');const heatPath=search.get('heatPath')||'/';
  if((path && publicAnalyticsPath(path)!==path)||publicAnalyticsPath(heatPath)!==heatPath)throw new AnalyticsInputError('Página no válida.');
  const device=search.get('device')||'all',layout=search.get('layout');
  if(!['all','mobile','desktop','tablet'].includes(device)||layout && !/^[a-f0-9]{32}$/.test(layout))throw new AnalyticsInputError('Vista del mapa no válida.');
  const db=database();
  const results=await Promise.allSettled([
    db.rpc('web_analytics_report',{p_from:range.from,p_to:range.to,p_channel:channel,p_path:path||null}).abortSignal(request.signal),
    db.rpc('web_analytics_heatmap',{p_from:range.from,p_to:range.to,p_path:heatPath,p_device:device,p_layout:layout||null,p_channel:channel}).abortSignal(request.signal),
    analyticsGeoStatus(),
    db.rpc('web_trial_signup_diagnostics',{p_from:range.from,p_to:range.to,p_channel:channel,p_path:path||null}).abortSignal(request.signal),
  ]);
  for(const result of results.slice(0,2)){if(result.status==='rejected')throw new Error('Analytics unavailable');}
  const reportResult=results[0].status==='fulfilled'?results[0].value:null;
  const heatResult=results[1].status==='fulfilled'?results[1].value:null;
  for(const result of [reportResult,heatResult]){
    if(!result || result.error){if(missing(result?.error?.code))throw new AnalyticsNotReadyError();throw new Error('Analytics unavailable');}
  }
  const report=reportResult!.data as AnalyticsReport,heatmap=heatResult!.data as HeatmapData;
  if(!report?.totals || !heatmap?.layouts)throw new Error('Analytics unavailable');
  const signup=results[3];
  if(signup.status==='fulfilled'&&!signup.value.error&&signup.value.data?.available)report.signup=signup.value.data;
  // Do not expose legacy identity links in the anonymous navigation report.
  // Verified account access events remain a separate administrator-only log.
  for(const row of report.sessions){
    row.userId=null;row.name=null;row.email=null;row.workshop=null;
  }
  await enrichIdentities(report,db);
  after(pruneIfDue);
  return {report,heatmap,range,fetchedAt:new Date().toISOString(),geo:results[2].status==='fulfilled'?results[2].value as AnalyticsPayload['geo']:{available:false,downloading:false,updatedAt:null}};
}

export function analyticsCsv(payload:AnalyticsPayload){
  const rows:unknown[][]=[['MotoManager · Analítica web'],['Periodo',payload.range.label],['Hora','America/Bogota'],[],
    ['Métrica','Valor'],...Object.entries(payload.report.totals),[],['Fecha/hora (Bogotá)','Visitas','Visitantes','Páginas vistas']];
  for(const point of payload.report.series)rows.push([new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'}).format(new Date(point.at)),point.visits,point.visitors,point.pageviews]);
  rows.push([],['Página','Vistas','Visitas']);
  for(const row of payload.report.pages)rows.push([row.path,row.views,row.visits]);
  rows.push([],['Fuente','Canal','Visitas']);for(const row of payload.report.sources)rows.push([row.label,row.channel,row.visits]);
  if(payload.report.signup){
    const signup=payload.report.signup;
    rows.push([],['Registro v2 · navegaciones anónimas','Total'],['Llegadas',signup.visits],['Escritura',signup.started],['Paso de acceso',signup.accessStep],['Navegaciones con envío',signup.submitted],['Intentos de envío',signup.submitAttempts],
      ['Pruebas creadas · todos los canales',signup.confirmedTrials],[],['Errores del navegador','Intentos','Navegaciones']);
    for(const error of signup.clientErrors)rows.push([TRIAL_ERROR_LABELS[error.code as TrialErrorCode]||error.code,error.attempts,error.visits]);
    rows.push([],['Fallos del servidor · todos los canales','Intentos']);
    for(const error of signup.serverErrors)rows.push([TRIAL_ERROR_LABELS[error.code as TrialErrorCode]||error.code,error.attempts]);
  }
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
