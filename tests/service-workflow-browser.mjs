// Integration test for an isolated production snapshot; never run mutations on live services.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE || '/opt/motomanager-migration-validation-20261105/repo/package.json');
const {chromium}=require('playwright');
const B=process.env.WORKFLOW_VALIDATION_ROOT || '/opt/motomanager-service-workflow-20261111';
const project='mm-workflow-validation';
const inspect=n=>JSON.parse(execFileSync('docker',['inspect',n],{encoding:'utf8'}))[0];
const sql=q=>execFileSync('docker',['exec','-i',project+'-production-db-1','psql','-XqAt','-U','postgres','-d','motomanager','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const scalar=q=>JSON.parse(sql(q));
const web='http://'+inspect(project+'-production-web-1').NetworkSettings.Networks[project+'_private'].IPAddress+':3000';
const gateway='http://'+inspect(project+'-production-gateway-1').NetworkSettings.Networks[project+'_private'].IPAddress+':8000';
const auth=Object.fromEntries(inspect(project+'-production-auth-1').Config.Env.map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1)];}));
const actor=scalar(`SELECT to_jsonb(a) FROM (SELECT u.id,u.email,u.raw_app_meta_data,u.raw_user_meta_data,m.organization_id workshop_id,
 (SELECT id FROM auth.sessions WHERE user_id=u.id ORDER BY created_at DESC LIMIT 1) session_id
 FROM auth.users u JOIN organization_members m ON m.user_id=u.id JOIN organizations o ON o.id=m.organization_id
 WHERE m.role='owner' AND m.status='active' AND coalesce(o.settings->>'trialReviewPaused','false')<>'true'
 AND coalesce(u.raw_user_meta_data->>'needs_password_change','false')<>'true' AND coalesce(u.raw_app_meta_data->>'is_super_admin','false')<>'true'
 AND NOT EXISTS(SELECT 1 FROM motomanager_private.workshop_trial_reviews r WHERE r.organization_id=o.id AND r.status='paused')
 AND NOT EXISTS(SELECT 1 FROM motomanager_private.workshop_trial_claims c WHERE c.organization_id=o.id AND c.converted_at IS NULL AND c.ends_at<=now())
 AND EXISTS(SELECT 1 FROM auth.sessions WHERE user_id=u.id) ORDER BY m.joined_at LIMIT 1) a;`);
assert.ok(actor);
const ids=Object.fromEntries(['customer','motorcycle','order','product','location','tech'].map(k=>[k,crypto.randomUUID()]));
const plate='VT'+ids.order.replaceAll('-','').slice(0,4).toUpperCase();
const sku='TST-FA-'+ids.product.slice(0,4).toUpperCase();
// Keep the selected identity and its existing memberships; fixture contacts never contain a phone/email.
const technician=scalar(`SELECT to_jsonb(user_id) FROM organization_members WHERE organization_id='${actor.workshop_id}' AND role='mechanic' AND status='active' LIMIT 1;`);
assert.ok(technician,'An active mechanic is needed in the restored workshop');ids.tech=technician;
sql(`UPDATE organizations SET settings=(settings || '{"plan":"full"}'::jsonb) WHERE id='${actor.workshop_id}';
 UPDATE profiles SET first_name='Técnico',last_name='Validación',phone=NULL WHERE id='${ids.tech}';
 INSERT INTO customers(id,organization_id,first_name,last_name) VALUES('${ids.customer}','${actor.workshop_id}','Cliente','Validación');
 INSERT INTO motorcycles(id,organization_id,customer_id,license_plate,brand,model) VALUES('${ids.motorcycle}','${actor.workshop_id}','${ids.customer}','${plate}','Moto','Validación');
 INSERT INTO inventory_items(id,organization_id,name,code,unit_price) VALUES('${ids.product}','${actor.workshop_id}','Filtro validación','${sku}',80000);
 INSERT INTO inventory_locations(id,organization_id,name,type) VALUES('${ids.location}','${actor.workshop_id}','Vitrina validación','storefront');
 INSERT INTO inventory_item_stock(item_id,location_id,quantity) VALUES('${ids.product}','${ids.location}',23);
 INSERT INTO work_orders(id,organization_id,customer_id,motorcycle_id,assigned_mechanic_id,status,reported_symptoms)
 VALUES('${ids.order}','${actor.workshop_id}','${ids.customer}','${ids.motorcycle}','${ids.tech}','diagnosis','Prueba aislada de servicio');
 INSERT INTO work_order_services(work_order_id,description,quantity,unit_price,total) VALUES('${ids.order}','Mano de obra validación',1,100000,100000);`);
const orderNumber=scalar(`SELECT to_jsonb(order_number) FROM work_orders WHERE id='${ids.order}';`);
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const now=Math.floor(Date.now()/1000),payload={aud:'authenticated',iss:'https://api.motomanager.com.co/auth/v1',role:'authenticated',sub:actor.id,email:actor.email,iat:now,exp:now+1800,aal:'aal1',session_id:actor.session_id,amr:[{method:'password',timestamp:now}],app_metadata:actor.raw_app_meta_data,user_metadata:actor.raw_user_meta_data};
const unsigned=enc({alg:'HS256',typ:'JWT'})+'.'+enc(payload),token=unsigned+'.'+crypto.createHmac('sha256',auth.GOTRUE_JWT_SECRET).update(unsigned).digest('base64url');
const value='base64-'+enc({access_token:token,refresh_token:'isolated-validation-'+crypto.randomBytes(24).toString('hex'),expires_in:1800,expires_at:now+1800,token_type:'bearer',user:{id:actor.id,email:actor.email,app_metadata:actor.raw_app_meta_data,user_metadata:actor.raw_user_meta_data,aud:'authenticated',role:'authenticated'}});
const cookies=[];for(let i=0;i<Math.ceil(value.length/3180);i++)cookies.push({name:'sb-api-auth-token'+(value.length>3180?'.'+i:''),value:value.slice(i*3180,(i+1)*3180),domain:'motomanager.com.co',path:'/',secure:true,sameSite:'Lax'});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1920,height:1080},locale:'es-CO',timezoneId:'America/Bogota'});
await context.addCookies(cookies);await context.addInitScript(()=>localStorage.setItem('theme','light'));
for(const [origin,target] of [['https://motomanager.com.co',web],['https://api.motomanager.com.co',gateway]])await context.route(origin+'/**',async route=>{
 const req=route.request();try{
  const r=await fetch(req.url().replace(origin,target),{method:req.method(),headers:{...await req.allHeaders(),host:new URL(origin).host,'x-forwarded-host':new URL(origin).host,'x-forwarded-proto':'https','accept-encoding':'identity'},body:['GET','HEAD'].includes(req.method())?undefined:req.postDataBuffer(),redirect:'manual',signal:AbortSignal.timeout(45000)});
  const headers=Object.fromEntries(r.headers);delete headers['content-encoding'];delete headers['content-length'];const cs=r.headers.getSetCookie();if(cs.length)headers['set-cookie']=cs.join('\n');
  if(r.status>=300&&r.status<400&&req.isNavigationRequest()){
   const dest=new URL(r.headers.get('location'),origin).href;await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><script>location.replace('+JSON.stringify(dest).replaceAll('<','\\u003c')+')</script>'});return;
  }
  await route.fulfill({status:r.status,headers,body:Buffer.from(await r.arrayBuffer())});
 }catch{await route.abort().catch(()=>{});}
});
for(const host of ['www.facebook.com','connect.facebook.net','www.googletagmanager.com','www.google-analytics.com','checkout.wompi.co'])await context.route('https://'+host+'/**',r=>r.fulfill({status:204,body:''}));
const page=await context.newPage();page.setDefaultTimeout(30000);
const errors=[],report={isolation:project,productionBusinessWrites:0,scenarios:[],javascriptErrors:errors};
page.on('pageerror',e=>errors.push(e.name+': '+e.message.slice(0,180)));
const orderURL='https://motomanager.com.co/work-orders/'+ids.order;
try{
 await page.goto(orderURL,{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:/WO-/}).first().waitFor();
 await page.getByRole('tab',{name:/Repuestos/}).click();
 const search=page.getByRole('textbox',{name:'Buscar repuesto por nombre o SKU'});
 await search.fill(sku);
 const partForm=search.locator('xpath=ancestor::form');
 await partForm.getByRole('combobox').getByText(/Filtro validación/).waitFor();
 assert.equal(await partForm.locator('input[name="quantity"]').inputValue(),'1');
 await search.press('Enter');assert.equal(await partForm.locator('input[name="quantity"]').evaluate(el=>document.activeElement===el),true);
 await partForm.getByRole('button',{name:'Agregar',exact:true}).click();
 await page.getByText('Filtro validación',{exact:true}).last().waitFor();
 report.scenarios.push('SKU auto-selects and Enter focuses quantity');
 await page.getByRole('tab',{name:/Abonos/}).click();
 const advanceForm=page.locator('form').filter({has:page.getByRole('button',{name:'Sumar abono',exact:true})});
 await advanceForm.locator('input[type="text"]').fill('100000');
 await advanceForm.getByRole('button',{name:'Sumar abono',exact:true}).click();
 await page.getByText('Abono registrado. Se aplicará al facturar el servicio.',{exact:true}).waitFor();
 assert.equal(scalar(`SELECT to_jsonb(sum(total)) FROM sales WHERE work_order_id='${ids.order}' AND is_deposit;`),100000);
 await page.goto('https://motomanager.com.co/sales',{waitUntil:'domcontentloaded'});
 assert.equal(await page.getByText(new RegExp('SALE-AB-'+orderNumber+'-')).count(),0);
 assert.equal(scalar(`SELECT to_jsonb(status) FROM work_orders WHERE id='${ids.order}';`),'diagnosis');
 report.scenarios.push('advance stays in cash and never appears as final sale');
 await page.goto(orderURL,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Cambiar Estado',exact:true}).first().click();
 let dialog=page.getByRole('dialog');await dialog.getByRole('combobox').click();
 assert.deepEqual(await page.getByRole('option').allTextContents(),['Diagnosticando','Reparado']);
 await page.getByRole('option',{name:'Reparado',exact:true}).click();
 await dialog.getByRole('button',{name:'Actualizar Estado',exact:true}).click();
 await dialog.waitFor({state:'hidden'});
 assert.equal(scalar(`SELECT to_jsonb(status) FROM work_orders WHERE id='${ids.order}';`),'completed');
 await page.goto('https://motomanager.com.co/sales',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Venta por Servicio',exact:true}).click();
 dialog=page.getByRole('dialog');await dialog.getByPlaceholder('Ingresa la placa para buscar...').fill(plate);
 await dialog.getByText('Mano de obra validación',{exact:true}).first().waitFor();
 const labor=dialog.getByLabel('Costo Mano de Obra (COP)');await labor.fill('100000');
 assert.equal(await dialog.getByLabel('Abono registrado en la orden (COP)').getAttribute('readonly'),'');
 await dialog.getByRole('button',{name:'Confirmar Pagar',exact:true}).click();
 await page.getByText('TOTAL SERVICIO:',{exact:true}).waitFor();
 const receipt=page.getByRole('dialog');await receipt.getByText('Pagado al finalizar:',{exact:true}).waitFor();
 const invoice=scalar(`SELECT to_jsonb(s) FROM sales s WHERE work_order_id='${ids.order}' AND NOT is_deposit AND status='paid';`);
 assert.equal(Number(invoice.invoice_total),180000);assert.equal(Number(invoice.total),80000);
 assert.equal(scalar(`SELECT to_jsonb(sum(total)) FROM sales WHERE work_order_id='${ids.order}';`),180000);
 assert.equal(scalar(`SELECT to_jsonb(status) FROM work_orders WHERE id='${ids.order}';`),'delivered');
 report.scenarios.push('service invoice shows gross, advance and paid balance and delivers once');
 await page.goto('https://motomanager.com.co/accounting',{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Nómina de Técnicos',exact:true}).click();
 const techSelect=page.locator('select').first();await techSelect.selectOption(ids.tech);
 await page.getByText('Mano de obra validación',{exact:true}).waitFor();
 await page.locator('input[type="number"]').fill('40');await page.locator('#payroll-method').selectOption('transfer');
 await page.getByRole('button',{name:'Registrar Pago',exact:true}).click();
 await page.getByText('Pago de nómina registrado exitosamente.',{exact:true}).waitFor();
 assert.equal(await page.getByText('Mano de obra validación',{exact:true}).count(),0);
 const payroll=scalar(`SELECT to_jsonb(p) FROM payroll_payments p WHERE organization_id='${actor.workshop_id}' AND settlement_version=2 ORDER BY created_at DESC LIMIT 1;`);
 assert.equal(Number(payroll.total_paid),Math.round(Number(payroll.total_services_amount)*40)/100);
 assert.equal(payroll.payment_method,'transfer');
 await page.getByRole('button',{name:'Cierre Diario',exact:true}).click();
 const payrollExpense=page.getByText('Pago de comisiones a Técnico Validación',{exact:true}).last();
 await payrollExpense.waitFor();
 assert.equal(Number((await payrollExpense.locator('..').textContent()).replace(/\D/g,'')),Number(payroll.total_paid));
 report.scenarios.push('daily closing includes the technician payment as an expense');
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Nómina de Técnicos',exact:true}).click();await page.locator('select').first().selectOption(ids.tech);
 await page.getByText('No hay servicios pendientes de pago en este periodo.',{exact:true}).waitFor();
 report.scenarios.push('payroll excludes advances/parts and persists settled services after reload');
 await page.goto('https://motomanager.com.co/work-orders',{waitUntil:'domcontentloaded'});
 for(const width of [1920,1366,390]){
  await page.setViewportSize({width,height:1000});await page.getByRole('heading',{name:'Órdenes de Trabajo',exact:true}).waitFor();
  const dimensions=await page.locator('main').last().evaluate(el=>({width:el.getBoundingClientRect().width,viewport:innerWidth,body:document.documentElement.scrollWidth}));
  assert.ok(dimensions.width>=width-130,JSON.stringify(dimensions));assert.ok(dimensions.body<=width+1,JSON.stringify(dimensions));
  await page.screenshot({path:B+'/work-orders-'+width+'.png',mask:[page.locator('header').first()]});
 }
 report.scenarios.push('responsive pages use available width without body overflow');
 assert.deepEqual(errors,[]);
 fs.writeFileSync(B+'/browser-report.json',JSON.stringify({...report,finishedAt:new Date().toISOString()},null,2));console.log('WORKFLOW_BROWSER_TESTS_PASSED',JSON.stringify(report));
}catch(error){
 await page.screenshot({path:B+'/browser-failure.png',mask:[page.locator('header').first()]}).catch(()=>{});
 console.error('WORKFLOW_BROWSER_FAILURE',error.message,'PATH',new URL(page.url()).pathname,'ERRORS',JSON.stringify(errors));throw error;
}finally{await context.close();await browser.close();}
