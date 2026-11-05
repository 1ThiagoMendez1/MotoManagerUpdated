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

/**
 * Send one activation template with exactly the positional variables that Meta
 * expects. The approved template has historically existed with 4 and 5 body
 * variables, and edits of a template can change the actual accepted count.
 *
 * Only an explicit HTTP error 132000 (Meta unequivocally rejected the request
 * for parameter count mismatch) may trigger one alternative request. Never
 * resend after a timeout, HTTP 200 or ambiguous provider response.
 */
export function buildTrialWelcomeSendTemplate(input: TrialWelcomeInput, variableCount: 4 | 5 = 5) {
  const values = [parameter(input.fullName), parameter(input.workshopName)];
  if (variableCount === 5) values.push(parameter(input.email, 254));
  values.push(formatTrialWelcomeDate(input.startsAt), formatTrialWelcomeDate(input.endsAt));
  return {
    name: TRIAL_WELCOME_TEMPLATE,
    language: { code: TRIAL_WELCOME_LANGUAGE },
    components: [{ type: 'body', parameters: values.map(text => ({ type: 'text', text })) }],
  };
}

export async function sendTrialWelcomeViaMeta(
  input: TrialWelcomeInput,
  config: { token?: string; phoneId?: string; version?: string; variableCount?: number },
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<TrialWelcomeResult> {
  if (!input.optedIn) return { status: 'skipped', reason: 'not_opted_in' };
  const version = config.version || 'v23.0';
  if (!config.token || !config.phoneId || !/^[0-9]+$/.test(config.phoneId) ||
    !/^v[0-9]{1,2}\.[0-9]{1,2}$/.test(version) ||
    (config.variableCount !== undefined && config.variableCount !== 4 && config.variableCount !== 5)) {
    return { status: 'skipped', reason: 'not_configured' };
  }
  const start = Date.parse(input.startsAt);
  const end = Date.parse(input.endsAt);
  if (!/^[0-9]{10,15}$/.test(input.phone) || !parameter(input.fullName) ||
    !parameter(input.workshopName) || !Number.isFinite(start) || !Number.isFinite(end) ||
    start > now || end <= now || end <= start) {
    return { status: 'skipped', reason: 'invalid_input' };
  }

  const initialCount = config.variableCount || 5;
  const alternateCount = initialCount === 5 ? 4 : 5;
  const url = 'https://graph.facebook.com/' + version + '/' + config.phoneId + '/messages';
  const headers = { Authorization: 'Bearer ' + config.token, 'Content-Type': 'application/json' };
  const send = async (count: 4 | 5) => {
    const response = await fetcher(url, {
      method: 'POST', headers, cache: 'no-store', signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        messaging_product: 'whatsapp', to: input.phone, type: 'template',
        template: buildTrialWelcomeSendTemplate(input, count),
      }),
    });
    const payload = await response.json().catch(() => null);
    return { response, payload };
  };
  try {
    // The 4-parameter template was rejected with Meta 132000 in production.
    // Use 5 first; try 4 only if Meta explicitly confirms 5 was rejected.
    for (const count of [initialCount, alternateCount] as const) {
      const { response, payload } = await send(count as 4 | 5);
      if (!response.ok) {
        const metaCode = typeof payload?.error?.code === 'number' ? payload.error.code : undefined;
        if (metaCode === 132000 && count === initialCount) {
          // First POST was definitively rejected and could not have sent a message.
          // Keep logs free of phone numbers, content and credentials.
          console.warn('[trial-whatsapp] Meta template count mismatch; testing alternate approved shape', {
            firstCount: initialCount, secondCount: alternateCount, metaCode,
          });
          continue;
        }
        return { status: 'unconfirmed', reason: 'provider_rejected',
          httpStatus: response.status, ...(metaCode !== undefined ? { metaCode } : {}) };
      }
      const id = payload?.messages?.[0]?.id;
      return typeof id === 'string' && id.length > 0
        ? { status: 'accepted', messageId: id }
        : { status: 'unconfirmed', reason: 'invalid_provider_response' };
    }
    return { status: 'unconfirmed', reason: 'invalid_provider_response' };
  } catch {
    // A transport error is ambiguous: never retry, to avoid duplicate delivery.
    return { status: 'unconfirmed', reason: 'transport_error' };
  }
}
