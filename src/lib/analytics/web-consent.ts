/** Respect browser privacy signals for all first-party measurements. */
export function privacySignal(){
  return typeof navigator!=='undefined' && (navigator.doNotTrack==='1' ||
    (navigator as Navigator&{globalPrivacyControl?:boolean}).globalPrivacyControl===true);
}

/** No cookies or persistent visitor identifiers. DNT and GPC opt out. */
export function webMeasurementAllowed(){
  return typeof window!=='undefined' && !privacySignal();
}
