import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { matchesSubscriptionCheckout, validWompiEvent, wompiIntegrity, type WompiTransaction } from '../src/lib/payments/wompi-protocol';

const transaction: WompiTransaction = { id: '1234-1610641025-49201', reference: 'MM-SUB-'+'a'.repeat(32), currency: 'COP', amount_in_cents: 11990000, customer_email: 'owner@example.test', status: 'APPROVED' };

test('checkout integrity uses the Wompi documented field order', () => {
  assert.equal(wompiIntegrity('sk8-438k4-xmxm392-sn2m',2490000,'prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6'), '37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5');
});

test('events validate variable signed properties, uppercase checksum and reject malformed/tampered data', () => {
  const secret = 'test_events_fixture';
  const properties = ['transaction.amount_in_cents','transaction.status','transaction.id'];
  const timestamp = 1530291411;
  const checksum = createHash('sha256').update(`${transaction.amount_in_cents}${transaction.status}${transaction.id}${timestamp}${secret}`).digest('hex');
  const payload = { data: { transaction }, timestamp, signature: { properties, checksum: checksum.toUpperCase() } };
  assert.equal(validWompiEvent(payload,secret),true);
  assert.equal(validWompiEvent(payload,secret,checksum),true);
  assert.equal(validWompiEvent({ ...payload, data: { transaction: { ...transaction, status: 'DECLINED' } } },secret),false);
  assert.equal(validWompiEvent(payload,''),false);
  assert.equal(validWompiEvent({ ...payload, signature: { ...payload.signature, checksum: 'short' } },secret),false);
  assert.equal(validWompiEvent({ ...payload, signature: { ...payload.signature, properties: ['transaction.missing'] } },secret),false);
});

test('a transaction must match the immutable workshop quote exactly', () => {
  const quote = { reference: transaction.reference, amount_in_cents: 11990000, customer_email: 'OWNER@example.test' };
  assert.equal(matchesSubscriptionCheckout(transaction,quote),true);
  for (const change of [{reference:'another-workshop'}, {amount_in_cents:100}, {currency:'USD'}, {customer_email:'other@example.test'}]) {
    assert.equal(matchesSubscriptionCheckout({...transaction,...change},quote),false);
  }
});
