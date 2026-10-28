import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path: string) => readFileSync(path, 'utf8');
const demo = source('src/app/planes/components/LandingInteractiveDemo.tsx');

test('La landing ofrece la demo en primer plano y navegación directa', () => {
  const page = source('src/app/planes/PlanesPage.tsx');
  const hero = source('src/app/planes/components/LandingHero.tsx');
  const nav = source('src/app/planes/components/LandingNavbar.tsx');
  assert.match(page, /<LandingInteractiveDemo\s*\/>/);
  assert.match(page, /<LandingWhyChange\s*\/>/);
  assert.ok(page.indexOf('<LandingInteractiveDemo />') < page.indexOf('<LandingFeatures />'));
  assert.match(hero, /href="#demo"/);
  assert.match(nav, /href: '#demo'/);
});

test('La demo permite recorrer los módulos del producto sin inicio de sesión', () => {
  for (const tab of ["'inicio'", "'dashboard'", "'ordenes'", "'motos'", "'inventario'", "'ventas'"]) {
    assert.ok(demo.includes(tab), 'Falta módulo ' + tab);
  }
  assert.match(demo, /setDark\(v => !v\)/);
  assert.match(demo, /onClick=\{reset\}/);
  assert.match(demo, /setOrderModal\(true\)/);
  assert.match(demo, /setOrders\(current =>/);
  assert.match(demo, /setStock\(items =>/);
  assert.match(demo, /setExtraSales\(count => count \+ 1\)/);
});

test('No hay operaciones de servidor, datos reales ni compra dentro de la demo', () => {
  assert.doesNotMatch(demo, /\bfetch\s*\(|\bsupabase\b|localStorage|sessionStorage|\baxios\b|window\.open|registerWorkshopPublic|onSelectPlan/);
  assert.match(demo, /Datos 100% ficticios/);
  assert.match(demo, /No se registran pagos ni se envía información/);
  assert.match(demo, /Los cambios nunca se guardan|nunca se guardan|no se guardan|solo en tu navegador/i);
  assert.match(demo, /role="dialog"/);
  assert.match(demo, /aria-live="polite"/);
});

test('La demo evita crear órdenes duplicadas sobre motos aún abiertas', () => {
  assert.match(demo, /busyPlates\.has\(plate\)/);
  assert.match(demo, /disabled=\{busyPlates\.has\(bike\.plate\)\}/);
  assert.match(demo, /busyPlates\.has\(plate\)\}/);
  assert.match(demo, /status !== 'delivered'/);
});

test('La publicidad no publica datos de las capturas de talleres reales', () => {
  const hero = source('src/app/planes/components/LandingHero.tsx');
  const concat = demo + hero;
  assert.doesNotMatch(concat, /FrankorMotos|frankormotos|Doña|Macro Speed Motors/);
  assert.match(hero, /Inspirado en la interfaz real del producto/);
  assert.match(hero, /Vista ilustrativa/);
});
