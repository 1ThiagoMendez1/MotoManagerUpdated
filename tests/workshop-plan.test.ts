import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWorkshopPlan, getWorkshopWhatsAppLimit } from '../src/lib/workshop-plan';

test('la suscripción en settings.plan manda sobre el sub_plan Basic antiguo', () => {
  assert.equal(resolveWorkshopPlan({ plan: 'full', sub_plan: 'basic', whatsapp_count_2026_10: 70 }), 'full');
  assert.equal(getWorkshopWhatsAppLimit({ plan: 'full', sub_plan: 'basic' }), -1);
  assert.equal(getWorkshopWhatsAppLimit(JSON.stringify({ plan: 'full', whatsapp_count_2026_10: 70 })), -1);
});

test('no mantiene Full tras un downgrade cuando sub_plan quedó obsoleto', () => {
  assert.equal(resolveWorkshopPlan({ plan: 'basic', sub_plan: 'full' }), 'basic');
  assert.equal(getWorkshopWhatsAppLimit({ plan: 'basic', sub_plan: 'full' }), 70);
});

test('respeta cuotas Pro y Basic, incluidas altas antiguas', () => {
  assert.equal(getWorkshopWhatsAppLimit({ plan: 'pro' }), 150);
  assert.equal(getWorkshopWhatsAppLimit({ plan: 'basic' }), 70);
  assert.equal(getWorkshopWhatsAppLimit({ sub_plan: 'pro' }), 150);
  assert.equal(getWorkshopWhatsAppLimit({ plan: 'monthly' }), 70);
  assert.equal(getWorkshopWhatsAppLimit({ plan: 'demo', sub_plan: 'full' }), 70);
});

test('falla a Basic si settings son inválidos o están vacíos', () => {
  assert.equal(resolveWorkshopPlan(null), 'basic');
  assert.equal(resolveWorkshopPlan('{invalid'), 'basic');
  assert.equal(resolveWorkshopPlan({ plan: 'plan-inventado' }), 'basic');
  assert.equal(getWorkshopWhatsAppLimit({}), 70);
});
