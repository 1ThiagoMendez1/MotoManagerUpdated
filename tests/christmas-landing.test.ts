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

test('Christmas landing keeps verified trial and plan routes, real demo and campaign heatmap cohort',async()=>{
  const [page,feature,offer,nav,seasonal]=await Promise.all([
    '../src/app/planes/PlanesPage.tsx','../src/app/planes/components/ChristmasCampaign.tsx',
    '../src/app/planes/components/LandingPricing.tsx','../src/app/planes/components/LandingNavbar.tsx',
    '../src/lib/seasonal-campaign.ts',
  ].map(p=>readFile(new URL(p,import.meta.url),'utf8')));
  assert.match(page,/data-campaign=\{halloween \? 'halloween-2026' : christmasEdition \? 'navidad-2026'/);
  assert.match(page,/<ChristmasHero \/>/);
  assert.match(page,/<LandingInteractiveDemo \/>/);
  assert.match(page,/<ChristmasMobileDock/);
  assert.match(feature,/href="\/prueba-gratis"/);
  assert.match(feature,/href="#demo"/);
  assert.match(feature,/15 días/);
  assert.match(feature,/Sin tarjeta/);
  assert.match(nav,/nav_trial/);
  assert.match(offer,/const featured = christmas \? isFull : isPro/);
  assert.doesNotMatch(feature,/fake countdown|últimas unidades|hoy vence|porcentaje de descuento/i);
  assert.match(seasonal,/visual merchandising only/);
});


test('Christmas artwork, Santa hat and mobile performance constraints are integrated',async()=>{
  const [campaign,navbar,footer,css,root]=await Promise.all([
    '../src/app/planes/components/ChristmasCampaign.tsx',
    '../src/app/planes/components/LandingNavbar.tsx',
    '../src/app/planes/components/LandingFooter.tsx',
    '../src/app/planes/components/christmas.module.css',
    '../src/app/planes/PlanesPage.tsx',
  ].map(file=>readFile(new URL(file,import.meta.url),'utf8')));
  assert.match(campaign,/navidad-santa-motero-2026\.svg/);
  assert.match(navbar,/navidad-gorro-logo\.svg/);
  assert.match(footer,/navidad-gorro-logo\.svg/);
  assert.match(root,/christmas=\{christmasEdition\}/);
  assert.match(css,/@media \(max-width: 639px\)/);
  assert.match(css,/\.edition \.productCard, \.edition \.starlight, \.edition \.giftAccent \{ display: none; \}/);
  assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css,/animation: none !important/);
  assert.match(campaign,/data-analytics-id="hero_trial"/);
  assert.match(campaign,/href="#demo"/);
});
