import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const migration = '../supabase/migrations/20261109150531_subscription_wompi_checkout.sql';

test('Wompi checkout activates only verified payments atomically and preserves trial verification', async t => {
  const db = new PGlite();
  const scalar = async (sql: string,args: any[] = []) => Object.values((await db.query<any>(sql,args)).rows[0])[0] as any;
  const ref = () => 'MM-SUB-'+randomUUID().replaceAll('-','');
  const user = randomUUID(), employee = randomUUID(), other = randomUUID();
  const email = 'owner@example.test';
  const quote = (reference: string, org: string, plan='full', cycle='monthly', amount=11990000, actor=user, payer=email) => scalar('SELECT create_workshop_subscription_checkout($1,$2,$3,$4,$5,$6,$7)',[reference,org,actor,plan,cycle,amount,payer]);
  const apply = (reference: string, transaction='transaction-1', status='APPROVED', amount=11990000, currency='COP',payer=email) => scalar('SELECT apply_workshop_subscription_payment($1,$2,$3,$4,$5,$6,$7)',[reference,transaction,status,amount,currency,payer,'PSE']);
  const settings = (org: string) => scalar('SELECT settings FROM organizations WHERE id=$1',[org]);
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT null::uuid$$;
      CREATE TABLE public.organizations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,slug text,email text,phone text,legal_name text,tax_identifier text,status text DEFAULT 'active',settings jsonb DEFAULT '{}');
      CREATE TABLE public.organization_members(organization_id uuid REFERENCES organizations(id),user_id uuid REFERENCES auth.users(id),role text,status text);
      CREATE TABLE public.profiles(id uuid PRIMARY KEY,phone text);
      CREATE FUNCTION public.create_organization_with_owner(text,text,text,text,text,text,text,text,text) RETURNS uuid LANGUAGE sql AS $$SELECT gen_random_uuid()$$;
      GRANT USAGE ON SCHEMA public,auth TO service_role,authenticated,anon;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
    await db.exec(await readFile(new URL('../supabase/migrations/20261030014156_workshop_full_trial.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL(migration,import.meta.url),'utf8'));
    await db.query('INSERT INTO auth.users VALUES($1,$2),($3,$4),($5,$6)',[user,email,employee,'employee@example.test',other,'other@example.test']);
    const org = randomUUID(), otherOrg = randomUUID();
    await db.query("INSERT INTO organizations(id,name,settings) VALUES($1,'Fixture',jsonb_build_object('plan','full','isTrial',true,'paidAmount',0,'business_hours','preserved')),($2,'Other','{}')",[org,otherOrg]);
    await db.query("INSERT INTO organization_members VALUES($1,$2,'owner','active'),($1,$3,'mechanic','active'),($4,$5,'owner','active')",[org,user,employee,otherOrg,other]);
    await db.query("INSERT INTO motomanager_private.workshop_trial_claims(organization_id,user_id,email,phone,ends_at) VALUES($1,$2,$3,'573001234567',now()+interval '7 days')",[org,user,email]);
    const reference = ref();
    await t.test('only server-side authorized workshop owners/admins can create or inspect checkouts',async()=>{
      for (const role of ['anon','authenticated']) {
        await db.exec('SET ROLE '+role);
        await assert.rejects(()=>quote(reference,org),/permission denied/);
        await assert.rejects(()=>db.query('SELECT * FROM motomanager_private.workshop_subscription_checkouts'),/permission denied/);
        await assert.rejects(()=>scalar('SELECT admin_list_workshop_subscription_payments()'),/permission denied/);
        await assert.rejects(()=>apply(reference),/permission denied/);
        await db.exec('RESET ROLE');
      }
      await db.exec('SET ROLE service_role');
      await assert.rejects(()=>quote(reference,org,'full','monthly',11990000,employee,'employee@example.test'),/owner or administrator/);
      await assert.rejects(()=>quote(reference,otherOrg),/owner or administrator/);
      await assert.rejects(()=>quote(reference,org,'full','monthly',11990000,user,'wrong@example.test'),/owner or administrator/);
      const created = await quote(reference,org);
      assert.equal(created.plan,'full'); assert.equal(created.amount_in_cents,11990000);
      assert.equal((await quote(ref(),org)).reference,reference);
      assert.equal(await scalar('SELECT get_workshop_subscription_checkout($1,$2)',[reference,otherOrg]),null);
    });
    await t.test('pending and declined payments are visible to admin but grant no paid access',async()=>{
      await apply(reference,'transaction-1','PENDING');
      assert.equal((await settings(org)).isTrial,true);
      await apply(reference,'transaction-1','DECLINED');
      await apply(reference,'transaction-1','PENDING');
      assert.equal((await scalar('SELECT get_workshop_subscription_checkout($1)',[reference])).status,'DECLINED');
      const history = (await db.query<any>('SELECT * FROM admin_list_workshop_subscription_payments()')).rows;
      assert.equal(history[0].status,'DECLINED'); assert.equal(history[0].plan,'full'); assert.equal(history[0].cycle,'monthly');
      assert.equal((await settings(org)).paidAmount,0);
    });
    await t.test('wrong amount/currency/email/unknown reference cannot activate a plan',async()=>{
      for (const args of [[100,'COP',email],[11990000,'USD',email],[11990000,'COP','other@example.test']] as [number,string,string][]) {
        await assert.rejects(()=>apply(reference,'transaction-1','APPROVED',...args),/does not match/);
      }
      await assert.rejects(()=>apply(ref()),/Unknown checkout/);
      assert.equal((await settings(org)).isTrial,true);
    });
    await t.test('approval ends trial, keeps unused days/settings and duplicate webhook/return leaves dates unchanged',async()=>{
      await apply(reference);
      const paid = await settings(org);
      assert.equal(paid.isTrial,false); assert.equal(paid.plan,'full'); assert.equal(paid.billingCycle,'monthly'); assert.equal(paid.paidAmount,119900);
      assert.equal(paid.business_hours,'preserved');
      const expected = await scalar("SELECT now()+interval '1 month'+interval '7 days'");
      assert.ok(Math.abs(Date.parse(paid.endDate)-new Date(expected).getTime())<3000);
      await apply(reference); await apply(reference,'transaction-1','PENDING');
      assert.equal((await settings(org)).endDate,paid.endDate);
      assert.equal(await scalar('SELECT count(*)::int FROM motomanager_private.workshop_subscription_payments'),1);
      assert.equal((await db.query<any>('SELECT * FROM admin_list_workshop_subscription_payments()')).rows.filter(p=>p.wompi_transaction_id==='transaction-1').length,1);
      await assert.rejects(()=>apply(reference,'transaction-2'),/already paid/);
    });
    await t.test('semester and year activate the chosen product and calendar period',async()=>{
      for (const [cycle,months,plan,amount] of [['biannual',6,'pro',43146000],['yearly',12,'basic',47904000]] as const) {
        const reference = ref(); await quote(reference,org,plan,cycle,amount);
        await apply(reference,'transaction-'+cycle,'APPROVED',amount);
        const config = await settings(org);
        assert.equal(config.plan,plan); assert.equal(config.billingCycle,cycle);
        const expected = await scalar(`SELECT now()+interval '${months} months'`);
        assert.ok(Math.abs(Date.parse(config.endDate)-new Date(expected).getTime())<3000);
      }
    });
    await t.test('a review prevents new purchases and is never removed by an in-flight payment',async()=>{
      const reference = ref(); await quote(reference,org,'full','yearly',115104000);
      await db.query("UPDATE organizations SET settings=settings||'{\"trialReviewPaused\":true}' WHERE id=$1",[org]);
      await assert.rejects(()=>quote(ref(),org),/Trial under review/);
      await apply(reference,'transaction-review','APPROVED',115104000);
      assert.equal((await settings(org)).trialReviewPaused,true);
      assert.equal((await settings(org)).plan,'full');
    });
  } finally { await db.close(); }
});
