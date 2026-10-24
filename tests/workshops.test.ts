import { test } from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { isSuperAdmin } from '../src/lib/super-admin';
import { enrollmentSchema, safeWorkshopReturnPath, workshopPath } from '../src/lib/workshops/enrollment';
import { workshopPoster } from '../src/lib/workshops/poster';
import { dashboardSummarySchema, formatDashboardSummary } from '../src/lib/workshops/dashboard';

test('administration trusts app metadata, never a chosen email prefix or user metadata', () => {
  assert.equal(isSuperAdmin(null), false);
  assert.equal(isSuperAdmin({ email: 'admin@attacker.example' }), false);
  assert.equal(isSuperAdmin({ email: 'customer@example.com', user_metadata: { is_super_admin: true } } as any), false);
  assert.equal(isSuperAdmin({ app_metadata: { is_super_admin: true } }), true);
});

test('callback permits only storefront paths and rejects redirect injection', () => {
  for (const input of ['https://evil.example', '//evil.example', '/talleres/a/../admin', '/admin', '/talleres/a?next=//evil', '/talleres/a%0d%0aLocation:evil', null]) {
    assert.equal(safeWorkshopReturnPath(input), '/');
  }
  assert.equal(safeWorkshopReturnPath('/talleres/moto-centro'), '/talleres/moto-centro');
  assert.equal(workshopPath('moto-centro'), '/talleres/moto-centro');
});

test('enrollment validates contact data and explicit consent', () => {
  const valid = { slug: 'moto-centro', firstName: ' Ana ', lastName: ' Pérez ', phone: '+57 (300) 123-4567', consent: 'on' };
  const data = enrollmentSchema.parse(valid);
  assert.equal(data.phone, '+573001234567');
  assert.equal(data.firstName, 'Ana');
  for (const change of [{ consent: '' }, { phone: 'abc' }, { firstName: ' ' }, { slug: '../admin' }, { lastName: 'x'.repeat(101) }]) {
    assert.equal(enrollmentSchema.safeParse({ ...valid, ...change }).success, false);
  }
});

test('downloaded poster survives XML input and its rendered QR decodes to the workshop URL', async () => {
  const target = 'https://motomanager.example/talleres/moto-centro';
  const svg = await QRCode.toString(target, { type: 'svg', width: 512, margin: 4, errorCorrectionLevel: 'Q' });
  const poster = workshopPoster('Moto <Centro> & Hijos "Taller"', target, svg);
  assert.ok(!poster.includes('Moto <Centro>'));
  const { data, info } = await sharp(Buffer.from(poster)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  assert.equal(decoded?.data, target);
});

test('dashboard preserves zeroes, labels Bogotá days and rejects malformed summaries', () => {
  const summary = dashboardSummarySchema.parse({ ingresosMes: 0, motosEnTallerCount: 0, activeWorkOrdersCount: 0, stockCriticoCount: 0,
    revenueData: [{ date: '2026-10-01', ingresos: 0, gastos: 0 }], incomeByMethodData: [{ method: 'cash', amount: 0 }], topPartsData: [] });
  const formatted = formatDashboardSummary(summary);
  assert.equal(formatted.ingresosMes, 0);
  assert.equal(formatted.incomeByMethodData[0].name, 'Efectivo');
  assert.equal(formatted.revenueData[0].name, 'jue');
  assert.equal(formatted.alerts.length, 1);
  assert.equal(dashboardSummarySchema.safeParse({}).success, false);
});

test('existing QR always shows a safe public storefront, including paused registrations', async () => {
  const { publicStorefrontFromRow } = await import('../src/lib/workshops/enrollment');
  const base = {
    id: '00000000-0000-4000-a000-000000000001', name: 'FrankorMotos',
    slug: 'frankormotos', phone: '3001234567', status: 'active',
    settings: { customer_enrollment_enabled: true, address: 'Calle principal',
      internal_token: 'DO_NOT_LEAK' },
  };
  const open = publicStorefrontFromRow(base);
  assert.equal(open?.enrollmentEnabled, true);
  assert.equal(open?.slug, 'frankormotos');
  assert.ok(!JSON.stringify(open).includes('DO_NOT_LEAK'));
  const paused = publicStorefrontFromRow({ ...base,
    settings: { ...base.settings, customer_enrollment_enabled: false } });
  assert.equal(paused?.name, 'FrankorMotos');
  assert.equal(paused?.enrollmentEnabled, false);
  assert.equal(publicStorefrontFromRow({ ...base, settings: null })?.enrollmentEnabled, false);
  assert.equal(publicStorefrontFromRow({ ...base, status: 'trial' })?.enrollmentEnabled, false);
  assert.equal(publicStorefrontFromRow({ ...base, status: 'suspended' }), null);
  assert.equal(publicStorefrontFromRow({ ...base, slug: '../admin' }), null);
  assert.equal(publicStorefrontFromRow(null), null);
});
