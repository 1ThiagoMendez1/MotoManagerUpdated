import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const sqlFile = (name: string) => readFile(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8');

test('30-day offer provisions both access methods, preserves existing dates and server-only permissions', async () => {
  const db = new PGlite();
  const scalar = async (sql: string, args: any[] = []) => Object.values((await db.query<any>(sql, args)).rows[0])[0] as any;
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,phone text UNIQUE,raw_app_meta_data jsonb DEFAULT '{}');
      CREATE TABLE public.organizations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,slug text UNIQUE,email text,phone text,settings jsonb,status text DEFAULT 'active',legal_name text,tax_identifier text);
      CREATE TABLE public.profiles(id uuid PRIMARY KEY,phone text);
      CREATE TABLE public.organization_members(user_id uuid,organization_id uuid,status text,role text,joined_at timestamptz DEFAULT now());
      CREATE TABLE public.work_orders(id uuid DEFAULT gen_random_uuid(),organization_id uuid);
      CREATE SCHEMA motomanager_private;
      CREATE TABLE motomanager_private.workshop_trial_claims(organization_id uuid UNIQUE,user_id uuid UNIQUE,email text UNIQUE NOT NULL,phone text UNIQUE,starts_at timestamptz DEFAULT now(),ends_at timestamptz DEFAULT now()+interval '15 days',converted_at timestamptz);
      GRANT USAGE ON SCHEMA public,auth,motomanager_private TO service_role;
      GRANT ALL ON ALL TABLES IN SCHEMA public,motomanager_private TO service_role;
      GRANT SELECT(id,email) ON auth.users TO service_role;`);
    const initial = await sqlFile('20261030014156_workshop_full_trial.sql');
    const provision = initial.slice(initial.indexOf('CREATE OR REPLACE FUNCTION public.provision_workshop_account('), initial.indexOf('CREATE OR REPLACE FUNCTION public.activate_verified_workshop_subscription('));
    await db.exec(provision);
    const checkout = await sqlFile('20261109150531_subscription_wompi_checkout.sql');
    await db.exec(checkout.slice(0, checkout.indexOf('CREATE FUNCTION public.create_workshop_subscription_checkout(')));
    for (const name of ['20261030220017_web_analytics.sql', '20261111200459_trial_signup_conversion_diagnostics.sql', '20261112215121_trial_field_progress.sql', '20261113222936_workshop_phone_trial_login.sql']) await db.exec(await sqlFile(name));

    const oldOwner = randomUUID(), newOwner = randomUUID(), paidOwner = randomUUID();
    await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2),($3,$4),($5,$6)', [oldOwner, 'old@example.test', newOwner, 'new@example.test', paidOwner, 'paid@example.test']);
    const oldOrg = await scalar("SELECT public.provision_workshop_account($1,'Existing workshop','existing-workshop','573000000010')", [oldOwner]);
    const oldSettings = await scalar('SELECT settings FROM organizations WHERE id=$1', [oldOrg]);
    const oldClaim = await scalar('SELECT row_to_json(c) FROM motomanager_private.workshop_trial_claims c WHERE organization_id=$1', [oldOrg]);
    await db.exec(await sqlFile('20261125210547_workshop_trial_thirty_days.sql'));
    assert.deepEqual(await scalar('SELECT settings FROM organizations WHERE id=$1', [oldOrg]), oldSettings);
    assert.deepEqual(await scalar('SELECT row_to_json(c) FROM motomanager_private.workshop_trial_claims c WHERE organization_id=$1', [oldOrg]), oldClaim);

    for (const role of ['anon', 'authenticated']) {
      await db.exec('SET ROLE ' + role);
      await assert.rejects(() => db.query("SELECT public.provision_workshop_account($1,'Blocked workshop','blocked-workshop','573000000020')", [newOwner]), /permission denied/);
      await assert.rejects(() => db.query("SELECT public.workshop_phone_auth('request','{}')"), /permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    const emailOrg = await scalar("SELECT public.provision_workshop_account($1,'New email workshop','new-email-workshop','573000000011')", [newOwner]);
    assert.equal(await scalar("SELECT ends_at-starts_at=interval '30 days' FROM motomanager_private.workshop_trial_claims WHERE organization_id=$1", [emailOrg]), true);
    const emailSettings = await scalar('SELECT settings FROM organizations WHERE id=$1', [emailOrg]);
    assert.equal(emailSettings.trialDurationDays, 30);
    assert.equal(Date.parse(emailSettings.trialEndDate) - Date.parse(emailSettings.trialStartDate), 30 * 86400000);
    assert.equal(emailSettings.isTrial, true); assert.equal(emailSettings.plan, 'full'); assert.equal(emailSettings.paidAmount, 0);
    await assert.rejects(() => db.query("SELECT public.provision_workshop_account($1,'Duplicate workshop','duplicate-workshop','3000000011')", [paidOwner]), /Trial already used/);

    const request = { id: randomUUID(), mode: 'signup', phone: '573000000012', workshopName: 'New phone workshop', browserHash: 'a'.repeat(64), codeHash: 'b'.repeat(64), phoneKey: 'c'.repeat(64), ipKey: 'd'.repeat(64) };
    const binding = { id: request.id, browserHash: request.browserHash, codeHash: request.codeHash, lease: randomUUID() };
    const rpc = (action: string, input: object) => scalar('SELECT public.workshop_phone_auth($1,$2)', [action, JSON.stringify(input)]);
    assert.equal((await rpc('request', request)).ok, true);
    const claimed = await rpc('claim', binding);
    await db.exec('RESET ROLE');
    await db.query("INSERT INTO auth.users(id,phone,raw_app_meta_data) VALUES($1,$2,'{\"workshop_phone_auth\":true}')", [claimed.userId, request.phone]);
    await db.exec('SET ROLE service_role');
    const phoneOrg = (await rpc('complete', { ...binding, slug: 'new-phone-workshop' })).organizationId;
    assert.ok(phoneOrg);
    assert.equal(await scalar("SELECT ends_at-starts_at=interval '30 days' FROM motomanager_private.workshop_trial_claims WHERE organization_id=$1", [phoneOrg]), true);
    const phoneSettings = await scalar('SELECT settings FROM organizations WHERE id=$1', [phoneOrg]);
    assert.equal(phoneSettings.trialDurationDays, 30);
    for (const [start, end] of [['trialStartDate', 'trialEndDate'], ['startDate', 'endDate'], ['demoStartDate', 'demoEndDate']]) assert.equal(Date.parse(phoneSettings[end]) - Date.parse(phoneSettings[start]), 30 * 86400000);
    const originalEnd = phoneSettings.trialEndDate;
    assert.equal((await rpc('complete', { ...binding, slug: 'retry-must-not-provision' })).created, false);
    assert.equal((await scalar('SELECT settings FROM organizations WHERE id=$1', [phoneOrg])).trialEndDate, originalEnd);

    const paidOrg = await scalar("SELECT public.provision_workshop_account($1,'Paid workshop','paid-workshop','573000000013','',false,'pro','2026-11-25T12:00:00Z','2026-12-25T12:00:00Z')", [paidOwner]);
    const paid = await scalar('SELECT settings FROM organizations WHERE id=$1', [paidOrg]);
    assert.equal(paid.isTrial, false); assert.equal(paid.plan, 'pro');
    assert.equal(Date.parse(paid.endDate), Date.parse('2026-12-25T12:00:00Z'));
    assert.equal(await scalar('SELECT count(*)::int FROM motomanager_private.workshop_trial_claims WHERE organization_id=$1', [paidOrg]), 0);
  } finally { await db.close(); }
});
