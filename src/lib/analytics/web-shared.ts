export const LEGACY_WEB_ANALYTICS_STORAGE_KEYS = ['mm_web_analytics_consent_v1','mm_web_analytics_visitor_v1'] as const;
export const MEASUREMENT_CHANGED = 'mm:measurement-consent-change';
export const ANALYTICS_LAYOUT_VERSION = '2026-10-30-v1';
export const ANALYTICS_SESSION_MS = 30 * 60_000;
export const ANALYTICS_MODE = 'anonymous' as const;
export const CHANNELS = ['direct', 'search_ai', 'social', 'referral', 'ads'] as const;
export type Channel = typeof CHANNELS[number];
export const CHANNEL_LABELS: Record<Channel | 'all', string> = {
  all: 'Todo', search_ai: 'Buscadores e IA', social: 'Redes sociales',
  referral: 'Referencias', direct: 'Directo', ads: 'Anuncios',
};

/** Only public commercial pages. Query strings, tokens, quotes and private app
 * routes never become analytics paths. Public workshop slugs are already public. */
export function publicAnalyticsPath(value: string): string | null {
  try {
    const path = new URL(value, 'https://www.motomanager.com.co').pathname;
    if (['/', '/planes', '/prueba-gratis', '/login', '/register-workshop'].includes(path)) return path;
    if (/^\/talleres\/[a-z0-9][a-z0-9-]{0,79}$/.test(path)) return path;
  } catch { /* Ignore malformed URLs. */ }
  return null;
}

export const SECTION_LABELS: Record<string, string> = {
  hero: 'Portada', demo: 'Demo interactiva', why: 'Beneficios', funciones: 'Funcionalidades',
  'como-funciona': 'Cómo funciona', 'como-empezar': 'Primeros pasos', 'prueba-gratis': 'Oferta Full', planes: 'Planes',
  workshops: 'Talleres', faq: 'Preguntas frecuentes', closing: 'Cierre comercial', page: 'Página',
};
export const TARGET_LABELS: Record<string, string> = {
  hero_trial: 'Portada · Activar prueba', hero_demo: 'Portada · Ver demo', hero_pricing: 'Portada · Ver planes',
  nav_trial: 'Navegación · Activar prueba', ribbon_trial: 'Franja · Activar prueba',
  offer_trial: 'Oferta Full · Activar prueba', closing_trial: 'Cierre · Activar prueba',
  demo_open: 'Demo · Abrir demostración', demo_trial: 'Demo · Crear mi taller gratis',
  plan_basic: 'Elegir Básico', plan_pro: 'Elegir Pro', plan_full: 'Elegir Full',
  link: 'Enlace', button: 'Botón', area: 'Zona de la página',
};

export function cleanCampaignValue(value: string | null | undefined) {
  if (!value || value.length > 160 || /@|\b(?:bearer|password|token|secret)\b/i.test(value)) return null;
  const clean = value.normalize('NFKC').replace(/[^\p{L}\p{N} _.:\-]/gu, '').trim().slice(0, 100);
  return clean || null;
}

export type Attribution = { source: string | null; medium: string | null; campaign: string | null; referrer: string | null; channel: Channel };
export function trafficAttribution(url: string, referrer: string): Attribution {
  const location = new URL(url, 'https://www.motomanager.com.co');
  const source = cleanCampaignValue(location.searchParams.get('utm_source'));
  const medium = cleanCampaignValue(location.searchParams.get('utm_medium'));
  const campaign = cleanCampaignValue(location.searchParams.get('utm_campaign'));
  let host: string | null = null;
  try {
    const parsed = new URL(referrer);
    if (['http:', 'https:'].includes(parsed.protocol) && parsed.hostname !== location.hostname &&
      !/(^|\.)motomanager\.com\.co$/i.test(parsed.hostname)) host = parsed.hostname.replace(/^www\./i, '').toLowerCase().slice(0, 160);
  } catch { /* Direct visit. */ }
  const origin = (source || host || '').toLowerCase();
  let channel: Channel = 'direct';
  if (/^(cpc|ppc|cpm|paid|paid_social|paidsocial|display|retargeting)$/i.test(medium || '') ||
      location.searchParams.has('gclid') || location.searchParams.has('dclid') || location.searchParams.has('msclkid')) channel = 'ads';
  else if (/(^|[.\s_-])(google|bing|yahoo|duckduckgo|brave|ecosia|chatgpt|openai|perplexity|claude|copilot)([.\s_-]|$)/i.test(origin)) channel = 'search_ai';
  else if (/(^|[.\s_-])(facebook|instagram|fb|ig|tiktok|youtube|youtu\.be|linkedin|pinterest|twitter|x\.com|threads)([.\s_-]|$)/i.test(origin)) channel = 'social';
  else if (host || source) channel = 'referral';
  return { source, medium, campaign, referrer: host, channel };
}

export type AnalyticsLayout = {path:string;version:typeof ANALYTICS_LAYOUT_VERSION;variant:string;viewportWidth:number;viewportHeight:number;width:number;height:number;sections:{key:string;start:number;end:number}[]};
export type AnalyticsEvent = {id:string;pageId:string;layout:number;kind:'pageview'|'click'|'scroll'|'engagement'|'form_start'|'form_step'|'form_submit'|'form_error';ageMs:number;x?:number;y?:number;target?:string;depth?:number;seconds?:number};
export type AnalyticsBatch = {mode:typeof ANALYTICS_MODE;batchId:string;visitorSeed:string;attribution:Attribution;layouts:AnalyticsLayout[];events:AnalyticsEvent[]};

export function deviceFromAgent(agent: string) {
  return /ipad|tablet|android(?!.*mobile)/i.test(agent) ? 'tablet' : /mobile|iphone|ipod/i.test(agent) ? 'mobile' : 'desktop';
}
export function browserFromAgent(agent: string) {
  if (/edg\//i.test(agent)) return 'Edge';
  if (/opr\//i.test(agent)) return 'Opera';
  if (/firefox|fxios/i.test(agent)) return 'Firefox';
  if (/chrome|crios/i.test(agent)) return 'Chrome';
  if (/safari/i.test(agent)) return 'Safari';
  return 'Otro';
}
export const isKnownBot = (agent: string) => /bot\b|spider|crawler|headless|lighthouse|facebookexternalhit|preview|monitoring|curl\/|wget\//i.test(agent);

export type AnalyticsRange = { from: string; to: string; label: string };
function bogotaDay(now: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
  return ['year','month','day'].map(type=>parts.find(part=>part.type===type)!.value).join('-');
}
export function analyticsRange(period: string, start?: string | null, end?: string | null, now = Date.now()): AnalyticsRange {
  const day = 86400000;
  const today = Date.parse(bogotaDay(now) + 'T00:00:00-05:00');
  let from = today, to = today + day, label = 'Hoy';
  if (period === 'yesterday') { from -= day; to -= day; label = 'Ayer'; }
  else if (['7d','30d','90d'].includes(period)) { from -= (Number(period.slice(0,-1))-1)*day; label = `Últimos ${period.slice(0,-1)} días`; }
  else if (period === 'custom') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '')) throw new Error('Selecciona ambas fechas.');
    from = Date.parse(start + 'T00:00:00-05:00'); to = Date.parse(end + 'T00:00:00-05:00') + day; label = `${start} a ${end}`;
    if (bogotaDay(from) !== start || bogotaDay(to-day) !== end) throw new Error('Fecha inválida.');
  } else if (period !== 'today') throw new Error('Periodo no válido.');
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to-from > 90*day || from > now || to > today+day) throw new Error('Elige hasta 90 días, sin fechas futuras.');
  return {from:new Date(from).toISOString(),to:new Date(to).toISOString(),label};
}

export type AnalyticsReport = {
  active: number;
  totals: { visits:number; visitors:number; pageviews:number; activeSeconds:number; bounceRate:number; trialActivations:number; conversionRate:number };
  series: { at:string; visits:number; visitors:number; pageviews:number }[];
  channels: { channel:Channel; visits:number }[];
  sources: { label:string; channel:Channel; visits:number }[];
  pages: { path:string; views:number; visits:number }[];
  devices: { device:string; visits:number }[];
  countries: { country:string; visits:number }[];
  locations: { country:string; city:string; latitude:number; longitude:number; visits:number }[];
  campaigns: { source:string; medium:string; campaign:string; visits:number; trials:number }[];
  sessions: { id:string; visitorId:string; userId:string|null; startedAt:string; lastSeen:string; lastPath:string; source:string; device:string; country:string|null; city:string|null; name:string|null; email:string|null; workshop:string|null }[];
  accesses: { userId:string; at:string; kind:string; name:string|null; email:string|null; workshop:string|null; device:string; browser:string; country:string|null; city:string|null }[];
  funnel: {visits:number; registration:number; formStarted:number; activated:number};
  coverage: { firstEvent:string|null; located:number; total:number; retentionDays:number };
  signup?: TrialSignupDiagnostics;
};
export type TrialSignupDiagnostics = {
  available: boolean; firstMeasuredAt: string | null;
  visits: number; started: number; accessStep: number; submitted: number; submitAttempts: number;
  confirmedTrials: number;
  clientErrors: { code:string; attempts:number; visits:number }[];
  serverErrors: { code:string; attempts:number }[];
};
export type HeatmapLayout = { id:string; path:string; variant:string; device:string; viewportWidth:number; viewportHeight:number; width:number; height:number; sections:AnalyticsLayout['sections']; clicks:number; visitors:number };
export type HeatmapData = { layout:HeatmapLayout|null; layouts:HeatmapLayout[]; points:{x:number;y:number;target:string}[]; targets:{target:string;clicks:number}[]; scroll:{depth:number;visitors:number}[]; totalClicks:number; sampled:boolean };
export type GeoStatus = { available:boolean; downloading:boolean; updatedAt:string|null };
export type AnalyticsPayload = { report:AnalyticsReport; heatmap:HeatmapData; range:AnalyticsRange; fetchedAt:string; geo:GeoStatus };

export function csvCell(value: unknown) {
  let text = String(value ?? '').replace(/[\r\n\t]/g, ' ');
  if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
