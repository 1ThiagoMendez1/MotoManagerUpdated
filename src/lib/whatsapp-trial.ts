/** Exact template identity from WhatsApp Manager. Credentials are supplied only by the server. */
export const TRIAL_WELCOME_TEMPLATE = 'bienvenida_prueba_gratis_15_dias';
export const TRIAL_WELCOME_TEMPLATE_ID = '152539709393366';
export const TRIAL_WELCOME_LANGUAGE = 'es_CO';

export type TrialWelcomeInput = {
  phone: string;
  fullName: string;
  workshopName: string;
  email: string;
  startsAt: string;
  endsAt: string;
  optedIn: boolean;
};

type TemplateComponent = { type: string; format?: string; text?: string; buttons?: { type: string; url?: string }[] };
type Template = { id: string; name: string; language: string; status: string; components: TemplateComponent[] };
type FailureReason = 'not_opted_in' | 'not_configured' | 'invalid_input' | 'template_not_approved' |
  'unsupported_template' | 'provider_rejected' | 'transport_error' | 'invalid_provider_response';
export type TrialWelcomeResult = { status: 'accepted'; messageId: string } |
  { status: 'skipped' | 'unconfirmed'; reason: FailureReason; httpStatus?: number; metaCode?: number };

function parameter(value: string, limit = 150) {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function formatTrialWelcomeDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid trial date');
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(date).replace(/\s+/g, ' ');
}

/** Supports the screenshot's fixed email (4 body parameters) and the original
 * draft's email variable (5). No header/button variables are guessed or retried. */
export function buildTrialWelcomeTemplate(metadata: unknown, input: TrialWelcomeInput) {
  const template = metadata as Template | null;
  if (!template || template.id !== TRIAL_WELCOME_TEMPLATE_ID ||
    template.name !== TRIAL_WELCOME_TEMPLATE || template.language !== TRIAL_WELCOME_LANGUAGE ||
    template.status !== 'APPROVED' || !Array.isArray(template.components)) throw new Error('Unsupported trial template');
  const body = template.components.filter(component => component?.type === 'BODY');
  if (body.length !== 1 || typeof body[0].text !== 'string') throw new Error('Unsupported trial body');
  const text = body[0].text;
  const variables = [...text.matchAll(/\{\{([1-9][0-9]*)\}\}/g)].map(match => Number(match[1]));
  const unique = [...new Set(variables)].sort((a, b) => a - b);
  const count = unique.length;
  if (![4, 5].includes(count) || unique.some((value, index) => value !== index + 1) ||
    /\{\{|\}\}/.test(text.replace(/\{\{[1-9][0-9]*\}\}/g, ''))) throw new Error('Unsupported trial variables');
  const start = count === 4 ? 3 : 4;
  const end = start + 1;
  if (!/(?:hola|bienvenid[oa])[^{}\n]{0,30}\{\{1\}\}/iu.test(text) ||
    !new RegExp('inicio[^{}\\n]{0,40}:\\s*\\{\\{' + start + '\\}\\}', 'iu').test(text) ||
    !new RegExp('(?:hasta|finaliza|vencimiento)[^{}\\n]{0,20}:\\s*\\{\\{' + end + '\\}\\}', 'iu').test(text) ||
    (count === 5 && !/correo[^{}\n]{0,30}:\s*\{\{3\}\}/iu.test(text))) throw new Error('Unsupported trial variable order');
  for (const component of template.components) {
    if (component.type === 'BODY') continue;
    if (component.type === 'HEADER' && component.format !== 'TEXT') throw new Error('Unsupported trial header');
    if (component.type === 'HEADER' || component.type === 'FOOTER') {
      if (typeof component.text !== 'string' || /\{\{|\}\}/.test(component.text)) throw new Error('Dynamic trial header/footer not supported');
    } else if (component.type === 'BUTTONS') {
      if (!Array.isArray(component.buttons) || component.buttons.length !== 1 || component.buttons[0].type !== 'URL' ||
        !['https://www.motomanager.com.co/login', 'https://motomanager.com.co/login'].includes(component.buttons[0].url || '')) throw new Error('Unsupported trial button');
    } else throw new Error('Unsupported trial component');
  }
  const values = [parameter(input.fullName), parameter(input.workshopName)];
  if (count === 5) values.push(parameter(input.email, 254));
  values.push(formatTrialWelcomeDate(input.startsAt), formatTrialWelcomeDate(input.endsAt));
  return {
    name: TRIAL_WELCOME_TEMPLATE,
    language: { code: TRIAL_WELCOME_LANGUAGE },
    components: [{ type: 'body', parameters: values.map(text => ({ type: 'text', text })) }],
  };
}

export async function sendTrialWelcomeViaMeta(
  input: TrialWelcomeInput,
  config: { token?: string; phoneId?: string; version?: string },
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<TrialWelcomeResult> {
  if (!input.optedIn) return { status: 'skipped', reason: 'not_opted_in' };
  const version = config.version || 'v23.0'; // Same version as the existing QR sender.
  if (!config.token || !config.phoneId || !/^[0-9]+$/.test(config.phoneId) || !/^v[0-9]{1,2}\.[0-9]{1,2}$/.test(version)) return { status: 'skipped', reason: 'not_configured' };
  const start = Date.parse(input.startsAt);
  const end = Date.parse(input.endsAt);
  if (!/^[0-9]{10,15}$/.test(input.phone) || !parameter(input.fullName) || !parameter(input.workshopName) ||
    !Number.isFinite(start) || !Number.isFinite(end) || start > now || end <= now || end <= start) return { status: 'skipped', reason: 'invalid_input' };
  const base = `https://graph.facebook.com/${version}/`;
  const headers = { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' };
  let submitting = false;
  try {
    const metadataResponse = await fetcher(base + TRIAL_WELCOME_TEMPLATE_ID + '?fields=id,name,status,language,components', {
      headers, cache: 'no-store', signal: AbortSignal.timeout(7000),
    });
    if (!metadataResponse.ok) return { status: 'skipped', reason: 'provider_rejected', httpStatus: metadataResponse.status };
    const metadata = await metadataResponse.json();
    if (metadata?.status !== 'APPROVED') return { status: 'skipped', reason: 'template_not_approved' };
    let template;
    try { template = buildTrialWelcomeTemplate(metadata, input); }
    catch { return { status: 'skipped', reason: 'unsupported_template' }; }
    submitting = true;
    const response = await fetcher(base + config.phoneId + '/messages', {
      method: 'POST', headers,
      body: JSON.stringify({ messaging_product: 'whatsapp', to: input.phone, type: 'template', template }),
      cache: 'no-store', signal: AbortSignal.timeout(12000),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return {
      status: 'unconfirmed', reason: 'provider_rejected', httpStatus: response.status,
      ...(typeof payload?.error?.code === 'number' ? { metaCode: payload.error.code } : {}),
    };
    const id = payload?.messages?.[0]?.id;
    return typeof id === 'string' && id.length > 0
      ? { status: 'accepted', messageId: id }
      : { status: 'unconfirmed', reason: 'invalid_provider_response' };
  } catch {
    // A timeout after POST may still mean Meta accepted the message. Never send
    // another welcome as a fallback: that would risk duplicate marketing messages.
    return { status: submitting ? 'unconfirmed' : 'skipped', reason: 'transport_error' };
  }
}
