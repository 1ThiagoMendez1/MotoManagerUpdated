import test from 'node:test';
import assert from 'node:assert/strict';
import { trackMarketingEvent, META_PIXEL_CONSENT_KEY } from '../src/lib/analytics/metaPixel';
import { WEB_ANALYTICS_CONSENT_KEY } from '../src/lib/analytics/web-shared';

test('Meta events require independent marketing opt-in, not web analytics opt-in', () => {
  const saved = ['window','localStorage','navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const data = new Map<string,string>();
  const events: unknown[][] = [];
  try {
    Object.defineProperty(globalThis, 'window', { configurable:true, value:{ fbq:(...args:unknown[])=>events.push(args) } });
    Object.defineProperty(globalThis, 'localStorage', { configurable:true, value:{ getItem:(key:string)=>data.get(key)||null } });
    Object.defineProperty(globalThis, 'navigator', { configurable:true, value:{ doNotTrack:'0', globalPrivacyControl:false } });
    data.set(WEB_ANALYTICS_CONSENT_KEY, 'rejected');
    data.set(META_PIXEL_CONSENT_KEY, 'accepted');
    trackMarketingEvent('ViewContent', { content_name:'Plan Full', value:119900 });
    assert.equal(events.length,1,'Meta keeps working when own analytics is disabled');
    data.set(WEB_ANALYTICS_CONSENT_KEY,'accepted');
    data.set(META_PIXEL_CONSENT_KEY,'rejected');
    trackMarketingEvent('ViewContent', { content_name:'Plan Full' });
    assert.equal(events.length,1,'own analytics consent cannot activate Meta');
    data.set(META_PIXEL_CONSENT_KEY,'accepted');
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{doNotTrack:'1',globalPrivacyControl:true}});
    trackMarketingEvent('InitiateCheckout',{value:119900});
    assert.equal(events.length,1,'privacy signals override stored advertising opt-in');
  } finally {
    for (const [name, descriptor] of saved) {
      if(descriptor) Object.defineProperty(globalThis,name,descriptor);
      else Reflect.deleteProperty(globalThis,name);
    }
  }
});
