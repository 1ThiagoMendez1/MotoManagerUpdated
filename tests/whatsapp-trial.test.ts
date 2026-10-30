import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrialWelcomeTemplate, formatTrialWelcomeDate, sendTrialWelcomeViaMeta,
  TRIAL_WELCOME_TEMPLATE, TRIAL_WELCOME_TEMPLATE_ID, TRIAL_WELCOME_LANGUAGE,
} from '../src/lib/whatsapp-trial';
import { trialRegistrationSchema } from '../src/lib/subscription-trial';

const now = Date.parse('2026-10-31T04:00:00Z');
const input = {
  phone: '573001234567', fullName: 'Juan\nPérez', workshopName: 'Moto\tRayo',
  email: 'juan@example.test', startsAt: '2026-10-31T03:30:00Z', endsAt: '2026-11-15T03:30:00Z',
  optedIn: true, password: 'never-send-this-password',
};
const config = { token: 'fake-test-token', phoneId: '123456789' };
function template(withEmail = false) {
  return {
    id: TRIAL_WELCOME_TEMPLATE_ID, name: TRIAL_WELCOME_TEMPLATE, language: TRIAL_WELCOME_LANGUAGE,
    status: 'APPROVED', components: [
      { type: 'HEADER', format: 'TEXT', text: 'Tu taller acaba de subir de nivel' },
      { type: 'BODY', text: `¡Hola, {{1}}! Bienvenido a MotoManager.\n{{2}} ya está listo para dar el siguiente paso.\nCorreo: ${withEmail ? '{{3}}' : 'Con el que te registraste.'}\nInicio: {{${withEmail ? 4 : 3}}}\nDisfruta tu prueba hasta: {{${withEmail ? 5 : 4}}}` },
      { type: 'FOOTER', text: 'MotoManager · CRM' },
      { type: 'BUTTONS', buttons: [{ type: 'URL', url: 'https://www.motomanager.com.co/login' }] },
    ],
  };
}
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});

test('la plantilla con correo fijo lleva cuatro variables y ninguna de encabezado/botón', () => {
  const result = buildTrialWelcomeTemplate(template(), input);
  assert.equal(result.name, TRIAL_WELCOME_TEMPLATE);
  assert.equal(result.language.code, 'es_CO');
  assert.equal(result.components.length, 1);
  assert.deepEqual(result.components[0].parameters.map(parameter => parameter.text), [
    'Juan Pérez', 'Moto Rayo', formatTrialWelcomeDate(input.startsAt), formatTrialWelcomeDate(input.endsAt),
  ]);
  assert.doesNotMatch(JSON.stringify(result), /never-send-this-password|juan@example/);
  assert.match(formatTrialWelcomeDate(input.startsAt), /30\/10\/2026/);
  assert.match(formatTrialWelcomeDate(input.endsAt), /14\/11\/2026/);
  assert.match(formatTrialWelcomeDate(input.startsAt), /10:30/);
});

test('la variante con cinco variables coloca el correo antes de inicio y vencimiento', () => {
  const result = buildTrialWelcomeTemplate(template(true), input);
  assert.deepEqual(result.components[0].parameters.map(parameter => parameter.text), [
    'Juan Pérez', 'Moto Rayo', 'juan@example.test',
    formatTrialWelcomeDate(input.startsAt), formatTrialWelcomeDate(input.endsAt),
  ]);
});

test('rechaza cambios de identidad, idioma, orden o componentes que no conoce', () => {
  for (const patch of [{ id: 'other' }, { name: 'other' }, { language: 'es' }, { status: 'PENDING' }]) {
    assert.throws(() => buildTrialWelcomeTemplate({ ...template(), ...patch }, input));
  }
  const wrongOrder = template();
  wrongOrder.components[1].text = '¡Hola, {{1}}! {{2}} Inicio: {{4}}\nHasta: {{3}}';
  assert.throws(() => buildTrialWelcomeTemplate(wrongOrder, input));
  const dynamicHeader = template();
  dynamicHeader.components[0].text = 'Hola {{1}}';
  assert.throws(() => buildTrialWelcomeTemplate(dynamicHeader, input));
  const dynamicButton = template();
  dynamicButton.components[3].buttons![0].url = 'https://www.motomanager.com.co/{{1}}';
  assert.throws(() => buildTrialWelcomeTemplate(dynamicButton, input));
});

test('no contacta Meta si falta la solicitud de WhatsApp, configuración o una prueba vigente', async () => {
  const noNetwork = (async () => { throw new Error('Network must not be used'); }) as typeof fetch;
  assert.deepEqual(await sendTrialWelcomeViaMeta({ ...input, optedIn: false }, config, noNetwork, now), { status: 'skipped', reason: 'not_opted_in' });
  assert.deepEqual(await sendTrialWelcomeViaMeta(input, {}, noNetwork, now), { status: 'skipped', reason: 'not_configured' });
  assert.deepEqual(await sendTrialWelcomeViaMeta({ ...input, endsAt: new Date(now).toISOString() }, config, noNetwork, now), { status: 'skipped', reason: 'invalid_input' });
  assert.equal((await sendTrialWelcomeViaMeta({ ...input, phone: 'bad' }, config, noNetwork, now)).status, 'skipped');
});

test('en revisión, rechazada o pausada nunca se intenta enviar la bienvenida', async () => {
  for (const status of ['PENDING', 'REJECTED', 'PAUSED', 'DISABLED']) {
    let calls = 0;
    const mock = (async (_url, init) => {
      calls++;
      assert.notEqual(init?.method, 'POST');
      return response({ ...template(), status });
    }) as typeof fetch;
    assert.deepEqual(await sendTrialWelcomeViaMeta(input, config, mock, now), { status: 'skipped', reason: 'template_not_approved' });
    assert.equal(calls, 1);
  }
});

test('una plantilla aprobada se envía una sola vez con las variables verificadas', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const mock = (async (url, init) => {
    calls.push({ url: String(url), init });
    return calls.length === 1 ? response(template()) : response({ messages: [{ id: 'wamid.test-only' }] });
  }) as typeof fetch;
  assert.deepEqual(await sendTrialWelcomeViaMeta(input, config, mock, now), { status: 'accepted', messageId: 'wamid.test-only' });
  assert.equal(calls.length, 2);
  assert.ok(calls[0].url.includes(TRIAL_WELCOME_TEMPLATE_ID));
  assert.equal(calls[1].url, 'https://graph.facebook.com/v23.0/123456789/messages');
  assert.equal(calls[1].init?.method, 'POST');
  assert.equal(calls[1].init?.cache, 'no-store');
  const payload = JSON.parse(String(calls[1].init?.body));
  assert.equal(payload.to, input.phone);
  assert.equal(payload.template.components[0].parameters.length, 4);
  assert.doesNotMatch(String(calls[1].init?.body), /password|fake-test-token/);
});

test('no adivina variables ni intenta enviar una plantilla incompatible', async () => {
  let calls = 0;
  const mock = (async () => { calls++; return response({ ...template(), components: [] }); }) as typeof fetch;
  assert.deepEqual(await sendTrialWelcomeViaMeta(input, config, mock, now), { status: 'skipped', reason: 'unsupported_template' });
  assert.equal(calls, 1);
});

test('un rechazo o timeout tras POST no provoca reintentos ni filtra respuestas de Meta', async () => {
  for (const timeout of [false, true]) {
    let calls = 0;
    const mock = (async () => {
      calls++;
      if (calls === 1) return response(template());
      if (timeout) throw new Error('Simulated connection loss after acceptance');
      return response({ error: { code: 132000, message: 'sensitive fake-test-token never-send-this-password' } }, 400);
    }) as typeof fetch;
    const result = await sendTrialWelcomeViaMeta(input, config, mock, now);
    assert.equal(result.status, 'unconfirmed');
    assert.equal(calls, 2);
    assert.doesNotMatch(JSON.stringify(result), /fake-test-token|password|sensitive/);
  }
});

test('la solicitud de bienvenida es opcional y requiere marcar la casilla explícitamente', () => {
  const form = { fullName: 'Ana Pérez', workshopName: 'Taller Ana', email: 'ana@example.test',
    phone: '3001234567', city: 'Bogotá', password: 'a-safe-test-password', terms: 'on' };
  assert.equal(trialRegistrationSchema.parse(form).whatsappConsent, undefined);
  assert.equal(trialRegistrationSchema.parse({ ...form, whatsappConsent: 'on' }).whatsappConsent, 'on');
  assert.equal(trialRegistrationSchema.safeParse({ ...form, whatsappConsent: 'false' }).success, false);
});
