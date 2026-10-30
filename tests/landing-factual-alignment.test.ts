import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPlanLimits } from '../src/lib/constants/plans';

const read = (path: string) => readFileSync(path, 'utf8');

test('la landing no muestra escasez o compras ficticias', () => {
  const page = read('src/app/planes/PlanesPage.tsx');
  assert.doesNotMatch(page, /<UrgencyBar\b|<SalesNotification\b|<DashboardPreview\b/);
  assert.match(page, /<LandingFeatures\b/);
  assert.match(page, /<LandingPricing\b/);
  assert.match(page, /<LandingInteractiveDemo\b/);
});

test('el hero y el footer no anuncian valoraciones, estadísticas o teléfonos inventados', () => {
  const s = read('src/app/planes/components/LandingHero.tsx') +
    read('src/app/planes/components/HalloweenCampaign.tsx') +
    read('src/app/planes/components/LandingFeatures.tsx') +
    read('src/app/planes/components/LandingFooter.tsx');
  assert.doesNotMatch(s, /\+500|\+50K|\+200K|4\.9★|573001234567|CRM #1|50% OFF|OFERTA POR TIEMPO LIMITADO/);
  assert.match(s, /Vista ilustrativa/);
});

test('las preguntas ya no dependen de testimonios inventados', () => {
  const faq = read('src/app/planes/components/LandingTestimonialsAndFAQ.tsx');
  assert.doesNotMatch(faq, /TESTIMONIALS|Moto Service Express|Más de 500 talleres/);
  assert.match(faq, /getPlanLimits/);
});

test('el precio comercial usa DB y el checkout conserva el total calculado', () => {
  const page = read('src/app/page.tsx');
  const pricing = read('src/app/planes/components/LandingPricing.tsx');
  assert.match(page, /subscription_plans/);
  assert.match(page, /createAdminClient/);
  assert.match(pricing, /Number\(plan\.price\)/);
  assert.match(pricing, /amountInCents: total \* 100/);
  assert.match(pricing, /getPlanLimits\(plan\.id\)/);
});

test('los límites mostrados son los utilizados por la aplicación', () => {
  assert.equal(getPlanLimits('basic').whatsapp_limit, 70);
  assert.equal(getPlanLimits('pro').whatsapp_limit, 150);
  assert.equal(getPlanLimits('full').whatsapp_limit, -1);
  assert.equal(getPlanLimits('pro').users_limit, 3);
  assert.equal(getPlanLimits('basic').has_inventory, true);
});
