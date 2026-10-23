import { z } from 'zod';

export const storefrontSchema = z.object({
  name: z.string(), slug: z.string(), phone: z.string().nullable(),
  address: z.string().nullable(), city: z.string().nullable(),
});
export type Storefront = z.infer<typeof storefrontSchema>;

export const enrollmentSchema = z.object({
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().transform(value => value.replace(/[\s()-]/g, '')).pipe(z.string().regex(/^\+?[0-9]{10,15}$/)),
  consent: z.literal('on'),
});

export function workshopPath(slug: string) {
  return `/talleres/${encodeURIComponent(slug)}`;
}

// Only storefront destinations are allowed after email verification.
export function safeWorkshopReturnPath(value: string | null) {
  return value && /^\/talleres\/[a-z0-9-]+$/.test(value) ? value : '/';
}
