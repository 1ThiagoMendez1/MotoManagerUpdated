import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CUSTOMER_PORTAL_OTP_SCOPE, eligibleCustomerLinks } from '../src/lib/customer-portal-access';

const orgA = '11111111-1111-4111-8111-111111111111';
const orgB = '22222222-2222-4222-8222-222222222222';
const customerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

test('only workshop-linked customers can start independent portal login', () => {
  assert.equal(CUSTOMER_PORTAL_OTP_SCOPE,'portal-clientes');
  assert.equal(eligibleCustomerLinks(null, [{id:orgA}]),false);
  assert.equal(eligibleCustomerLinks([], [{id:orgA}]),false);
  assert.equal(eligibleCustomerLinks([{organization_id:orgA,customer_id:customerA}],[]),false);
  assert.equal(eligibleCustomerLinks([{organization_id:orgA,customer_id:customerA}],[{id:orgB}]),false);
  assert.equal(eligibleCustomerLinks([{organization_id:orgA,customer_id:customerA}],[{id:orgA}]),true);
  assert.equal(eligibleCustomerLinks([{organization_id:'',customer_id:customerA}],[{id:''}]),false);
  assert.equal(eligibleCustomerLinks([{organization_id:orgA,customer_id:''}],[{id:orgA}]),false);
});

test('WhatsApp portal OTP cannot provision account or use a plate as a password',async()=>{
  const s=await readFile(new URL('../src/app/clientes/acceso/actions.ts', import.meta.url),'utf8');
  assert.match(s,/find_workshop_qr_phone_account/);
  assert.match(s,/workshop_customer_accounts/);
  assert.match(s,/eligibleCustomerLinks/);
  assert.match(s,/issue_workshop_qr_otp/);
  assert.match(s,/consume_workshop_qr_otp/);
  assert.match(s,/sendQrCodeViaMeta/);
  assert.match(s,/phoneAccountEmail/);
  assert.match(s,/signInWithPassword/);
  assert.match(s,/return accessSent/);
  assert.doesNotMatch(s,/auth\.admin\.createUser\(/);
  assert.doesNotMatch(s,/join_workshop_as_customer/);
  assert.doesNotMatch(s,/license_plate|normalizePlate/);
});

test('portal and QR routes expose the reusable entry, never a plate-only login',async()=>{
  const [page,actions,nav,qr]=await Promise.all([
    '../src/app/clientes/page.tsx',
    '../src/app/clientes/actions.ts',
    '../src/app/planes/components/LandingNavbar.tsx',
    '../src/app/talleres/[slug]/page.tsx',
  ].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
  assert.match(page,/if \(!overview\.verified\) return <CustomerPortalAccess/);
  assert.match(page,/if \(!overview\.workshops\.length\) return <NoWorkshopAccess/);
  assert.match(page,/\?moto=/);
  assert.match(actions,/link\.customer_id === m\.customer_id && link\.organization_id === m\.organization_id/);
  assert.match(actions,/m\.id === motorcycleId/);
  assert.match(nav,/href="\/clientes"/);
  assert.match(qr,/¿Ya te registraste\? Entra a Mi garaje/);
});
