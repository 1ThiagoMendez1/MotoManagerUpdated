import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('webhook inbox accepts only server writes, deduplicates per app, and expires old receipts', async () => {
  const db = new PGlite();
  const ciphertext = 'v1.' + 'A'.repeat(16) + '.' + 'B'.repeat(22) + '.' + 'C'.repeat(100);
  const args = ['1304241294974266', 'a'.repeat(64), ciphertext, 100];
  const record = async (values = args) => (await db.query<{ inserted: boolean }>(
    'SELECT public.record_whatsapp_webhook_receipt($1,$2,$3,$4) AS inserted', values,
  )).rows[0].inserted;
  try {
    await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;');
    await db.exec(await readFile(new URL('../supabase/migrations/20261112234745_whatsapp_webhook_receipts.sql', import.meta.url), 'utf8'));
    for (const role of ['anon', 'authenticated']) {
      await db.exec('SET ROLE ' + role);
      await assert.rejects(record, /permission denied/);
      await assert.rejects(() => db.query('SELECT * FROM motomanager_private.whatsapp_webhook_receipts'), /permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET ROLE service_role');
    assert.equal(await record(), true); assert.equal(await record(), false);
    assert.equal(await record(['1304241294974267', ...args.slice(1)]), true);
    await assert.rejects(() => record([args[0], 'b'.repeat(64), 'plaintext message', 100]), /check constraint/);
    await db.exec('RESET ROLE');
    await db.exec("UPDATE motomanager_private.whatsapp_webhook_receipts SET expires_at=now()-interval '1 second'");
    await db.exec('SET ROLE service_role');
    assert.equal(await record(), true);
    assert.equal((await db.query('SELECT * FROM motomanager_private.whatsapp_webhook_receipts')).rows.length, 1);
    const functionInfo = (await db.query<{prosecdef:boolean; proconfig:string[]}>("SELECT prosecdef,proconfig FROM pg_proc WHERE proname='record_whatsapp_webhook_receipt'")).rows[0];
    assert.equal(functionInfo.prosecdef, false); assert.deepEqual(functionInfo.proconfig, ['search_path=""']);
  } finally { await db.close(); }
});
