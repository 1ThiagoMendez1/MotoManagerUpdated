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
  assert.match(actions,/canAccessOwnCustomerQuote\(workOrderId\)[\s\S]*?const supabase = await createAdminClient\(\)/);
});

test('quote claim is atomic: concurrent responses cannot both discount stock',async()=>{
  const action=await readFile(new URL('../src/app/cotizacion/[id]/actions.ts',import.meta.url),'utf8');
  assert.match(action,/rpc\('change_work_order_parts'/);
  assert.match(action,/p_action: 'customer_quote'/);
  assert.match(action,/if \(error\) return/);
  assert.match(action,/slice\(0, 500\)/);
});

test('quote page never renders raw PostgREST errors or private rows on failure',async()=>{
  const page=await readFile(new URL('../src/app/cotizacion/[id]/page.tsx',import.meta.url),'utf8');
  assert.match(page,/if \(error \|\| !workOrder\) notFound\(\)/);
  assert.doesNotMatch(page,/JSON\.stringify\(error|JSON\.stringify\(workOrder/);
});
