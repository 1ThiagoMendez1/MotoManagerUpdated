import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrialWelcomeTemplate, buildTrialWelcomeSendTemplate, formatTrialWelcomeDate,
  sendTrialWelcomeViaMeta, TRIAL_WELCOME_TEMPLATE, TRIAL_WELCOME_TEMPLATE_ID,
  TRIAL_WELCOME_LANGUAGE,
} from '../src/lib/whatsapp-trial';
import { trialRegistrationSchema } from '../src/lib/subscription-trial';

const now = Date.parse('2026-10-31T04:00:00Z');
const input = {
  phone: '573001234567', fullName: 'Juan\nPérez', workshopName: 'Moto\tRayo',
  email: 'juan@example.test', startsAt: '2026-10-31T03:30:00Z', endsAt: '2026-11-15T03:30:00Z',
  optedIn: true, password: 'never-send-this-password',
};
const config = { token: 'fake-test-token', phoneId: '123456789' };
function template(withEmail = false) {
  return {
    id: TRIAL_WELCOME_TEMPLATE_ID, name: TRIAL_WELCOME_TEMPLATE, language: TRIAL_WELCOME_LANGUAGE,
    status: 'APPROVED', components: [
      { type: 'HEADER', format: 'TEXT', text: 'Tu taller acaba de subir de nivel' },
      { type: 'BODY', text: '¡Hola, {{1}}! Bienvenido a MotoManager.\n{{2}} ya está listo.\nCorreo: ' +
        (withEmail ? '{{3}}' : 'Con el que te registraste.') +
        '\nInicio: {{' + (withEmail ? 4 : 3) + '}}\nDisfruta tu prueba hasta: {{' + (withEmail ? 5 : 4) + '}}' },
      { type: 'FOOTER', text: 'MotoManager · CRM' },
      { type: 'BUTTONS', buttons: [{ type: 'URL', url: 'https://www.motomanager.com.co/login' }] },
    ],
  };
}
const response = (data: unknown, status=200) => new Response(JSON.stringify(data),{
  status, headers:{'Content-Type':'application/json'},
});

test('Meta trial payload keeps correct name, language and 4 or 5 safe body fields',()=>{
  const four=buildTrialWelcomeSendTemplate(input);
  assert.equal(four.name,TRIAL_WELCOME_TEMPLATE);
  assert.equal(four.language.code,'es_CO');
  assert.equal(four.components.length,1);
  assert.deepEqual(four.components[0].parameters.map(p=>p.text),[
    'Juan Pérez','Moto Rayo',formatTrialWelcomeDate(input.startsAt),formatTrialWelcomeDate(input.endsAt),
  ]);
  const five=buildTrialWelcomeSendTemplate(input,5);
  assert.deepEqual(five.components[0].parameters.map(p=>p.text),[
    'Juan Pérez','Moto Rayo','juan@example.test',formatTrialWelcomeDate(input.startsAt),formatTrialWelcomeDate(input.endsAt),
  ]);
  assert.doesNotMatch(JSON.stringify(four),/never-send-this-password|juan@example/);
});

test('existing metadata parser still rejects unknown template shapes',()=>{
  assert.equal(buildTrialWelcomeTemplate(template(),input).components[0].parameters.length,4);
  assert.equal(buildTrialWelcomeTemplate(template(true),input).components[0].parameters.length,5);
  for(const patch of [{id:'bad'},{status:'PENDING'},{language:'es'}]){
    assert.throws(()=>buildTrialWelcomeTemplate({...template(),...patch},input));
  }
});

test('one affirmative button submits welcome request; no checkbox is required',()=>{
  const form={fullName:'Ana Pérez',workshopName:'Taller Ana',email:'ana@example.test',
    phone:'3001234567',city:'Bogotá',password:'Segura2026!Trial',
    termsAcknowledged:'yes',welcomeRequested:'yes',website:''};
  assert.equal(trialRegistrationSchema.parse(form).welcomeRequested,'yes');
  assert.equal(trialRegistrationSchema.parse({...form,welcomeRequested:'no'}).welcomeRequested,'no');
  assert.equal(trialRegistrationSchema.safeParse({...form,welcomeRequested:'random'}).success,false);
  assert.equal(trialRegistrationSchema.safeParse({...form,termsAcknowledged:''}).success,false);
});

test('never contact Meta when recipient declined, credentials missing or trial invalid',async()=>{
  const noNetwork=(async()=>{throw Error('unexpected fetch')}) as typeof fetch;
  assert.deepEqual(await sendTrialWelcomeViaMeta({...input,optedIn:false},config,noNetwork,now),
    {status:'skipped',reason:'not_opted_in'});
  assert.deepEqual(await sendTrialWelcomeViaMeta(input,{},noNetwork,now),
    {status:'skipped',reason:'not_configured'});
  assert.equal((await sendTrialWelcomeViaMeta({...input,phone:'bad'},config,noNetwork,now)).status,'skipped');
  assert.equal((await sendTrialWelcomeViaMeta({...input,endsAt:new Date(now).toISOString()},config,noNetwork,now)).status,'skipped');
});

test('welcome is sent exactly once by template NAME without inaccessible metadata-ID GET',async()=>{
  const calls:{url:string;init?:RequestInit}[]=[];
  const mocked=(async (url,init)=>{
    calls.push({url:String(url),init});
    return response({messages:[{id:'wamid.test-only'}]});
  }) as typeof fetch;
  assert.deepEqual(await sendTrialWelcomeViaMeta(input,config,mocked,now),{
    status:'accepted',messageId:'wamid.test-only',
  });
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://graph.facebook.com/v23.0/123456789/messages');
  assert.equal(calls[0].init?.method,'POST');
  const body=JSON.parse(String(calls[0].init?.body));
  assert.equal(body.template.name,TRIAL_WELCOME_TEMPLATE);
  assert.equal(body.template.components[0].parameters.length,4);
  assert.equal(body.to,input.phone);
  assert.doesNotMatch(JSON.stringify(body),/never-send-this-password|fake-test-token/);
});

test('invalid Meta response, rejection or timeout never cause a duplicate POST',async()=>{
  for(const scenario of ['reject','timeout','missing-id']){
    let calls=0;
    const mocked=(async()=>{
      calls++;
      if(scenario==='timeout')throw Error('uncertain network failure');
      if(scenario==='reject')return response({error:{code:132001,message:'secret fake-test-token'}},400);
      return response({messages:[]});
    }) as typeof fetch;
    const result=await sendTrialWelcomeViaMeta(input,config,mocked,now);
    assert.equal(result.status,'unconfirmed');
    assert.equal(calls,1);
    assert.doesNotMatch(JSON.stringify(result),/fake-test-token|password|secret/);
    if(scenario==='reject')assert.equal(result.metaCode,132001);
  }
});

test('can select five-variable Meta template explicitly, never by retrying',async()=>{
  const mocked=(async(_url,init)=>{
    const p=JSON.parse(String(init?.body));
    assert.equal(p.template.components[0].parameters.length,5);
    return response({messages:[{id:'wamid.five'}]});
  }) as typeof fetch;
  assert.equal((await sendTrialWelcomeViaMeta(input,{...config,variableCount:5},mocked,now)).status,'accepted');
  assert.equal((await sendTrialWelcomeViaMeta(input,{...config,variableCount:3},mocked,now)).status,'skipped');
});
