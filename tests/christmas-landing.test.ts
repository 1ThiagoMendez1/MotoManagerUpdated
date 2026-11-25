import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isChristmasEditionActive, isHalloweenEditionActive } from '../src/lib/seasonal-campaign';

test('Christmas edition starts after Halloween and ends after Epiphany in Colombia',()=>{
  assert.equal(isChristmasEditionActive(Date.parse('2026-11-02T23:59:59-05:00')),false);
  assert.equal(isChristmasEditionActive(Date.parse('2026-11-03T00:00:00-05:00')),true);
  assert.equal(isChristmasEditionActive(Date.parse('2026-12-24T18:00:00-05:00')),true);
  assert.equal(isChristmasEditionActive(Date.parse('2027-01-07T00:00:00-05:00')),false);
  assert.equal(isHalloweenEditionActive(Date.parse('2026-11-03T12:00:00-05:00')),false);
});

test('Christmas reference keeps real demo, checkout and access routes with its own analytics cohort',async()=>{
  const [page,landing,offer,css]=await Promise.all([
    '../src/app/planes/PlanesPage.tsx','../src/app/planes/components/ChristmasLanding.tsx',
    '../src/app/planes/components/LandingPricing.tsx','../src/app/planes/components/christmas-reference.module.css',
  ].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
  assert.match(page,/navidad-2026-v3/);
  assert.match(page,/<ChristmasLanding/);
  assert.match(page,/<PaymentModal/);
  assert.match(landing,/<LandingDemoSection christmas/);
  assert.match(landing,/onSelectPlan=\{onSelectPlan\}/);
  assert.match(landing,/30 días/);
  assert.match(landing,/href="\/clientes"/);
  assert.match(landing,/Sin cobros automáticos/);
  assert.match(offer,/const featured = christmas \? isFull : isPro/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(landing,/últimas unidades|hoy vence|Math\.random/);
});
