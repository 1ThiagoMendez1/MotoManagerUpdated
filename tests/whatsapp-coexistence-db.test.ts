import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('WhatsApp credentials, one-time signup, sync and conversations stay isolated in private tables', async t => {
  const db = new PGlite(), org = randomUUID(), other = randomUUID(), owner = randomUUID(), employee = randomUUID(), outsider = randomUUID();
  const query = async (sql: string, args: any[] = []) => Object.values((await db.query<any>(sql, args)).rows[0])[0] as any;
  const rpc = (action: string, data: object) => query('SELECT whatsapp_service($1,$2)', [action, JSON.stringify(data)]);
  const asRole = async (role: string, fn: () => Promise<void>) => { await db.exec('SET ROLE ' + role); try { await fn(); } finally { await db.exec('RESET ROLE'); } };
  const begin = (organization = org, actor = owner, hash = 'a'.repeat(64)) => rpc('begin', { org: organization, actor, hash });
  const claim = (organization = org, actor = owner, hash = 'a'.repeat(64)) => rpc('claim', { org: organization, actor, hash });
  const save = (organization = org, actor = owner, phone = '111111', waba = '999999') => rpc('save', { org: organization, actor, phone, waba, number: '573000000001', name: 'Fixture', token: 'v1.' + 'encrypted-fixture'.repeat(4), expires: null });
  const ingest = (hash: string, changes: object = {}) => rpc('ingest', { org, phone: '111111', hash, field: 'history', payload: 'encrypted payload', progress: 0,
    messages: [{ id: 'fixture-message', timestamp: '2026-11-12T00:00:00Z', payload: 'encrypted message' }], ...changes });
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE public.organizations(id uuid PRIMARY KEY);
      CREATE TABLE public.organization_members(organization_id uuid,user_id uuid,role text,status text);
      GRANT USAGE ON SCHEMA public,auth TO service_role,authenticated,anon;
      GRANT SELECT ON public.organization_members TO service_role;`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261112043328_whatsapp_coexistence.sql', import.meta.url), 'utf8'));
    await db.query('INSERT INTO auth.users VALUES($1),($2),($3)', [owner, employee, outsider]);
    await db.query('INSERT INTO organizations VALUES($1),($2)', [org, other]);
    await db.query("INSERT INTO organization_members VALUES($1,$2,'owner','active'),($1,$3,'mechanic','active'),($4,$5,'owner','active')", [org, owner, employee, other, outsider]);
    await t.test('anon and authenticated callers cannot read secrets or call the service RPC', async () => {
      for (const role of ['anon','authenticated']) await asRole(role, async () => {
        for (const table of ['whatsapp_connections','whatsapp_signup_sessions','whatsapp_events','whatsapp_messages'])
          await assert.rejects(() => db.query('SELECT * FROM motomanager_private.' + table), /permission denied/);
        await assert.rejects(() => rpc('get', { org }), /permission denied/);
        await assert.rejects(() => begin(), /permission denied/);
      });
    });
    await t.test('signup requires a live admin membership and atomically claims the nonce once', async () => {
      await asRole('service_role', async () => {
        await assert.rejects(() => begin(org, employee), /administrator required/);
        await assert.rejects(() => begin(org, outsider), /administrator required/);
        await begin();
        assert.equal(await claim(other, outsider), false);
        assert.equal(await claim(org, owner, 'b'.repeat(64)), false);
        assert.equal(await claim(), true); assert.equal(await claim(), false);
        await assert.rejects(() => begin(), /Wait before/);
        await save();
        const connection = await rpc('get', { org }); assert.equal(connection.status, 'setting_up');
        assert.equal(await rpc('get', { org: other }), null);
        await begin(other, outsider, 'b'.repeat(64));
        await claim(other, outsider, 'b'.repeat(64));
        await assert.rejects(() => save(other, outsider, '111111', '888888'), /unique constraint/);
        await save(other, outsider, '222222', '888888');
      });
    });
    await t.test('expired sessions cannot be claimed and prior claims cannot be reused as new signups', async () => {
      await db.query("UPDATE motomanager_private.whatsapp_signup_sessions SET expires_at=now()-interval '1 second',claimed_at=NULL WHERE organization_id=$1", [other]);
      await asRole('service_role', async () => { assert.equal(await claim(other, outsider, 'b'.repeat(64)), false); });
    });
    await t.test('webhook persistence deduplicates messages and progress never goes backward', async () => {
      await asRole('service_role', async () => {
        await rpc('patch', { org, patch: { details: { subscribed: true, templates: { order: 'APPROVED', quote: 'APPROVED', receipt: 'APPROVED', appointment: 'PENDING' } } } });
        assert.equal(await ingest('invalid-phone', { phone: '222222', progress: 100 }), false);
        await ingest('phase-2', { progress: 100 }); await ingest('phase-2', { progress: 100 }); await ingest('late-phase-0', { progress: 20 });
        const c = await rpc('get', { org }); assert.equal(c.details.progress, 100); assert.equal(c.status, 'pending_templates');
        assert.equal((await rpc('messages', { org })).length, 1);
        assert.deepEqual(await rpc('messages', { org: other }), []);
        assert.deepEqual(await rpc('messages', { org, before: '2026-11-12T00:00:00Z', beforeId: 'fixture-message' }), []);
        await rpc('patch', { org, patch: { details: { templates: { order: 'APPROVED', quote: 'APPROVED', receipt: 'APPROVED', appointment: 'APPROVED' } } } });
        assert.equal((await rpc('get', { org })).status, 'active');
      });
      assert.equal(await query('SELECT count(*)::int FROM motomanager_private.whatsapp_events WHERE organization_id=$1', [org]), 2);
    });
    await t.test('pauses and revocations survive late history and template updates', async () => {
      await asRole('service_role', async () => {
        await rpc('patch', { org, patch: { status: 'paused' } });
        await ingest('late-after-pause', { progress: 100 });
        assert.equal((await rpc('get', { org })).status, 'paused');
        await ingest('offboarded', { field: 'account_update', disconnected: true });
        assert.equal((await rpc('get', { org })).status, 'reconnect_required');
        await rpc('patch', { org, patch: { details: { templates: { order: 'APPROVED', quote: 'APPROVED', receipt: 'APPROVED', appointment: 'APPROVED' } } } });
        assert.equal((await rpc('get', { org })).status, 'reconnect_required');
      });
    });
    await t.test('a reconnect retains its number history; changing number cannot inherit another inbox', async () => {
      await asRole('service_role', async () => {
        await save(); assert.equal((await rpc('messages', { org })).length, 1);
        await save(org, owner, '333333', '777777'); assert.deepEqual(await rpc('messages', { org }), []);
        assert.equal((await rpc('find', { waba: '888888' })).organization_id, other);
      });
    });
  } finally { await db.close(); }
});
