import test from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@supabase/supabase-js';
import { registerTrialAccount, trialAccountFailure, validateTrialStep, type TrialSignupDependencies } from '../src/lib/trial-signup';
import { validTrialDiagnostic } from '../src/lib/analytics/trial-events';
import { analyticsClientIp } from '../src/lib/analytics/web-http';
import { TRIAL_PROGRESS_FIELDS, trialFieldTarget } from '../src/lib/analytics/trial-fields';
import { batchSchema } from '../src/lib/analytics/web-validation';
import { ANALYTICS_LAYOUT_VERSION, ANALYTICS_MODE } from '../src/lib/analytics/web-shared';
import { randomUUID } from 'node:crypto';

const input = { workshopName:'Taller de prueba',fullName:'Ana Prueba',phone:'300 000 0000',email:' ANA@example.test ',password:'frase de prueba segura',termsAcknowledged:'yes',welcomeRequested:'yes' };
const owner = { id:'00000000-0000-4000-8000-000000000001' } as User;
const organizationId = '00000000-0000-4000-8000-000000000002';
function harness(overrides:Partial<TrialSignupDependencies>={}) {
  const calls:string[]=[];
  const deps:TrialSignupDependencies={
    currentUser:async()=>{calls.push('session');return false;},
    claimAttempt:async()=>{calls.push('rate');return 'allowed';},
    createAccount:async value=>{calls.push('account');assert.equal(value.email,'ana@example.test');assert.equal(value.phone,'573000000000');assert.equal(value.city,'');return {user:owner};},
    workshopSlug:()=> 'taller-de-prueba-abcdefgh',
    provision:async(id,slug,value)=>{calls.push('provision');assert.equal(id,owner.id);assert.equal(slug,'taller-de-prueba-abcdefgh');assert.equal(value.password,input.password);return {organizationId};},
    removeUnprovisionedAccount:async id=>{calls.push('cleanup');assert.equal(id,owner.id);},
    ...overrides,
  };
  return {calls,deps};
}

test('two-step validation checks only the visible step, preserves typed values and defers city',()=>{
  const data={workshopName:input.workshopName,fullName:input.fullName,phone:'',email:'',password:''};
  assert.deepEqual(validateTrialStep(data,0),{});
  assert.deepEqual(Object.keys(validateTrialStep(data,1)).sort(),['email','password','phone']);
  assert.equal(data.workshopName,input.workshopName);
  assert.equal(data.password,'');
  const bad=validateTrialStep({...data,workshopName:'  ',fullName:' '},0);
  assert.equal(Object.keys(bad).length,2);
});
test('invalid data and missing affirmative acceptance do not touch Auth or consume signup attempts',async()=>{
  for(const bad of [{...input,email:'incorrecto'},{...input,password:'corta'},{...input,termsAcknowledged:'no'},{...input,website:'spam'}]){
    const h=harness();const result=await registerTrialAccount(bad,h.deps);
    assert.equal(result.ok,false);if(!result.ok)assert.equal(result.state.code,'validation');
    assert.deepEqual(h.calls,[]);
  }
});
test('a valid signup normalizes contacts and returns only the provisioned account, never the password',async()=>{
  const h=harness();const result=await registerTrialAccount(input,h.deps);
  assert.equal(result.ok,true);if(result.ok){assert.equal(result.organizationId,organizationId);assert.equal(result.user.id,owner.id);}
  assert.deepEqual(h.calls,['session','rate','account','provision']);
  assert.ok(!JSON.stringify(result).includes(input.password));
});
test('existing sessions and unavailable/limited rate checks stop before account creation',async()=>{
  const existing=harness({currentUser:async()=>true});const r=await registerTrialAccount(input,existing.deps);
  assert.equal(r.ok,false);if(!r.ok)assert.equal(r.state.code,'session_open');assert.deepEqual(existing.calls,[]);
  for(const rate of ['limited','unavailable'] as const){
    const h=harness({claimAttempt:async()=>rate});const result=await registerTrialAccount(input,h.deps);
    assert.equal(result.ok,false);if(!result.ok)assert.equal(result.state.code,rate==='limited'?'rate_limited':'rate_unavailable');
    assert.deepEqual(h.calls,['session']);
  }
});
test('duplicate email has a recovery route; provider 422 password errors do not claim the account exists',async()=>{
  assert.equal(trialAccountFailure({code:'email_exists'}),'account_exists');
  assert.equal(trialAccountFailure({code:'weak_password',status:422}),'account_failed');
  const h=harness({createAccount:async()=>({user:null,errorCode:'account_exists'})});const result=await registerTrialAccount(input,h.deps);
  assert.equal(result.ok,false);if(!result.ok){assert.equal(result.state.code,'account_exists');assert.match(result.state.error,/Inicia sesión/);}
  assert.deepEqual(h.calls,['session','rate']);
});
test('confirmed duplicate trial or RPC failure rolls back only the newly unprovisioned user',async()=>{
  for(const duplicate of [false,true]){
    const h=harness({provision:async()=>({organizationId:null,duplicate})});const result=await registerTrialAccount(input,h.deps);
    assert.equal(result.ok,false);if(!result.ok)assert.equal(result.state.code,duplicate?'trial_used':'provision_failed');
    assert.deepEqual(h.calls,['session','rate','account','cleanup']);
  }
});
test('a lost provision response never deletes an account whose workshop might have committed',async()=>{
  const h=harness({provision:async()=>{throw new Error('lost response with private details');}});
  const result=await registerTrialAccount(input,h.deps);
  assert.equal(result.ok,false);if(!result.ok){assert.equal(result.state.code,'interrupted');assert.match(result.state.error,/cuenta alcanzó a crearse/);}
  assert.deepEqual(h.calls,['session','rate','account']);
  assert.ok(!JSON.stringify(result).includes('private details'));
});
test('milestone payloads reject submitted values, free-text messages and invented error codes',()=>{
  assert.equal(validTrialDiagnostic({kind:'form_step',target:'access'}),true);
  assert.equal(validTrialDiagnostic({kind:'form_submit',target:'activate'}),true);
  assert.equal(validTrialDiagnostic({kind:'form_error',target:'rate_limited'}),true);
  for(const value of [{kind:'form_error',target:input.email},{kind:'form_error',target:'sql_details'},{kind:'form_submit',target:'activate',email:input.email},{kind:'form_step',target:'password'}])assert.equal(validTrialDiagnostic(value),false);
});
test('field measurement accepts only fixed milestones, without field contents or coordinates',()=>{
  for(const field of TRIAL_PROGRESS_FIELDS)for(const stage of ['view','edit','valid','invalid'] as const){
    const target=trialFieldTarget(field.name,stage);
    assert.equal(validTrialDiagnostic({kind:'form_step',target}),true);
    assert.equal(validTrialDiagnostic({kind:'form_step',target,value:input.phone}),false);
  }
  for(const target of ['field_v1:phone:'+input.phone,'field_v1:email:'+input.email,'field_v1:password:'+input.password,'field_v1:city:view'])assert.equal(validTrialDiagnostic({kind:'form_step',target}),false);
  const batch={mode:ANALYTICS_MODE,batchId:randomUUID(),visitorSeed:randomUUID(),attribution:{channel:'direct',source:null,medium:null,campaign:null,referrer:null},
    layouts:[{path:'/prueba-gratis',version:ANALYTICS_LAYOUT_VERSION,variant:'trial-v2-fields-v1',viewportWidth:390,viewportHeight:844,width:390,height:1900,sections:[]}],
    events:[{id:randomUUID(),pageId:randomUUID(),layout:0,kind:'form_step',target:'field_v1:phone:edit',ageMs:0}]};
  assert.equal(batchSchema.safeParse(batch).success,true);
  assert.equal(batchSchema.safeParse({...batch,events:[{...batch.events[0],x:.5}]}).success,false);
  assert.equal(batchSchema.safeParse({...batch,events:[{...batch.events[0],phone:input.phone}]}).success,false);
  assert.equal(batchSchema.safeParse({...batch,layouts:[{...batch.layouts[0],path:'/login'}]}).success,false);
});

test('declining promotions does not block account creation; selection is passed separately',async()=>{
  for(const choice of [undefined,'no','yes']){
    const h=harness({createAccount:async value=>{assert.equal(value.marketingRequested,choice==='yes'?'yes':'no');return {user:owner};}});
    const result=await registerTrialAccount({...input,...(choice?{marketingRequested:choice}:{})},h.deps);
    assert.equal(result.ok,true);
  }
});
test('different visitors behind a verified Cloudflare edge do not share a signup rate address',()=>{
  const headers=new Headers({'x-real-ip':'104.16.1.1','cf-connecting-ip':'190.1.2.3'});
  const first=analyticsClientIp(headers);headers.set('cf-connecting-ip','190.1.2.4');const second=analyticsClientIp(headers);
  assert.equal(first,'190.1.2.3');assert.equal(second,'190.1.2.4');assert.notEqual(first,second);
  assert.equal(analyticsClientIp(new Headers({'x-real-ip':'190.1.2.3','cf-connecting-ip':'8.8.8.8'})),'190.1.2.3');
});
