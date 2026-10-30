/** Public Meta Pixel marketing events (never pass emails, names or payment references). */
export const META_PIXEL_CONSENT_KEY = 'mm_marketing_consent_v1';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type MarketingEvent = 'ViewContent' | 'InitiateCheckout';

export function trackMarketingEvent(event: MarketingEvent, payload: Record<string, string | number>) {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(META_PIXEL_CONSENT_KEY) !== 'accepted') return;
    window.fbq?.('track', event, payload);
  } catch {
    // Advertising telemetry must never prevent a customer from completing checkout.
  }
}
