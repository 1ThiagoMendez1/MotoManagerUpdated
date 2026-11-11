import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('trial funnel SQL separates old focus events, new milestones, real creation and global health counters',async t=>{
  const db=new PGlite();
  try{
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE public.organizations(id uuid PRIMARY KEY,name text,settings jsonb);
      CREATE TABLE public.organization_members(user_id uuid,organization_id uuid,status text,joined_at timestamptz DEFAULT now());
      CREATE SCHEMA motomanager_private;
      CREATE TABLE motomanager_private.workshop_trial_claims(organization_id uuid PRIMARY KEY,starts_at timestamptz NOT NULL);
      GRANT USAGE ON SCHEMA public,auth,motomanager_private TO service_role;
      GRANT SELECT ON public.organizations,public.organization_members,motomanager_private.workshop_trial_claims TO service_role;`);
    for(const migration of ['20261030220017_web_analytics.sql','20261111200459_trial_signup_conversion_diagnostics.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+migration,import.meta.url),'utf8'));
    const scalar=async(sql:string,args:unknown[]=[])=>Object.values((await db.query<Record<string,unknown>>(sql,args)).rows[0])[0] as any;
    const layouts=[
      {id:'a'.repeat(32),path:'/prueba-gratis',variant:'old',viewportWidth:390,viewportHeight:844,width:390,height:1800,sections:[]},
      {id:'b'.repeat(32),path:'/prueba-gratis',variant:'trial-v2',viewportWidth:390,viewportHeight:844,width:390,height:1500,sections:[]},
    ];
    const event=(kind:string,layout=1,target?:string)=>({id:randomUUID(),pageId:randomUUID(),kind,layout,ageMs:0,...(target?{target}:{})});
    const session=randomUUID(),visitor=randomUUID();
    const write=async(events:unknown[],options:{session?:string;visitor?:string;channel?:string}={})=>scalar('SELECT record_web_analytics_batch($1,$2,$3,$4,$5,$6,$7,NULL)',[
      options.visitor||visitor,options.session||session,randomUUID(),'c'.repeat(64),
      JSON.stringify({channel:options.channel||'ads',device:'mobile',browser:'Chrome'}),JSON.stringify(layouts),JSON.stringify(events),
    ]);
    const report=async(channel='all',path:string|null=null)=>scalar("SELECT web_trial_signup_diagnostics(date_trunc('day',now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota',(date_trunc('day',now() AT TIME ZONE 'America/Bogota')+interval '1 day') AT TIME ZONE 'America/Bogota',$1,$2)",[channel,path]);
    await db.query('INSERT INTO motomanager_private.workshop_trial_claims VALUES($1,now()),($2,now())',[randomUUID(),randomUUID()]);
    await db.exec('SET ROLE service_role');
    await t.test('old autofocus activity is preserved but excluded from the new cohort',async()=>{
      await write([event('pageview',0),event('form_start',0)]);
      const r=await report();assert.equal(r.visits,0);assert.equal(r.started,0);assert.equal(r.firstMeasuredAt,null);assert.equal(r.confirmedTrials,2);
      assert.equal(await scalar('SELECT count(*)::int FROM web_analytics_events'),2);
    });
    await t.test('real writing, access, repeated sends and errors count attempts and navigations separately',async()=>{
      const retry=event('form_submit',1,'activate');
      await write([event('pageview'),event('form_start'),event('form_step',1,'access'),event('form_submit',1,'activate'),event('form_error',1,'account_exists'),retry]);
      await write([retry]);
      await write([event('pageview')],{visitor:randomUUID(),session:randomUUID()});
      await write([event('pageview'),event('form_start'),event('form_error',1,'validation')],{visitor:randomUUID(),session:randomUUID(),channel:'direct'});
      const r=await report();assert.equal(r.visits,3);assert.equal(r.started,2);assert.equal(r.accessStep,1);assert.equal(r.submitted,1);assert.equal(r.submitAttempts,2);assert.ok(r.firstMeasuredAt);
      assert.deepEqual(r.clientErrors,[{code:'account_exists',attempts:1,visits:1},{code:'validation',attempts:1,visits:1}]);
      assert.equal((await report('ads')).visits,2);assert.equal((await report('direct')).started,1);
      assert.equal((await report('all','/login')).visits,0);
    });
    await t.test('actual trials do not depend on analytics delivery and global errors are never assigned to an ad visitor',async()=>{
      await db.query("SELECT record_trial_signup_failure('rate_limited')");await db.query("SELECT record_trial_signup_failure('rate_limited')");
      const r=await report('ads');assert.equal(r.confirmedTrials,2);assert.deepEqual(r.serverErrors,[{code:'rate_limited',attempts:2}]);
      const filtered=await report('direct','/login');assert.equal(filtered.visits,0);assert.equal(filtered.confirmedTrials,2);assert.deepEqual(filtered.serverErrors,r.serverErrors);
      assert.equal(await scalar('SELECT count(*)::int FROM web_analytics_accesses'),0);
      assert.deepEqual((await db.query<{column_name:string}>("SELECT column_name FROM information_schema.columns WHERE table_schema='private' AND table_name='trial_signup_failures' ORDER BY ordinal_position")).rows.map(row=>row.column_name),['day','code','attempts']);
    });
    await t.test('SQL rejects arbitrary error text and form coordinates, not just the HTTP validator',async()=>{
      await assert.rejects(()=>write([event('form_error',1,'private@example.test')]),/constraint/);
      await assert.rejects(()=>write([{...event('form_submit',1,'activate'),x:.5,y:.2}]),/constraint/);
      await assert.rejects(()=>write([event('form_step',1,'password')]),/constraint/);
      await assert.rejects(()=>db.query("SELECT record_trial_signup_failure('private@example.test')"),/constraint/);
    });
    await t.test('browser roles cannot read counters, create health failures or execute the report',async()=>{
      await db.exec('RESET ROLE');
      for(const role of ['anon','authenticated']){
        await db.exec('SET ROLE '+role);
        await assert.rejects(()=>db.query('SELECT * FROM private.trial_signup_failures'),/permission denied/);
        await assert.rejects(()=>db.query("SELECT record_trial_signup_failure('rate_limited')"),/permission denied/);
        await assert.rejects(()=>report(),/permission denied/);
        await db.exec('RESET ROLE');
      }
      assert.equal(await scalar("SELECT count(*)::int FROM pg_proc WHERE proname IN ('web_trial_signup_diagnostics','record_trial_signup_failure') AND prosecdef"),0);
      await assert.rejects(()=>db.query("SELECT web_trial_signup_diagnostics(now(),now()-interval '1 hour')"),/Invalid analytics range/);
      await assert.rejects(()=>db.query("SELECT web_trial_signup_diagnostics(NULL,now())"),/Invalid analytics range/);
    });
  }finally{await db.close();}
});
