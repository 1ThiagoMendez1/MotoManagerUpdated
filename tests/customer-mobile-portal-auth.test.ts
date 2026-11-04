import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('mobile portal requires the same customer/workshop authorization pairs as web', async()=>{
  const route=await readFile(new URL('../src/app/api/mobile/portal-data/route.ts',import.meta.url),'utf8');
  assert.match(route,/auth\.getUser\(token\)/);
  assert.match(route,/email_confirmed_at/);
  assert.match(route,/workshop_customer_accounts/);
  assert.match(route,/eligibleCustomerLinks/);
  assert.match(route,/allowed\.has\(row\.organization_id \+ ':' \+ row\.customer_id\)/);
  assert.match(route,/Cache-Control/);
  assert.doesNotMatch(route,/\.eq\('auth_user_id',\s*user\.id\)/);
  assert.doesNotMatch(route,/\.select\('\*'\)/);
});
