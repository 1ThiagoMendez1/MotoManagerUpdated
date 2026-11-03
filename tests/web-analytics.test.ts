import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ANALYTICS_LAYOUT_VERSION, analyticsRange, cleanCampaignValue, csvCell, publicAnalyticsPath, trafficAttribution, type AnalyticsBatch } from '../src/lib/analytics/web-shared';
import { batchSchema } from '../src/lib/analytics/web-validation';
import { analyticsClientIp, analyticsVisitorId, createAnalyticsCollector, createOwnerAnalyticsHandler, type AnalyticsRecord } from '../src/lib/analytics/web-http';
import { measuredDepth, normalizeClick } from '../src/lib/analytics/web-geometry';

const key='test-only-key-for-web-analytics-at-least-32-characters';
const origin='https://www.motomanager.com.co';
function batch():AnalyticsBatch{return {consent:true,batchId:randomUUID(),visitorSeed:randomUUID(),
  attribution:{channel:'direct',source:null,medium:null,campaign:null,referrer:null},
  layouts:[{path:'/',version:ANALYTICS_LAYOUT_VERSION,variant:'default',viewportWidth:390,viewportHeight:844,width:390,height:4000,sections:[{key:'hero',start:0,end:.2}]}],
  events:[{id:randomUUID(),pageId:randomUUID(),layout:0,kind:'pageview',ageMs:0}]};}
function request(body:unknown,extra:Record<string,string>={}){return new Request(origin+'/api/analytics/collect',{
  method:'POST',headers:{origin,'content-type':'application/json','user-agent':'Mozilla/5.0 Chrome/140.0 Safari/537.36',...extra},body:JSON.stringify(body)});}

test('public measurement strips queries and excludes customer/admin/private routes',()=>{
  assert.equal(publicAnalyticsPath('/prueba-gratis?email=private@example.test'),'/prueba-gratis');
  assert.equal(publicAnalyticsPath('/talleres/taller-publico'),'/talleres/taller-publico');
  for(const path of ['/admin','/dashboard','/clientes','/portal/secreto','/cotizacion/secret','/api/private'])assert.equal(publicAnalyticsPath(path),null);
  const value=batch();value.layouts[0].path='/admin';assert.equal(batchSchema.safeParse(value).success,false);
  value.layouts[0].path='/?email=private@example.test';assert.equal(batchSchema.safeParse(value).success,false);
});
test('channel attribution separates organic social from paid ads and never saves click IDs',()=>{
  assert.equal(trafficAttribution(origin+'/?fbclid=PRIVATE','https://www.instagram.com/some/path').channel,'social');
  const paid=trafficAttribution(origin+'/?utm_source=instagram&utm_medium=paid_social&utm_campaign=Halloween&gclid=PRIVATE','');
  assert.equal(paid.channel,'ads');assert.equal(paid.campaign,'Halloween');assert.ok(!JSON.stringify(paid).includes('PRIVATE'));
  assert.equal(trafficAttribution(origin,'https://chatgpt.com/c/private-token').referrer,'chatgpt.com');
  assert.equal(trafficAttribution(origin,'https://chatgpt.com/c/private-token').channel,'search_ai');
  assert.equal(trafficAttribution(origin,'https://motomanager.com.co/login').channel,'direct');
  assert.equal(cleanCampaignValue('ana@example.test'),null);assert.equal(cleanCampaignValue('bearer abc'),null);
});
test('Bogota dates use local midnight, inclusive custom end and a maximum 90-day range',()=>{
  const now=Date.parse('2026-11-02T03:30:00Z');
  assert.equal(analyticsRange('today',null,null,now).from,'2026-11-01T05:00:00.000Z');
  assert.equal(analyticsRange('custom','2026-10-30','2026-10-31',now).to,'2026-11-01T05:00:00.000Z');
  assert.throws(()=>analyticsRange('custom','2026-02-30','2026-03-01',now));
  assert.throws(()=>analyticsRange('custom','2026-01-01','2026-10-30',now));
  assert.throws(()=>analyticsRange('custom','2026-11-03','2026-11-03',now));
});
test('consented visitor identifiers stay keyed without browser cookies',()=>{
  const id=randomUUID();
  assert.equal(analyticsVisitorId(key,id),analyticsVisitorId(key,id));
  assert.notEqual(analyticsVisitorId(key,id),id);
  assert.notEqual(analyticsVisitorId(key+'other',id),analyticsVisitorId(key,id));
  assert.notEqual(analyticsVisitorId(key,randomUUID()),analyticsVisitorId(key,id));
});
test('geolocation reads only the configured proxy header and rejects private addresses',()=>{
  assert.equal(analyticsClientIp(new Headers({'x-forwarded-for':'8.8.8.8','cf-ipcountry':'CO'})),null);
  assert.equal(analyticsClientIp(new Headers({'x-real-ip':'8.8.8.8'})),'8.8.8.8');
  assert.equal(analyticsClientIp(new Headers({'x-real-ip':'162.158.1.2','cf-connecting-ip':'8.8.8.8'})),'8.8.8.8');
  assert.equal(analyticsClientIp(new Headers({'x-real-ip':'8.8.4.4','cf-connecting-ip':'1.1.1.1'})),'8.8.4.4','a direct visitor cannot impersonate Cloudflare');
  assert.equal(analyticsClientIp(new Headers({'x-real-ip':'162.158.1.2'})),null,'an edge server is not a visitor location');
  assert.equal(analyticsClientIp(new Headers({'x-real-ip':'2606:4700::1','cf-connecting-ip':'240.1.1.1','cf-connecting-ipv6':'2001:4860:4860::8888'})),'2001:4860:4860::8888');
  assert.equal(analyticsClientIp(new Headers({'x-real-ip':'8.8.4.4','cf-connecting-ip':'1.1.1.1'}),'cf-connecting-ip'),null);
  for(const ip of ['127.0.0.1','192.168.1.1','::1','::ffff:10.0.0.1','not-an-ip'])assert.equal(analyticsClientIp(new Headers({'x-real-ip':ip})),null);
});
test('click coordinates do not double-count window offsets and fixed-container scroll remains aligned',()=>{
  assert.deepEqual(normalizeClick(195,200,{left:0,top:0,scrollLeft:0,scrollTop:1000,width:390,height:4000,viewportHeight:844}),{x:.5,y:.3});
  const fixed={left:20,top:50,scrollLeft:0,scrollTop:1000,width:400,height:4000,viewportHeight:1000};
  assert.deepEqual(normalizeClick(220,250,fixed),{x:.5,y:.3});assert.equal(measuredDepth(fixed),50);
});
test('strict collector schema rejects identity injection, private clicks and client-forged activations',()=>{
  const value=batch();assert.ok(batchSchema.safeParse(value).success);
  assert.equal(batchSchema.safeParse({...value,userId:randomUUID()}).success,false);
  assert.equal(batchSchema.safeParse({...value,consent:false}).success,false);
  assert.equal(batchSchema.safeParse({...value,events:[{...value.events[0],kind:'trial_activated'}]}).success,false);
  const login=batch();login.layouts[0].path='/login';login.events[0]={...login.events[0],kind:'click',x:.5,y:.2,target:'button'};
  assert.equal(batchSchema.safeParse(login).success,false);
  assert.equal(batchSchema.safeParse({...value,events:[{...value.events[0],value:'PASSWORD'}]}).success,false);
});
test('HTTP owner gate never creates/loads privileged reports for anonymous or workshop users',async()=>{
  let reads=0;
  for(const actor of [null,{id:'workshop-owner',email:'owner@example.test',app_metadata:{role:'owner'},user_metadata:{is_super_admin:true}}]){
    const handler=createOwnerAnalyticsHandler({actor:async()=>actor,load:async()=>{reads++;return {private:true};}});
    const response=await handler(new Request(origin+'/api/admin/web-analytics'));
    assert.equal(response.status,actor?403:401);assert.match(response.headers.get('cache-control')||'',/no-store/);
  }
  assert.equal(reads,0);
  const owner=createOwnerAnalyticsHandler({actor:async()=>({id:'root',app_metadata:{is_super_admin:true}}),load:async()=>{reads++;return {visits:3};}});
  assert.equal((await owner(new Request(origin+'/api/admin/web-analytics'))).status,200);assert.equal(reads,1);
});
test('collector rejects malformed/oversized/unconsented events before touching storage',async()=>{
  let writes=0;const handler=createAnalyticsCollector({key,origins:[origin],actor:async()=>null,geo:async()=>null,record:async()=>{writes++;return {sessionId:randomUUID()};}});
  assert.equal((await handler(request(batch(),{origin:'https://evil.test'}))).status,403);
  assert.equal((await handler(request({...batch(),consent:false}))).status,400);
  assert.equal((await handler(request({padding:'x'.repeat(33000)}))).status,413);
  assert.equal((await handler(request(batch(),{dnt:'1'}))).status,204);
  assert.equal((await handler(request(batch(),{'sec-gpc':'1'}))).status,204);
  assert.equal((await handler(request(batch(),{'user-agent':'Googlebot'}))).status,204);assert.equal(writes,0);
});
test('collector verifies identity and rate keys without issuing analytics cookies',async()=>{
  const records:AnalyticsRecord[]=[];const user=randomUUID();
  const handler=createAnalyticsCollector({key,origins:[origin],secure:true,actor:async()=>({id:user}),geo:async()=>({country:'CO',city:'Bogotá',latitude:4.61,longitude:-74.08}),record:async row=>{records.push(row);return {sessionId:row.sessionId,inserted:1};}});
  const response=await handler(request(batch(),{'x-real-ip':'8.8.8.8'}));assert.equal(response.status,204);
  assert.equal(records[0].userId,user);assert.equal(records[0].rateKey.length,64);
  assert.ok(!JSON.stringify(records[0]).includes('8.8.8.8'));assert.equal(records[0].layouts[0].id.length,32);
  assert.equal(response.headers.get('set-cookie'),null,'new visits never set analytics cookies');
  const old=await handler(request(batch(),{cookie:'mm_wa_v1=old; mm_wa_s1=old; mm_wa_c1=1'}));
  assert.equal(old.status,204);
  const expired=old.headers.getSetCookie();
  assert.equal(expired.length,3,'previous analytic cookies are expired on migration');
  for(const value of expired)assert.match(value,/Max-Age=0; HttpOnly; SameSite=Lax; Secure/);
  const deletion=await handler(new Request(origin+'/api/analytics/collect',{
    method:'DELETE',headers:{origin,cookie:'mm_wa_v1=old; mm_wa_s1=old; mm_wa_c1=1'},
  }));
  assert.equal(deletion.status,204);
  assert.equal(deletion.headers.getSetCookie().length,3);
  const clear=await handler(new Request(origin+'/api/analytics/collect',{method:'DELETE',headers:{origin}}));
  assert.equal(clear.headers.get('set-cookie'),null);
  const sameViewport=batch();
  await handler(request(sameViewport));
  await handler(request(sameViewport,{'user-agent':'Mozilla/5.0 (iPhone; Mobile) Safari/605'}));
  assert.notEqual(records.at(-2)!.layouts[0].id,records.at(-1)!.layouts[0].id,'equal-sized desktop and mobile views stay in separate device cohorts');
  const internal=createAnalyticsCollector({key,origins:[origin],actor:async()=>({id:user,app_metadata:{is_super_admin:true}}),geo:async()=>null,record:async()=>{throw Error('must not run');}});
  assert.equal((await internal(request(batch()))).status,204);
});
test('exports neutralize spreadsheet formulas and quote arbitrary source labels',()=>{
  assert.equal(csvCell('=HYPERLINK("https://evil.test")'),'"\'=HYPERLINK(""https://evil.test"")"');
  assert.equal(csvCell('line\nnext'),'"line next"');
});
