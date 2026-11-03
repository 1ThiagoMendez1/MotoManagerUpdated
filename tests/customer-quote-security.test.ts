import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('quote page and mutation require the same verified workshop/customer association',async()=>{
  const [guard,page,actions]=await Promise.all([
    '../src/app/cotizacion/[id]/access.ts',
    '../src/app/cotizacion/[id]/page.tsx',
    '../src/app/cotizacion/[id]/actions.ts',
  ].map(path=>readFile(new URL(path,import.meta.url),'utf8')));
  assert.match(guard,/auth\.getUser\(\)/);
  assert.match(guard,/email_confirmed_at/);
  assert.match(guard,/workshop_customer_accounts/);
  assert.match(guard,/\.eq\('organization_id',order\.organization_id\)/);
  assert.match(guard,/\.eq\('customer_id',bike\.customer_id\)/);
  assert.match(guard,/\.eq\('status','active'\)/);
  assert.match(page,/canAccessOwnCustomerQuote\(resolvedParams\.id\)/);
  assert.match(actions,/canAccessOwnCustomerQuote\(workOrderId\)/);
  assert.doesNotMatch(page,/normalizePlate|isAuthValid|realLicensePlate/);
  assert.doesNotMatch(actions,/if \(!workOrderId\)[\s\S]*?const supabase = await createAdminClient\(\)/);
});
