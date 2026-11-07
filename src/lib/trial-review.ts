import { z } from 'zod';

export const TRIAL_REVIEW_PATH = '/revision-prueba';
export const TRIAL_REVIEW_MESSAGE = 'Tu prueba gratuita está pausada temporalmente porque encontramos información del registro que requiere verificación. Comunícate con el equipo de MotoManager para confirmar los datos y la actividad de tu taller. Reactivaremos el acceso cuando finalice la revisión.';

export type MyTrialReview = {
  organizationId: string;
  workshopName: string;
  pausedAt: string;
  message: string;
};

export type TrialVerification = {
  workshopName: string;
  city: string;
  address: string;
  responsibleName: string;
  phone: string;
  evidence: string;
  contacted: boolean;
  locationChecked: boolean;
  evidenceChecked: boolean;
};

export type AdminTrialReview = {
  organizationId: string;
  status: 'paused' | 'verified';
  pausedAt: string;
  reviewedAt: string | null;
  remainingSeconds: number;
  reason: string;
  message: string;
  verification: Partial<TrialVerification>;
};

const reason = z.string().trim().min(8, 'Describe el motivo de la revisión (mínimo 8 caracteres).').max(1000);
export const pauseTrialSchema = z.object({
  workshopId: z.string().uuid(),
  reason,
  message: z.string().trim().min(30, 'Escribe un mensaje claro para el usuario.').max(1000),
});
export const verifyTrialSchema = z.object({
  workshopId: z.string().uuid(),
  reason,
  verification: z.object({
    workshopName: z.string().trim().min(3).max(120),
    city: z.string().trim().min(2).max(120),
    address: z.string().trim().min(5).max(300),
    responsibleName: z.string().trim().min(3).max(120),
    phone: z.string().transform(value => {
      const digits = value.replace(/\D/g, '');
      return digits.length === 10 ? '57' + digits : digits;
    }).pipe(z.string().regex(/^\d{10,15}$/, 'Revisa el celular del responsable.')),
    evidence: z.string().trim().min(10, 'Registra qué evidencia del taller comprobaste.').max(1000),
    contacted: z.literal(true),
    locationChecked: z.literal(true),
    evidenceChecked: z.literal(true),
  }),
});

// No Server Actions may execute through the review page or polling endpoint.
export function isTrialReviewRequestAllowed(path: string, method: string, serverAction = false) {
  if (serverAction) return false;
  if (method === 'GET' || method === 'HEAD') {
    return path === TRIAL_REVIEW_PATH || path === '/api/trial-review/status';
  }
  return method === 'POST' && path === '/auth/signout';
}

// Next's internal request origin can be 0.0.0.0 behind the Docker proxy.
// Validate against the configured public site, never that internal hostname.
export function getTrialSignoutOrigin(appUrl: string, origin: string | null) {
  const app = new URL(appUrl);
  if (!['https:', 'http:'].includes(app.protocol)) return null;
  const allowed = new Set([app.origin]);
  if (['motomanager.com.co', 'www.motomanager.com.co'].includes(app.hostname)) {
    allowed.add('https://motomanager.com.co');
    allowed.add('https://www.motomanager.com.co');
  }
  return origin ? allowed.has(origin) ? origin : null : app.origin;
}
