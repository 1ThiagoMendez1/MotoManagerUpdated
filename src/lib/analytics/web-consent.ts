import { WEB_ANALYTICS_CONSENT_KEY, WEB_ANALYTICS_VISITOR_KEY } from './web-shared';

export function privacySignal() {
  return typeof navigator!=='undefined' && (navigator.doNotTrack==='1' ||
    (navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl===true);
}
export function webMeasurementAllowed() {
  if(typeof window==='undefined' || privacySignal())return false;
  try{return localStorage.getItem(WEB_ANALYTICS_CONSENT_KEY)==='accepted';}catch{return false;}
}
/** Called only after an explicit opt-in, never to fingerprint a visitor. */
export function analyticsVisitorSeed() {
  try{
    const saved=JSON.parse(localStorage.getItem(WEB_ANALYTICS_VISITOR_KEY)||'null');
    if(saved && /^[a-f0-9-]{36}$/i.test(saved.id) && Number.isFinite(saved.at) && saved.at<=Date.now() && Date.now()-saved.at<15552000000)return saved.id as string;
    const id=crypto.randomUUID();localStorage.setItem(WEB_ANALYTICS_VISITOR_KEY,JSON.stringify({id,at:Date.now()}));return id;
  }catch{return crypto.randomUUID();}
}

/** Read an existing seed only with active consent. Never create tracking
 * state just because someone opens a login or registration form. */
export function consentingAnalyticsVisitorSeed():string|null {
  if(!webMeasurementAllowed())return null;
  try{
    const saved=JSON.parse(localStorage.getItem(WEB_ANALYTICS_VISITOR_KEY)||'null');
    return saved && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(saved.id)
      && Number.isFinite(saved.at) && saved.at<=Date.now() && Date.now()-saved.at<15552000000 ? saved.id : null;
  }catch{return null;}
}
