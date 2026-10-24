import { z } from 'zod';

export const storefrontSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]{1,150}$/),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  enrollmentEnabled: z.boolean(),
});
export type Storefront = z.infer<typeof storefrontSchema>;

/**
 * Public QR pages must continue working even when a workshop pauses signups.
 * Strip every non-public organization setting before sending data to the browser.
 */
export function publicStorefrontFromRow(raw: unknown): Storefront | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (row.status === 'suspended' || row.status === 'deleted') return null;
  const settings = row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
    ? row.settings as Record<string, unknown> : {};
  const publicText = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  const parsed = storefrontSchema.safeParse({
    id: row.id,
    name: row.name,
    slug: row.slug,
    phone: publicText(row.phone),
    address: publicText(settings.address),
    city: publicText(settings.city),
    enrollmentEnabled: row.status === 'active' && settings.customer_enrollment_enabled === true,
  });
  return parsed.success ? parsed.data : null;
}

export const enrollmentSchema = z.object({
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().transform(value => value.replace(/[\s()-]/g, '')).pipe(z.string().regex(/^\+?[0-9]{10,15}$/)),
  plate: z.string().trim().max(16).transform(v => v.replace(/[\s-]/g, '').toUpperCase())
    .refine(v => v === '' || /^[A-Z0-9]{5,8}$/.test(v), 'Placa inválida').optional().default(''),
  brand: z.string().trim().max(60).optional().default(''),
  model: z.string().trim().max(60).optional().default(''),
  consent: z.literal('on'),
});

export function workshopPath(slug: string) {
  return `/talleres/${encodeURIComponent(slug)}`;
}

// Only storefront destinations are allowed after email verification.
export function safeWorkshopReturnPath(value: string | null) {
  return value && /^\/talleres\/[a-z0-9-]+$/.test(value) ? value : '/';
}
