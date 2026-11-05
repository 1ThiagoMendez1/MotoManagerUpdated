import { z } from 'zod';

export const workshopEmailSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{1,150}$/),
  email: z.string().trim().toLowerCase().email().max(254),
  mode: z.enum(['new', 'existing']),
});

type AuthFailure = { code?: string; status?: number; message?: string };

// Current auth-js treats 5xx as transport failures and discards their JSON body.
// Capture only the fields used for classification, never expose/log the raw response.
export function workshopAuthResponseFailure(status: number, body: unknown): AuthFailure {
  const row = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const rawCode = typeof row.code === 'string' ? row.code : row.error_code;
  const rawMessage = row.msg || row.message || row.error_description;
  return {
    status,
    code: typeof rawCode === 'string' && /^[a-z_0-9]{1,80}$/.test(rawCode) ? rawCode : undefined,
    message: typeof rawMessage === 'string' ? rawMessage : undefined,
  };
}

/** Only controlled messages reach the page; provider details can contain personal data. */
export function workshopAuthFailure(error: AuthFailure, method: 'email' | 'password' = 'email') {
  const code = error.code || '';
  const message = (error.message || '').toLowerCase();
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' ||
      error.status === 429 || /rate limit|too many requests/.test(message)) {
    return { error: 'Se alcanzó el límite de solicitudes. Espera unos minutos antes de volver a intentarlo.', retryAfterSeconds: 60 };
  }
  if (code === 'email_address_invalid' || code === 'validation_failed') {
    return { error: 'Revisa que el correo electrónico esté escrito correctamente.' };
  }
  if (code === 'email_address_not_authorized' || /error sending|smtp|mail server/.test(message)) {
    return { error: 'El servicio de correo no pudo enviar el enlace. Si ya tienes cuenta, accede con tu contraseña; para un registro nuevo, avisa al taller para que revisen el envío de correos.' };
  }
  if (code === 'signup_disabled' || code === 'email_provider_disabled' ||
      code === 'otp_disabled' || /signups? not allowed/.test(message)) {
    return { error: 'El acceso por correo no está habilitado para esta solicitud. Si ya tienes cuenta, usa tu contraseña; si eres nuevo, comunícate con el taller.' };
  }
  if (code === 'email_not_confirmed') {
    return { error: 'Primero verifica tu correo. Elige «Recibir enlace» para solicitar la verificación.' };
  }
  if (method === 'password' && (code === 'invalid_credentials' || error.status === 400)) {
    return { error: 'Correo o contraseña incorrectos.' };
  }
  if (code === 'request_timeout' || !error.status || error.status === 0) {
    return { error: 'No se pudo conectar con el servicio de acceso. Comprueba tu conexión e intenta de nuevo.' };
  }
  return { error: method === 'email'
    ? 'No se pudo enviar el enlace. El servicio de acceso necesita revisión; comunícate con el taller o accede con tu contraseña si ya tienes cuenta.'
    : 'No se pudo iniciar sesión. Intenta de nuevo en unos minutos.' };
}

export function workshopCallbackUrl(origin: string | null, slug: string): string | null {
  if (!origin || !/^[a-z0-9-]{1,150}$/.test(slug)) return null;
  try {
    const url = new URL(origin);
    if (url.username || url.password ||
        (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) return null;
    const callback = new URL('/auth/callback', url.origin);
    callback.searchParams.set('next', `/talleres/${slug}`);
    return callback.toString();
  } catch { return null; }
}
