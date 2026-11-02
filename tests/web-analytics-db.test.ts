import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

// Real PostgreSQL execution in an isolated WASM database. No production network
// or credentials; fixtures contain no real customer identities.
test('analytics SQL enforces roles, deduplication, attribution, heatmap cohorts and retention',async t=>{
  const db=new PGlite();
  try{
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE public.organizations(id uuid PRIMARY KEY,name text,settings jsonb);
      CREATE TABLE public.organization_members(user_id uuid,organization_id uuid,status text,joined_at timestamptz DEFAULT now());
      GRANT USAGE ON SCHEMA public,auth TO service_role;
      GRANT SELECT ON public.organizations,public.organization_members TO service_role;`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261030220017_web_analytics.sql',import.meta.url),'utf8'));
    const scalar=async(sql:string,args:unknown[]=[])=>Object.values((await db.query<Record<string,unknown>>(sql,args)).rows[0])[0] as any;
    const user=randomUUID(),admin=randomUUID(),org=randomUUID(),visitor=randomUUID(),candidate=randomUUID();
    await db.query('INSERT INTO auth.users VALUES($1),($2)',[user,admin]);
    await db.query('INSERT INTO organizations VALUES($1,$2,$3)',[org,'Taller ficticio de prueba',JSON.stringify({isTrial:true})]);
    await db.query("INSERT INTO organization_members(user_id,organization_id,status) VALUES($1,$2,'active')",[user,org]);
    const layouts=[{id:'a'.repeat(32),path:'/',variant:'default',viewportWidth:390,viewportHeight:844,width:390,height:4000,sections:[{key:'hero',start:0,end:.2}]},
      {id:'b'.repeat(32),path:'/prueba-gratis',variant:'default',viewportWidth:390,viewportHeight:844,width:390,height:1800,sections:[{key:'page',start:0,end:1}]}];
    const pageId=randomUUID();const event=(kind:string,layout=0,extra={})=>({id:randomUUID(),pageId,kind,layout,ageMs:0,...extra});
    const meta={channel:'social',source:'instagram',medium:'social',campaign:'test',device:'mobile',browser:'Chrome',country:'CO',city:'Bogotá',latitude:4.61,longitude:-74.08};
    const write=async(events:unknown[],options:{batch?:string;visitor?:string;session?:string;layouts?:unknown[];meta?:unknown}={})=>scalar('SELECT public.record_web_analytics_batch($1,$2,$3,$4,$5,$6,$7,NULL)',[
      options.visitor||visitor,options.session||candidate,options.batch||randomUUID(),'c'.repeat(64),JSON.stringify(options.meta||meta),JSON.stringify(options.layouts||layouts),JSON.stringify(events)]);
    const report=async(channel='all')=>scalar("SELECT web_analytics_report(date_trunc('day',now()),date_trunc('day',now())+interval '1 day',$1,NULL)",[channel]);
    await t.test('all six tables have RLS; browser roles cannot read/write/execute',async()=>{
      assert.equal(await scalar("SELECT count(*)::int FROM pg_class WHERE relname LIKE 'web_analytics_%' AND relkind='r' AND relrowsecurity"),6);
      assert.equal(await scalar("SELECT count(*)::int FROM pg_proc WHERE proname IN ('web_analytics_report','web_analytics_heatmap','record_web_analytics_batch','record_web_analytics_access','prune_web_analytics') AND prosecdef"),0);
      for(const role of ['anon','authenticated']){
        await db.exec('SET ROLE '+role);
        await assert.rejects(()=>db.query('SELECT * FROM public.web_analytics_sessions'),/permission denied/);
        await assert.rejects(()=>db.query("SELECT public.web_analytics_report(now()-interval '1 day',now())"),/permission denied/);
        await assert.rejects(()=>db.query('DELETE FROM public.web_analytics_events'),/permission denied/);
        await db.exec('RESET ROLE');
      }
    });
    await db.exec('SET ROLE service_role');
    const firstBatch=randomUUID(),events=[event('pageview'),event('click',0,{x:.5,y:.2,target:'hero_trial'}),event('scroll',0,{depth:75}),event('engagement',0,{seconds:15}),event('pageview',1),event('form_start',1)];
    await t.test('a transport retry and duplicate event do not inflate visits or clicks',async()=>{
      const first=await write(events,{batch:firstBatch});assert.equal(first.sessionId,candidate);assert.equal(first.inserted,6);
      assert.equal((await write(events,{batch:firstBatch})).inserted,0);
      assert.equal((await write(events,{session:randomUUID()})).sessionId,candidate);
      assert.equal(await scalar('SELECT count(*)::int FROM web_analytics_events'),6);
      assert.equal(await scalar('SELECT count(*)::int FROM web_analytics_sessions'),1);
      const r=await report();assert.equal(r.totals.visits,1);assert.equal(r.totals.pageviews,2);assert.equal(r.totals.activeSeconds,15);assert.equal(r.totals.bounceRate,0);
    });
    await t.test('conversions require a real provisioned workshop; identity is linked only to that verified account',async()=>{
      const access=async(id:string,kind:string,isAdmin=false)=>scalar('SELECT record_web_analytics_access($1,$2,$3,$4,$5,$6,$7)',[id,kind,org,candidate,visitor,isAdmin,JSON.stringify(meta)]);
      assert.equal(await access(user,'trial_activated'),true);await access(user,'trial_activated');
      await access(admin,'login',true);
      const r=await report();assert.equal(r.totals.trialActivations,1);assert.equal(r.totals.conversionRate,100);
      assert.deepEqual(r.funnel,{visits:1,registration:1,formStarted:1,activated:1});
      assert.equal(r.sessions[0].userId,user);assert.equal(r.sessions[0].email,null);assert.equal(r.accesses.length,2);
      assert.equal((await report('direct')).totals.visits,0);assert.equal((await report('direct')).totals.trialActivations,0);
      assert.equal(await scalar("SELECT record_web_analytics_access($1,'trial_activated',NULL,NULL,NULL,false,$2)",[admin,JSON.stringify(meta)]),false);
    });
    await t.test('heatmaps preserve exact normalized points and never mix viewport/layout cohorts',async()=>{
      const second={...layouts[0],id:'d'.repeat(32),viewportWidth:1440,width:1440,height:3000};
      await write([event('pageview'),event('click',0,{x:.9,y:.8,target:'hero_demo'})],{visitor:randomUUID(),session:randomUUID(),layouts:[second],meta:{...meta,device:'desktop',channel:'direct'}});
      const heat=await scalar("SELECT web_analytics_heatmap(date_trunc('day',now()),date_trunc('day',now())+interval '1 day','/','mobile',$1,'all')",[layouts[0].id]);
      assert.equal(heat.totalClicks,1);assert.deepEqual(heat.points,[{x:.5,y:.2,target:'hero_trial'}]);
      assert.equal(heat.layouts.length,1);assert.equal(heat.scroll.find((r:any)=>r.depth===75).visitors,1);assert.equal(heat.scroll.find((r:any)=>r.depth===80).visitors,0);
    });
    await t.test('an inactive browser starts a new visit; retention removes only analytics older than 90 days',async()=>{
      await db.query("UPDATE web_analytics_sessions SET last_seen=now()-interval '31 minutes' WHERE id=$1",[candidate]);
      const next=randomUUID();assert.equal((await write([event('pageview')],{session:next})).sessionId,next);
      await db.query("UPDATE web_analytics_events SET created_at=now()-interval '91 days' WHERE session_id=$1",[candidate]);
      await db.query("UPDATE web_analytics_sessions SET last_seen=now()-interval '91 days' WHERE id=$1",[candidate]);
      await db.query('SELECT prune_web_analytics()');
      assert.equal(await scalar('SELECT count(*)::int FROM web_analytics_sessions WHERE id=$1',[candidate]),0);
      await db.exec('RESET ROLE');
      assert.equal(await scalar('SELECT count(*)::int FROM organizations'),1);
      assert.equal(await scalar('SELECT count(*)::int FROM auth.users'),2);
      assert.equal((await report()).totals.visits,2);
    });
  }finally{await db.close();}
});
