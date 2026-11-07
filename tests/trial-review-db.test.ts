import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('trial review enforces access with existing JWTs and restores only unused free time', async t => {
  const db = new PGlite();
  const owner = randomUUID(), other = randomUUID(), admin = randomUUID(), employee = randomUUID();
  const verification = { workshopName: 'Taller confirmado', city: 'Bogotá', address: 'Calle 100 # 20-30', responsibleName: 'Responsable confirmado', phone: '573001234567', evidence: 'Videollamada del taller y dirección comprobadas.', contacted: true, locationChecked: true, evidenceChecked: true };
  const message = 'La prueba está pausada temporalmente mientras verificamos los datos reales del taller.';
  const scalar = async (sql: string, args: any[] = []) => Object.values((await db.query<any>(sql, args)).rows[0])[0] as any;
  const actor = async (role: string, user: string | null, fn: () => Promise<void>) => {
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [user || '', JSON.stringify({ sub: user, role })]);
    await db.exec('SET ROLE ' + role);
    try { await fn(); } finally { await db.exec('RESET ROLE'); await db.exec("SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)"); }
  };
  const change = (org: string, action: string, evidence: object = verification, by = admin) => scalar('SELECT public.admin_review_workshop_trial($1,$2,$3,$4,$5,$6)', [by, org, action, 'Conclusión interna confidencial', message, JSON.stringify(evidence)]);
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE authenticator;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE TABLE public.organizations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,slug text,email text,phone text,legal_name text,tax_identifier text,status text DEFAULT 'active',settings jsonb DEFAULT '{}');
      CREATE TABLE public.organization_members(organization_id uuid REFERENCES organizations(id),user_id uuid REFERENCES auth.users(id),role text,status text,joined_at timestamptz DEFAULT now(),PRIMARY KEY(organization_id,user_id));
      CREATE TABLE public.profiles(id uuid PRIMARY KEY,phone text);
      CREATE TABLE public.customers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid REFERENCES organizations(id),name text);
      CREATE TABLE public.child_records(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),value text);
      CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text);
      CREATE FUNCTION public.create_organization_with_owner(text,text,text,text,text,text,text,text,text) RETURNS uuid LANGUAGE sql AS $$SELECT gen_random_uuid()$$;
      GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon,service_role;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated,service_role;
      GRANT ALL ON storage.objects TO authenticated,service_role;
      ALTER TABLE organizations ENABLE ROW LEVEL SECURITY; ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
      ALTER TABLE customers ENABLE ROW LEVEL SECURITY; ALTER TABLE child_records ENABLE ROW LEVEL SECURITY;
      ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE POLICY legacy ON organizations FOR ALL TO authenticated USING(true) WITH CHECK(true);
      CREATE POLICY legacy ON organization_members FOR ALL TO authenticated USING(true) WITH CHECK(true);
      CREATE POLICY legacy ON customers FOR ALL TO authenticated USING(true) WITH CHECK(true);
      CREATE POLICY legacy ON child_records FOR ALL TO authenticated USING(true) WITH CHECK(true);
      CREATE POLICY legacy ON profiles FOR ALL TO authenticated USING(true) WITH CHECK(true);
      CREATE POLICY legacy ON storage.objects FOR ALL TO authenticated USING(true) WITH CHECK(true);
      INSERT INTO child_records(value) VALUES('Private child record'); INSERT INTO storage.objects(name) VALUES('Private file');`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261030014156_workshop_full_trial.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../supabase/migrations/20261107035758_workshop_trial_review.sql', import.meta.url), 'utf8'));
    await db.query('INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES($1,$2,$3,$4),($5,$6,$7,$8),($9,$10,$11,$12),($13,$14,$15,$16)', [owner,'owner@example.test','{}','{"is_super_admin":true}',other,'other@example.test','{}','{}',admin,'admin@example.test','{"is_super_admin":true}','{}',employee,'employee@example.test','{}','{}']);
    await db.query('INSERT INTO profiles(id) VALUES($1),($2)', [owner,other]);
    const org = await scalar("SELECT provision_workshop_account($1,'Taller de prueba','taller-prueba','573009990001')", [owner]);
    const otherOrg = await scalar("SELECT provision_workshop_account($1,'Otro taller','otro-taller','573009990002')", [other]);
    await db.query("INSERT INTO organization_members VALUES($1,$2,'mechanic','active',now())",[org,employee]);
    await db.query("UPDATE organizations SET settings=settings||'{\"business_hours\":{\"monday\":\"8-17\"}}' WHERE id=$1",[org]);
    await db.query("INSERT INTO customers(organization_id,name) VALUES($1,'Cliente ficticio'),($2,'Otro cliente')",[org,otherOrg]);
    let remaining = 0;
    await t.test('only the server and a real platform admin can pause a current trial', async () => {
      await actor('authenticated', owner, async () => {
        await assert.rejects(() => change(org,'pause'), /permission denied/);
        await assert.rejects(() => db.query('SELECT * FROM motomanager_private.workshop_trial_reviews'), /permission denied/);
        await assert.rejects(() => db.query('SELECT admin_list_trial_reviews()'), /permission denied/);
        await assert.rejects(() => db.query("UPDATE organizations SET settings=settings||'{\"trialReviewPaused\":false}' WHERE id=$1",[org]), /Only administration/);
      });
      await actor('service_role', null, async () => {
        await assert.rejects(() => change(org,'pause',verification,owner), /administrator required/);
        remaining = (await change(org,'pause')).remainingSeconds;
        assert.ok(remaining > 14*86400 && remaining <= 15*86400);
        await change(org,'pause');
      });
      assert.equal(await scalar('SELECT count(*)::int FROM motomanager_private.workshop_trial_review_events'),1);
    });
    await t.test('an existing owner/employee token loses REST, nested records and authenticated storage access', async () => {
      for (const id of [owner,employee]) await actor('authenticated',id, async () => {
        assert.equal(await scalar('SELECT is_organization_member($1)',[org]),false);
        for (const table of ['customers','child_records','profiles','organization_members','storage.objects']) assert.equal(await scalar('SELECT count(*)::int FROM '+table),0);
        await assert.rejects(() => db.query("INSERT INTO customers(organization_id,name) VALUES($1,'Blocked')",[org]), /Trial under review|row-level security/);
        await db.exec("SELECT set_config('request.path','/rpc/legacy_definer_read',false)");
        await assert.rejects(() => db.query('SELECT motomanager_private.check_trial_review_request()'), /TRIAL_UNDER_REVIEW/);
        await db.exec("SELECT set_config('request.path','/rpc/get_my_trial_review',false)");
        await db.query('SELECT motomanager_private.check_trial_review_request()');
        const mine = await scalar('SELECT get_my_trial_review()');
        assert.equal(mine.organizationId,org);assert.equal(mine.message,message);
        assert.deepEqual(Object.keys(mine).sort(),['organizationId','workshopName','pausedAt','message'].sort());
      });
      await actor('authenticated',other, async () => { assert.equal(await scalar('SELECT get_my_trial_review()'),null); assert.ok(await scalar('SELECT count(*)::int FROM customers')>0); });
      await actor('authenticated',admin, async () => { assert.equal(await scalar('SELECT get_my_trial_review()'),null); assert.ok(await scalar('SELECT count(*)::int FROM customers')>0); });
      await actor('anon',null,async()=>{await db.query('SELECT motomanager_private.check_trial_review_request()');await assert.rejects(()=>db.query('SELECT get_my_trial_review()'),/permission denied/);});
    });
    await t.test('verification is mandatory; elapsed review time is not deducted; unrelated settings survive', async () => {
      await db.query("UPDATE motomanager_private.workshop_trial_claims SET ends_at=now()-interval '3 days' WHERE organization_id=$1",[org]);
      await actor('service_role',null, async () => {
        await assert.rejects(() => change(org,'verify',{...verification,evidenceChecked:false}), /verification checklist/);
        assert.equal(await scalar('SELECT status FROM motomanager_private.workshop_trial_reviews WHERE organization_id=$1',[org]),'paused');
        await change(org,'verify'); await change(org,'verify');
      });
      const config = await scalar('SELECT settings FROM organizations WHERE id=$1',[org]);
      assert.deepEqual(config.business_hours,{monday:'8-17'}); assert.equal(config.trialReviewPaused,false);
      assert.equal(config.isTrial,true); assert.equal(config.city,'Bogotá');assert.equal(config.address,verification.address);
      const restored = await scalar('SELECT extract(epoch FROM ends_at-now())::float8 FROM motomanager_private.workshop_trial_claims WHERE organization_id=$1',[org]);
      assert.ok(Math.abs(restored-remaining)<2);
      assert.equal(await scalar('SELECT count(*)::int FROM motomanager_private.workshop_trial_review_events'),2);
      await actor('authenticated',owner, async () => { assert.equal(await scalar('SELECT get_my_trial_review()'),null); assert.equal(await scalar('SELECT is_organization_member($1)',[org]),true); });
    });
    await t.test('payment cannot silently remove a review or be downgraded when verification finishes', async () => {
      await actor('service_role',null, async () => {
        await change(org,'pause');
        await db.query("SELECT activate_verified_workshop_subscription($1,'pro','monthly',79900,'review-fixture-payment')",[org]);
      });
      await actor('authenticated',owner,async()=>{ assert.notEqual(await scalar('SELECT get_my_trial_review()'),null); });
      const paidEnd = (await scalar('SELECT settings FROM organizations WHERE id=$1',[org])).endDate;
      await actor('service_role',null,async()=>{ await change(org,'verify'); await assert.rejects(()=>change(org,'pause'),/current free trial/); });
      const settings = await scalar('SELECT settings FROM organizations WHERE id=$1',[org]);
      assert.equal(settings.endDate,paidEnd);assert.equal(settings.isTrial,false);assert.equal(settings.plan,'pro');assert.equal(settings.trialReviewPaused,false);
      assert.equal(await scalar('SELECT count(*)::int FROM motomanager_private.workshop_trial_review_events'),4);
      assert.equal(await scalar('SELECT count(*)::int FROM customers'),2);
    });
  } finally { await db.close(); }
});
