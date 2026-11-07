import test from 'node:test';
import assert from 'node:assert/strict';
import { pauseTrialSchema, verifyTrialSchema, TRIAL_REVIEW_MESSAGE, isTrialReviewRequestAllowed } from '../src/lib/trial-review';
import { getTrialState } from '../src/lib/subscription-trial';
import { getWorkshopWhatsAppLimit } from '../src/lib/workshop-plan';

const workshopId = 'aa000000-0000-4000-8000-000000000001';
const verification = { workshopName: 'Taller de prueba', city: 'Bogotá', address: 'Calle 100 # 20-30', responsibleName: 'Persona de prueba', phone: '300 123 4567', evidence: 'Videollamada y ubicación del taller comprobadas.', contacted: true, locationChecked: true, evidenceChecked: true };

test('pause and verification require a reason, real workshop data and completed checks', () => {
  assert.equal(pauseTrialSchema.safeParse({ workshopId, reason: 'Datos pendientes', message: TRIAL_REVIEW_MESSAGE }).success, true);
  assert.equal(pauseTrialSchema.safeParse({ workshopId, reason: '', message: TRIAL_REVIEW_MESSAGE }).success, false);
  assert.equal(pauseTrialSchema.safeParse({ workshopId, reason: 'Datos pendientes', message: 'Bloqueado' }).success, false);
  const result = verifyTrialSchema.parse({ workshopId, reason: 'Verificado en llamada', verification });
  assert.equal(result.verification.phone, '573001234567');
  for (const field of ['contacted','locationChecked','evidenceChecked']) assert.equal(verifyTrialSchema.safeParse({ workshopId, reason: 'Verificado en llamada', verification: { ...verification, [field]: false } }).success, false);
  for (const field of ['workshopName','city','address','responsibleName','phone','evidence']) assert.equal(verifyTrialSchema.safeParse({ workshopId, reason: 'Verificado en llamada', verification: { ...verification, [field]: '' } }).success, false);
});

test('a paused trial cannot send reminders, even if a payment arrives during review', () => {
  const settings = { isTrial: true, trialReviewPaused: true, plan: 'full', trialEndDate: '2000-01-01T00:00:00Z' };
  assert.equal(getTrialState(settings).paused, true);
  assert.equal(getTrialState(settings).expired, false);
  assert.equal(getTrialState(settings).daysRemaining, 0);
  assert.equal(getWorkshopWhatsAppLimit(settings), 0);
  assert.equal(getWorkshopWhatsAppLimit({ ...settings, isTrial: false }), 0);
  assert.equal(getWorkshopWhatsAppLimit({ plan: 'full' }), -1);
});

test('the review page permits status and logout but cannot tunnel Server Actions or mutations', () => {
  assert.equal(isTrialReviewRequestAllowed('/revision-prueba', 'GET'), true);
  assert.equal(isTrialReviewRequestAllowed('/api/trial-review/status', 'GET'), true);
  assert.equal(isTrialReviewRequestAllowed('/auth/signout', 'POST'), true);
  for (const path of ['/dashboard','/customers','/api/work-orders/id/items']) assert.equal(isTrialReviewRequestAllowed(path, 'GET'), false);
  for (const path of ['/revision-prueba','/api/trial-review/status']) assert.equal(isTrialReviewRequestAllowed(path, 'POST'), false);
  assert.equal(isTrialReviewRequestAllowed('/revision-prueba', 'GET', true), false);
  assert.equal(isTrialReviewRequestAllowed('/auth/signout', 'POST', true), false);
});
