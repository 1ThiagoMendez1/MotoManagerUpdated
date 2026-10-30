import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrialState, trialRegistrationSchema, subscriptionPrice } from '../src/lib/subscription-trial';
import { resolveWorkshopPlan } from '../src/lib/workshop-plan';

test('la prueba es Full y vence exactamente al alcanzar su fecha, sin afectar planes existentes', () => {
  const now = Date.parse('2026-10-30T12:00:00Z');
  const settings = { plan: 'full', isTrial: true, trialEndDate: '2026-11-14T12:00:00Z' };
  assert.equal(resolveWorkshopPlan(settings), 'full');
  assert.equal(getTrialState(settings, now).daysRemaining, 15);
  assert.equal(getTrialState(settings, now + 15 * 86_400_000).expired, true);
  assert.equal(getTrialState({ isTrial: true }, now).expired, true);
  assert.equal(getTrialState({ plan: 'full' }, now).isTrial, false);
  assert.equal(getTrialState({ ...settings, isTrial: false }, now + 20 * 86_400_000).expired, false);
});

test('el registro exige consentimiento y contraseña segura, y normaliza correo y celular', () => {
  const input = { fullName: 'Ana Pérez', workshopName: 'Taller Ana', email: ' ANA@EXAMPLE.TEST ', phone: '300 123 4567', city: 'Bogotá', password: 'Segura2026!Trial', terms: 'on', website: '' };
  const parsed = trialRegistrationSchema.parse(input);
  assert.equal(parsed.email, 'ana@example.test');
  assert.equal(parsed.phone, '573001234567');
  assert.equal(trialRegistrationSchema.safeParse({ ...input, terms: '' }).success, false);
  assert.equal(trialRegistrationSchema.safeParse({ ...input, password: '123' }).success, false);
  assert.equal(trialRegistrationSchema.safeParse({ ...input, website: 'spam' }).success, false);
});

test('el precio de conversión respeta mensual, semestral y anual', () => {
  assert.equal(subscriptionPrice(119900, 'monthly'), 119900);
  assert.equal(subscriptionPrice(119900, 'biannual'), 647460);
  assert.equal(subscriptionPrice(119900, 'yearly'), 1151040);
});
