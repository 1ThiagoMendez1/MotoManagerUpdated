import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const demo = read('src/app/planes/components/LandingInteractiveDemo.tsx');
const extras = read('src/app/planes/components/LandingDemoExtras.tsx');
const page = read('src/app/planes/PlanesPage.tsx');
const directory = read('src/app/planes/components/LandingTopWorkshops.tsx');
const action = read('src/actions/public-workshops.ts');

test('la demo incluye las doce áreas principales y los módulos adicionales del brochure', () => {
  for (const screen of [
    'dashboard', 'ordenes', 'clientes', 'motos', 'inventario', 'servicios',
    'ventas', 'citas', 'contabilidad', 'tecnicos', 'permisos', 'soporte', 'portal', 'whatsapp',
  ]) {
    assert.match(demo, new RegExp("id: '" + screen + "'"), 'Falta navegación de ' + screen);
  }
  assert.match(demo, /<LandingDemoExtras/);
  assert.match(demo, /setBikeFilter/);
  assert.match(demo, /Con orden activa/);
  assert.match(demo, /Sin orden/);
  assert.match(demo, /Finalizadas/);
  assert.match(demo, /Cotización de orden/);
});

test('las áreas adicionales contienen interacción real de navegador y datos ficticios', () => {
  for (const element of [
    'Directorio de Clientes', 'Catálogo de Servicios', 'Citas y Agenda',
    'Contabilidad y Finanzas', 'Técnicos y Asignaciones',
    'Usuarios y Permisos', 'Centro de Soporte', 'Portal del Cliente',
    'Avisos por WhatsApp',
  ]) assert.ok(extras.includes(element), element);
  assert.match(extras, /onAssignTechnician/);
  assert.match(extras, /setSelectedServices/);
  assert.match(extras, /setAppointments/);
  assert.match(extras, /setRolePermissions/);
  assert.match(extras, /setTickets/);
  assert.doesNotMatch(extras, /\bfetch\s*\(|\bsupabase\b|localStorage|sessionStorage|\baxios\b|window\.open/);
  assert.match(extras, /Ningún mensaje se envió/);
  assert.match(extras, /type="number" min="1" max="100000000" step="1"/);
});

test('el directorio se incluye y se entrega desde el servidor con talleres existentes', () => {
  const homepage = read('src/app/page.tsx');
  assert.match(homepage, /getPublicWorkshops\(''\)/);
  assert.match(homepage, /workshops=\{workshops\}/);
  assert.match(page, /<LandingTopWorkshops initialWorkshops=\{workshops\}/);
  assert.match(directory, /initialWorkshops/);
  assert.match(directory, /w\.name/);
  assert.match(directory, /w\.city/);
  assert.match(directory, /w\.review_count/);
  assert.match(directory, /directory-search/);
  assert.match(directory, /Ver todos/);
  assert.doesNotMatch(directory, /\+500 talleres|4\.9★|Math\.random\(/);
});

test('el directorio público no recurre a teléfonos de perfiles privados ni geolocalizaciones inventadas', () => {
  assert.doesNotMatch(action, /ownerMember|ownerPhone|profiles \( phone \)/);
  assert.match(action, /org\.phone \|\| org\.settings\?\.phone/);
  assert.match(action, /query\.ilike\('name'/);
  assert.doesNotMatch(directory, /charSum|baseLat|pseudo-random|geolocation/);
});
