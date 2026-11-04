import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('prueba gratis is a mobile-first 3-step dialog, without checkbox barriers', async()=>{
  const [form,page]=await Promise.all([
    '../src/app/prueba-gratis/TrialForm.tsx',
    '../src/app/prueba-gratis/page.tsx',
  ].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
  assert.match(form,/useState\(true\)/);
  assert.match(form,/role="dialog" aria-modal="true"/);
  assert.match(form,/Paso \{step \+ 1\} de 3/);
  assert.match(form,/reportValidity\(\)/);
  assert.match(form,/fieldGroups\[step\]/);
  assert.match(form,/type="hidden" name="termsAcknowledged" value="yes"/);
  assert.match(form,/name="welcomeRequested" value=\{withoutWhatsApp \? 'no' : 'yes'\}/);
  assert.match(form,/Al elegir el botón naranja, solicitas/);
  assert.match(form,/Prefiero activar sin WhatsApp/);
  assert.doesNotMatch(form,/type="checkbox"|name="terms"|name="whatsappConsent"/);
  assert.match(page,/<TrialForm \/>/);
});

test('welcome request is verified by server before account creation, never by client-only state', async()=>{
  const [schema,action,sender]=await Promise.all([
    '../src/lib/subscription-trial.ts',
    '../src/app/prueba-gratis/actions.ts',
    '../src/lib/whatsapp-trial.ts',
  ].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
  assert.match(schema,/welcomeRequested: z\.enum\(\['yes', 'no'\]\)/);
  assert.match(schema,/termsAcknowledged: z\.literal\('yes'/);
  assert.match(action,/trial_whatsapp_opt_in/);
  assert.match(action,/acceptedAt/);
  assert.match(action,/if \(optedIn && organizationId\)/);
  assert.match(action,/after\(async \(\) =>/);
  assert.match(sender,/TRIAL_WELCOME_TEMPLATE/);
  assert.match(sender,/method: 'POST'/);
  assert.doesNotMatch(sender,/metadataResponse = await fetcher/);
});
