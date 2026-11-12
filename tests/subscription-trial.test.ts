import test from 'node:test';
import assert from 'node:assert/strict';
import { getTrialState, trialRegistrationSchema, subscriptionPrice, trialWhatsAppPermissions } from '../src/lib/subscription-trial';
import { resolveWorkshopPlan, getWorkshopWhatsAppLimit } from '../src/lib/workshop-plan';

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

test('el registro por pasos requiere acción afirmativa, no casillas, y normaliza datos', () => {
  const input = {
    fullName: 'Ana Pérez', workshopName: 'Taller Ana', email: ' ANA@EXAMPLE.TEST ',
    phone: '300 123 4567', city: 'Bogotá', password: 'Segura2026!Trial',
    termsAcknowledged: 'yes', welcomeRequested: 'yes', website: '',
  };
  const parsed = trialRegistrationSchema.parse(input);
  assert.equal(parsed.email,'ana@example.test');
  assert.equal(parsed.phone,'573001234567');
  assert.equal(parsed.welcomeRequested,'yes');
  assert.equal(parsed.marketingRequested,'no');
  assert.equal(trialRegistrationSchema.safeParse({...input,welcomeRequested:'no'}).success,true);
  assert.equal(trialRegistrationSchema.safeParse({...input,termsAcknowledged:''}).success,false);
  assert.equal(trialRegistrationSchema.safeParse({...input,password:'123'}).success,false);
  assert.equal(trialRegistrationSchema.safeParse({...input,website:'spam'}).success,false);
});

test('welcome and promotional permission remain independent; a trial never requires marketing', () => {
  const at='2026-11-12T21:00:00.000Z';
  const no=trialWhatsAppPermissions({welcomeRequested:'yes',marketingRequested:'no'},at);
  assert.ok(no.trial_whatsapp_opt_in);
  assert.equal(no.trial_whatsapp_marketing_consent.granted,false);
  const yes=trialWhatsAppPermissions({welcomeRequested:'yes',marketingRequested:'yes'},at);
  assert.equal(yes.trial_whatsapp_marketing_consent.granted,true);
  assert.equal(yes.trial_whatsapp_marketing_consent.at,at);
  assert.equal(yes.trial_whatsapp_marketing_consent.source,'/prueba-gratis');
  const marketingOnly=trialWhatsAppPermissions({welcomeRequested:'no',marketingRequested:'yes'},at);
  assert.equal(marketingOnly.trial_whatsapp_opt_in,undefined);
  assert.equal(marketingOnly.trial_whatsapp_marketing_consent.granted,true);
});

test('el precio de conversión respeta mensual, semestral y anual', () => {
  assert.equal(subscriptionPrice(119900, 'monthly'), 119900);
  assert.equal(subscriptionPrice(119900, 'biannual'), 647460);
  assert.equal(subscriptionPrice(119900, 'yearly'), 1151040);
});

test('los recordatorios tampoco pueden enviar WhatsApp después de la prueba', () => {
  assert.equal(getWorkshopWhatsAppLimit({ plan: 'full', isTrial: true, trialEndDate: '2000-01-01T00:00:00Z' }), 0);
  assert.equal(getWorkshopWhatsAppLimit({ plan: 'full', isTrial: true, trialEndDate: '2100-01-01T00:00:00Z' }), -1);
  assert.equal(getWorkshopWhatsAppLimit({ plan: 'full' }), -1);
});
