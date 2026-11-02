import { z } from 'zod';
import { ANALYTICS_LAYOUT_VERSION, CHANNELS, publicAnalyticsPath } from './web-shared';

export const layoutSchema = z.object({
  path: z.string().max(120).refine(path => publicAnalyticsPath(path) === path, 'Página no medible'),
  version: z.literal(ANALYTICS_LAYOUT_VERSION),
  variant: z.string().regex(/^[a-zA-Z0-9_:\-.,=]{1,120}$/),
  viewportWidth: z.number().int().min(100).max(10000),
  viewportHeight: z.number().int().min(100).max(10000),
  width: z.number().int().min(100).max(20000),
  height: z.number().int().min(100).max(150000),
  sections: z.array(z.object({
    key: z.string().regex(/^[a-z0-9-]{1,40}$/), start: z.number().min(0).max(1), end: z.number().min(0).max(1),
  }).strict().refine(section => section.end >= section.start)).max(20),
}).strict();

export const eventSchema = z.object({
  id: z.string().uuid(), pageId: z.string().uuid(), layout: z.number().int().min(0).max(7),
  kind: z.enum(['pageview', 'click', 'scroll', 'engagement', 'form_start']),
  ageMs: z.number().int().min(0).max(60000),
  x: z.number().min(0).max(1).optional(), y: z.number().min(0).max(1).optional(),
  target: z.string().regex(/^[a-z0-9_:\-./>]{1,160}$/).optional(),
  depth: z.number().min(0).max(100).optional(),
  seconds: z.number().min(0).max(30).optional(),
}).strict().superRefine((event, ctx) => {
  if (event.kind === 'click' && (event.x === undefined || event.y === undefined || !event.target)) ctx.addIssue({ code: 'custom', message: 'Clic incompleto' });
  if (event.kind === 'scroll' && event.depth === undefined) ctx.addIssue({ code: 'custom', message: 'Profundidad incompleta' });
  if (event.kind === 'engagement' && event.seconds === undefined) ctx.addIssue({ code: 'custom', message: 'Duración incompleta' });
});
export const batchSchema = z.object({
  consent: z.literal(true), batchId: z.string().uuid(), visitorSeed: z.string().uuid(),
  attribution: z.object({
    source: z.string().max(100).nullable(), medium: z.string().max(100).nullable(),
    campaign: z.string().max(100).nullable(), referrer: z.string().max(160).nullable(),
    channel: z.enum(CHANNELS),
  }).strict(),
  layouts: z.array(layoutSchema).min(1).max(8), events: z.array(eventSchema).min(1).max(30),
}).strict().superRefine((batch, ctx) => {
  for (const event of batch.events) {
    const layout = batch.layouts[event.layout];
    if (!layout || (event.kind === 'form_start' && layout.path !== '/prueba-gratis')) ctx.addIssue({code:'custom',message:'Contexto no permitido'});
    if (event.kind === 'click' && ['/login', '/register-workshop'].includes(layout?.path)) ctx.addIssue({code:'custom',message:'Formulario privado'});
  }
});

