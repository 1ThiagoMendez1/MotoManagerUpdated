import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkshopWhatsAppPlan } from '../src/lib/whatsapp-quota-plan';

test('Full Taller is unlimited even if legacy sub_plan is missing or stale', () => {
  assert.equal(resolveWorkshopWhatsAppPlan({ plan: 'full' }), 'full');
  assert.equal(resolveWorkshopWhatsAppPlan({ plan: 'full', sub_plan: 'basic' }), 'full');
  assert.equal(resolveWorkshopWhatsAppPlan(JSON.stringify({ plan: 'full' })), 'full');
});

test('canonical plan wins for Pro and Basic too', () => {
  assert.equal(resolveWorkshopWhatsAppPlan({ plan: 'pro', sub_plan: 'full' }), 'pro');
  assert.equal(resolveWorkshopWhatsAppPlan({ plan: 'basic', sub_plan: 'full' }), 'basic');
  assert.equal(resolveWorkshopWhatsAppPlan({ plan: 'Pro' }), 'pro');
});

test('legacy organizations preserve their quota until upgraded', () => {
  assert.equal(resolveWorkshopWhatsAppPlan({ sub_plan: 'full' }), 'full');
  assert.equal(resolveWorkshopWhatsAppPlan({ sub_plan: 'pro' }), 'pro');
  assert.equal(resolveWorkshopWhatsAppPlan({ plan: 'monthly' }), 'basic');
  assert.equal(resolveWorkshopWhatsAppPlan({}), 'basic');
  assert.equal(resolveWorkshopWhatsAppPlan(null), 'basic');
  assert.equal(resolveWorkshopWhatsAppPlan('invalid-json'), 'basic');
});

test('arbitrary plan strings never grant unlimited WhatsApp', () => {
  assert.equal(resolveWorkshopWhatsAppPlan({ plan: 'unlimited' }), 'basic');
  assert.equal(resolveWorkshopWhatsAppPlan({ plan: 'fuller' }), 'basic');
  assert.equal(resolveWorkshopWhatsAppPlan({ plan: true }), 'basic');
});
