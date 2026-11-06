import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webMeasurementAllowed } from '../src/lib/analytics/web-consent';
import { ANALYTICS_MODE } from '../src/lib/analytics/web-shared';

test('anonymous first-party analytics cannot create persistent browser identifiers',async()=>{
  assert.equal(ANALYTICS_MODE,'anonymous');
  const tracker=await readFile(new URL('../src/components/analytics/WebAnalyticsTracker.tsx',import.meta.url),'utf8');
  const consent=await readFile(new URL('../src/lib/analytics/web-consent.ts',import.meta.url),'utf8');
  const inputs=await Promise.all(['../src/app/login/page.tsx','../src/app/prueba-gratis/TrialForm.tsx'].map(url=>
    readFile(new URL(url,import.meta.url),'utf8')));
  assert.match(tracker,/const visitorSeed=crypto\.randomUUID\(\)/);
  assert.doesNotMatch(tracker,/localStorage\.setItem|sessionStorage|analyticsVisitorSeed\(/);
  assert.doesNotMatch(consent,/localStorage|sessionStorage|document\.cookie/);
  for(const input of inputs)assert.doesNotMatch(input,/analyticsVisitorSeed|AnalyticsIdentityField/);
});
test('anonymous measurement needs no stored opt-in and obeys browser privacy signals',()=>{
  const globals=['window','navigator'] as const;
  const previous=globals.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
  try{
    Object.defineProperty(globalThis,'window',{configurable:true,value:{}});
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{doNotTrack:'0',globalPrivacyControl:false}});
    assert.equal(webMeasurementAllowed(),true);
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{doNotTrack:'1',globalPrivacyControl:false}});
    assert.equal(webMeasurementAllowed(),false);
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{doNotTrack:'0',globalPrivacyControl:true}});
    assert.equal(webMeasurementAllowed(),false);
  }finally{
    for(const [key,descriptor] of previous){
      if(descriptor)Object.defineProperty(globalThis,key,descriptor);
      else Reflect.deleteProperty(globalThis,key);
    }
  }
});
