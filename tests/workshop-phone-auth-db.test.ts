import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('phone authentication is transactional, browser bound, one use, isolated from existing accounts, and never restarts a trial', async t => {
  const db = new PGlite();
  const scalar = async (sql: string, args: any[] = []) => Object.values((await db.query<any>(sql, args)).rows[0])[0] as any;
  const rpc = (action: string, input: object) => scalar('SELECT public.workshop_phone_auth($1,$2)', [action, JSON.stringify(input)]);
  const req = (phone = '573230000001', changes = {}) => ({ id: randomUUID(), mode: 'signup', phone, workshopName: 'Taller fixture',
    browserHash: 'a'.repeat(64), codeHash: 'b'.repeat(64), phoneKey: phone.padEnd(64, '0'), ipKey: 'c'.repeat(64), ...changes });
  const bind = (r: ReturnType<typeof req>, changes = {}) => ({ id: r.id, browserHash: r.browserHash, codeHash: r.codeHash, lease: randomUUID(), ...changes });
  const expireCooldown = (r: ReturnType<typeof req>) => db.query("UPDATE motomanager_private.workshop_phone_challenges SET created_at=now()-interval '61 seconds' WHERE id=$1", [r.id]);
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,phone text UNIQUE,raw_app_meta_data jsonb DEFAULT '{}');
      CREATE TABLE public.organizations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,slug text UNIQUE,email text,phone text,settings jsonb,status text DEFAULT 'active');
      CREATE TABLE public.profiles(id uuid PRIMARY KEY,phone text);
      CREATE TABLE public.organization_members(user_id uuid,organization_id uuid,status text,role text,joined_at timestamptz DEFAULT now());
      CREATE TABLE public.work_orders(id uuid DEFAULT gen_random_uuid(),organization_id uuid);
      CREATE SCHEMA motomanager_private;
      CREATE TABLE motomanager_private.workshop_trial_claims(organization_id uuid UNIQUE,user_id uuid UNIQUE,email text UNIQUE NOT NULL,phone text UNIQUE,starts_at timestamptz DEFAULT now(),ends_at timestamptz DEFAULT now()+interval '15 days');
      GRANT USAGE ON SCHEMA public,auth,motomanager_private TO service_role;
      GRANT ALL ON public.organizations,public.profiles,public.organization_members,public.work_orders,motomanager_private.workshop_trial_claims TO service_role;
      GRANT SELECT(id,email) ON auth.users TO service_role;`);
    for (const name of ['20261030220017_web_analytics.sql','20261111200459_trial_signup_conversion_diagnostics.sql','20261112215121_trial_field_progress.sql','20261113222936_workshop_phone_trial_login.sql']) {
      await db.exec(await readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8'));
    }
    await t.test('all new tables and RPCs deny anonymous and authenticated roles', async () => {
      for (const role of ['anon','authenticated']) {
        await db.exec('SET ROLE ' + role);
        for (const name of ['accounts','challenges','limits','milestones']) await assert.rejects(() => db.query('SELECT * FROM motomanager_private.workshop_phone_' + name), /permission denied/);
        await assert.rejects(() => rpc('request', req()), /permission denied/);
        await db.exec('RESET ROLE');
      }
    });
    const request = req(), binding = bind(request);
    await db.exec('SET ROLE service_role');
    await t.test('request creates no account, limits resends, and wrong browsers consume no attempts', async () => {
      assert.equal((await rpc('request', request)).ok, true);
      assert.equal(await scalar('SELECT count(*)::int FROM organizations'), 0);
      assert.equal((await rpc('request', req())).error, 'limited');
      assert.equal((await rpc('claim', { ...binding, browserHash: 'd'.repeat(64) })).error, 'invalid');
      assert.equal(await scalar('SELECT attempts FROM motomanager_private.workshop_phone_challenges WHERE id=$1', [request.id]), 0);
      assert.equal((await rpc('claim', { ...binding, codeHash: 'f'.repeat(64) })).error, 'invalid');
      assert.equal(await scalar('SELECT attempts FROM motomanager_private.workshop_phone_challenges WHERE id=$1', [request.id]), 1);
      assert.equal((await rpc('complete', { ...binding, lease: null, slug: 'invalid-bypass' })).error, 'invalid');
    });
    let user: string, organization: string;
    await t.test('verification reserves one account; only confirmed phone identity may atomically provision', async () => {
      const claimed = await rpc('claim', binding); user = claimed.userId;
      assert.ok(user); assert.equal(claimed.existing, false);
      assert.equal((await rpc('claim', binding)).error, 'processing');
      assert.equal((await rpc('complete', { ...binding, slug: 'fixture-taller' })).error, 'invalid');
      await db.exec('RESET ROLE');
      await db.query("INSERT INTO auth.users(id,phone,raw_app_meta_data) VALUES($1,$2,'{\"workshop_phone_auth\":true}')", [user, request.phone]);
      await db.query('INSERT INTO profiles(id) VALUES($1)', [user]);
      await db.exec('SET ROLE service_role');
      const completed = await rpc('complete', { ...binding, slug: 'fixture-taller' }); organization = completed.organizationId;
      assert.ok(organization); assert.equal(completed.created, true);
      assert.equal((await rpc('complete', { ...binding, slug: 'should-not-be-created' })).created, false);
      assert.equal(await scalar('SELECT count(*)::int FROM organizations'), 1);
      assert.equal(await scalar('SELECT count(*)::int FROM motomanager_private.workshop_trial_claims'), 1);
      assert.equal((await rpc('finish', binding)).ok, true);
      assert.equal((await rpc('claim', binding)).error, 'invalid');
    });
    await t.test('returning signup is a login and preserves trial dates and workshop data', async () => {
      const before = await scalar('SELECT ends_at FROM motomanager_private.workshop_trial_claims');
      await expireCooldown(request); const next = req(); assert.equal((await rpc('request', next)).ok, true);
      const binding2 = bind(next), claimed = await rpc('claim', binding2); assert.equal(claimed.userId, user); assert.equal(claimed.existing, true);
      const result = await rpc('complete', { ...binding2, slug: 'no-new-trial' }); assert.equal(result.organizationId, organization); assert.equal(result.created, false);
      assert.equal(String(await scalar('SELECT ends_at FROM motomanager_private.workshop_trial_claims')), String(before));
      assert.equal((await rpc('finish', binding2)).ok, true);
    });
    await t.test('delivery deduplicates receipts and counts only a first order, without PII in analytics', async () => {
      await rpc('message', { id: request.id, accepted: true, messageId: 'wamid.fixture' });
      for (let i = 0; i < 2; i++) await rpc('status', { messageId: 'wamid.fixture', status: 'delivered' });
      assert.equal(await scalar("SELECT count(*)::int FROM motomanager_private.workshop_phone_milestones WHERE kind='delivered'"), 1);
      await db.query('INSERT INTO work_orders(organization_id) VALUES($1),($1)', [organization]);
      assert.equal(await scalar("SELECT count(*)::int FROM motomanager_private.workshop_phone_milestones WHERE kind='first_order'"), 1);
      const report = await scalar("SELECT web_trial_phone_signup_diagnostics(now()-interval '1 day',now()+interval '1 day')");
      assert.equal(report.service.created, 1); assert.equal(report.service.first_order, 1); assert.equal(report.service.delivered, 1);
      assert.equal(JSON.stringify(report).includes(request.phone), false); assert.equal(report.visits, 0);
    });
    await t.test('existing phone/email accounts cannot be taken over or receive a second trial', async () => {
      await db.exec('RESET ROLE');
      const oldId = randomUUID(); await db.query("INSERT INTO auth.users(id,email,phone) VALUES($1,'original@example.test','573230000002')", [oldId]);
      await db.exec('SET ROLE service_role');
      const legacy = req('573230000002'); await rpc('request', legacy);
      assert.equal((await rpc('claim', bind(legacy))).error, 'legacy');
      assert.equal(await scalar('SELECT count(*)::int FROM organizations'), 1);
    });
    await t.test('five wrong attempts lock the challenge; expired codes and missing memberships fail closed', async () => {
      const wrong = req('573230000003'); await rpc('request', wrong);
      for (let i = 0; i < 5; i++) assert.equal((await rpc('claim', bind(wrong, { codeHash: 'e'.repeat(64) }))).error, 'invalid');
      assert.equal((await rpc('claim', bind(wrong))).error, 'invalid');
      const old = req('573230000004'); await rpc('request', old);
      await db.query("UPDATE motomanager_private.workshop_phone_challenges SET expires_at=now()-interval '1 second' WHERE id=$1", [old.id]);
      assert.equal((await rpc('claim', bind(old))).error, 'expired');
      await db.query('DELETE FROM organization_members WHERE organization_id=$1', [organization]);
      await db.query("UPDATE motomanager_private.workshop_phone_challenges SET created_at=now()-interval '2 minutes' WHERE phone=$1", [request.phone]);
      const retry = req(); await rpc('request', retry); const b = bind(retry); await rpc('claim', b);
      assert.equal((await rpc('complete', { ...b, slug: 'no-takeover' })).error, 'legacy');
    });
  } finally { await db.close(); }
});
