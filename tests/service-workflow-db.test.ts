import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID as uuid } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

// Disposable schema with the same columns, ownership policies and money types.
const schema = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE TABLE organizations(id uuid PRIMARY KEY);
CREATE TABLE profiles(id uuid PRIMARY KEY);
CREATE TABLE organization_members(organization_id uuid,user_id uuid,role text,status text,custom_permissions jsonb,PRIMARY KEY(organization_id,user_id));
CREATE FUNCTION is_organization_member(org uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=org AND user_id=auth.uid() AND status='active')$$;
CREATE TABLE work_orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,customer_id uuid,order_number integer,status text DEFAULT 'received',quote_status text DEFAULT 'pending',customer_observations text,assigned_mechanic_id uuid,completed_at timestamptz,quote_responded_at timestamptz);
CREATE TABLE sales(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,work_order_id uuid REFERENCES work_orders(id),customer_id uuid,sale_number text,subtotal numeric(12,2) DEFAULT 0,tax_total numeric(12,2) DEFAULT 0,discount_total numeric(12,2) DEFAULT 0,total numeric(12,2) DEFAULT 0,payment_method text,status text DEFAULT 'pending',notes text,created_by uuid,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),UNIQUE(organization_id,sale_number));
CREATE TABLE inventory_items(id uuid PRIMARY KEY,organization_id uuid,name text,unit_price numeric(12,2),track_inventory boolean DEFAULT true);
CREATE TABLE inventory_locations(id uuid PRIMARY KEY,organization_id uuid,type text);
CREATE TABLE inventory_item_stock(id uuid DEFAULT gen_random_uuid(),item_id uuid,location_id uuid,quantity numeric,UNIQUE(item_id,location_id));
CREATE TABLE inventory_movements(id uuid DEFAULT gen_random_uuid(),organization_id uuid,item_id uuid,from_location_id uuid,to_location_id uuid,quantity numeric,movement_type text,reference_id uuid,created_by uuid,notes text);
CREATE TABLE sale_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),sale_id uuid REFERENCES sales(id),item_type text,inventory_item_id uuid,service_id uuid,description text,quantity numeric,unit_price numeric(12,2),total numeric(12,2));
CREATE TABLE work_order_services(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),work_order_id uuid REFERENCES work_orders(id),service_id uuid,description text,quantity numeric DEFAULT 1,unit_price numeric(12,2),total numeric(12,2));
CREATE TABLE payroll_payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,technician_id uuid,period_start timestamptz,period_end timestamptz,total_services_amount numeric(12,2),commission_percentage numeric(5,2),total_paid numeric(12,2),status text,created_by uuid,created_at timestamptz DEFAULT now());
CREATE TABLE part_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid,work_order_id uuid,inventory_item_id uuid,quantity numeric,status text DEFAULT 'pending',fulfilled_by uuid,fulfilled_at timestamptz);
GRANT USAGE ON SCHEMA public,auth TO authenticated,service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated,service_role;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_scope ON work_orders FOR ALL USING(is_organization_member(organization_id));
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_scope ON sales FOR ALL USING(is_organization_member(organization_id));
CREATE FUNCTION decrement_inventory(p_item_id uuid,p_amount numeric,p_location_id uuid DEFAULT NULL,p_sale_id uuid DEFAULT NULL,p_user_id uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE org uuid;
BEGIN
 SELECT organization_id INTO org FROM inventory_items WHERE id=p_item_id;
 UPDATE inventory_item_stock SET quantity=quantity-p_amount WHERE item_id=p_item_id AND location_id=p_location_id AND quantity>=p_amount;
 IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
 INSERT INTO inventory_movements(organization_id,item_id,from_location_id,quantity,movement_type,reference_id,created_by) VALUES(org,p_item_id,p_location_id,p_amount,'sale',p_sale_id,p_user_id);
END $$;
`;

test('service checkout, cash advances, inventory and technician settlements are transactional',async t=>{
  const db = new PGlite();
  const org=uuid(), otherOrg=uuid(), user=uuid(), tech=uuid(), product=uuid(), location=uuid(), foreignProduct=uuid();
  const start='2026-11-01T05:00:00Z', end='2026-12-01T05:00:00Z', date='2026-11-10T15:00:00Z';
  const scalar=async(sql:string,args:any[]=[])=>Object.values((await db.query<any>(sql,args)).rows[0])[0] as any;
  const query=async(sql:string,args:any[]=[]) => (await db.query<any>(sql,args)).rows;
  const order=async(status='diagnosis') => {
    const id=uuid();await db.query('INSERT INTO work_orders(id,organization_id,order_number,assigned_mechanic_id,status) VALUES($1,$2,150,$3,$4)',[id,org,tech,status]);return id;
  };
  const advance=(id:string,amount:number,req=uuid(),mode='add')=>scalar('SELECT record_work_order_advance($1,$2,$3,$4,$5,$6)',[org,id,amount,mode,'cash',req]);
  const close=(id:string,labor:number,items:any[]=[],req=uuid(),method='cash')=>scalar('SELECT finalize_work_order_service_sale($1,$2,$3,0,$4,$5,$6,$7)',[org,id,labor,method,date,JSON.stringify(items),req]);
  const parts=(id:string,action:string,item:string|null=null,qty:number|null=null,line:string|null=null,quote:string|null=null)=>scalar('SELECT change_work_order_parts($1,$2,$3,$4,$5,$6,$7)',[org,id,action,item,qty,line,quote]);
  const pending=()=>query('SELECT * FROM pending_technician_services($1,$2,$3,$4)',[org,tech,start,end]);
  const settle=(ids:string[],req=uuid(),pct=40)=>scalar('SELECT settle_technician_services($1,$2,$3,$4,$5,$6,$7,$8)',[org,tech,start,end,pct,'transfer',ids,req]);
  try {
    await db.exec(schema);
    await db.query('INSERT INTO organizations VALUES($1),($2)',[org,otherOrg]);
    await db.query('INSERT INTO profiles VALUES($1),($2)',[user,tech]);
    await db.query("INSERT INTO organization_members VALUES($1,$2,'owner','active',NULL),($1,$3,'mechanic','active',NULL)",[org,user,tech]);
    await db.query("INSERT INTO inventory_items VALUES($1,$2,'Filtro',80000,true),($3,$4,'Otro taller',20000,true)",[product,org,foreignProduct,otherOrg]);
    await db.query("INSERT INTO inventory_locations VALUES($1,$2,'storefront')",[location,org]);
    await db.query('INSERT INTO inventory_item_stock(item_id,location_id,quantity) VALUES($1,$2,23)',[product,location]);
    // Existing AB movements and text-only advances are classified without changing their cash amounts.
    const legacy=await order();
    await db.query("UPDATE work_orders SET customer_observations='Abono registrado: 100000' WHERE id=$1",[legacy]);
    await db.query("INSERT INTO sales(organization_id,work_order_id,sale_number,total,status,notes) VALUES($1,$2,'AB-150-0144',100000,'paid','Abono de orden #150')",[org,legacy]);
    await db.exec(await readFile(new URL('../supabase/migrations/20261111042449_service_checkout_deposits_payroll.sql',import.meta.url),'utf8'));
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);
    await db.exec('SET ROLE authenticated');
    await t.test('migration preserves advances, and advance-only orders cannot deliver or generate commissions',async()=>{
      assert.equal(Number(await scalar('SELECT deposit_amount FROM work_orders WHERE id=$1',[legacy])),100000);
      assert.equal(await scalar('SELECT is_deposit FROM sales WHERE work_order_id=$1',[legacy]),true);
      await assert.rejects(()=>db.query("UPDATE work_orders SET status='delivered' WHERE id=$1",[legacy]),/venta por servicio/);
      await assert.rejects(()=>close(legacy,100000),/Reparado/);
      assert.equal((await pending()).length,0);
    });
    const id=await order();
    await t.test('advance requests replay once; insufficient stock rolls the whole invoice back',async()=>{
      const request=uuid();await advance(id,100000,request);await advance(id,100000,request);
      assert.equal(Number(await scalar('SELECT deposit_amount FROM work_orders WHERE id=$1',[id])),100000);
      assert.equal(Number(await scalar('SELECT count(*) FROM sales WHERE work_order_id=$1',[id])),1);
      await db.query("UPDATE work_orders SET status='completed' WHERE id=$1",[id]);
      await assert.rejects(()=>close(id,100000,[{inventoryItemId:product,quantity:99,price:80000}]),/Stock insuficiente/);
      assert.equal(Number(await scalar('SELECT quantity FROM inventory_item_stock WHERE item_id=$1',[product])),23);
      assert.equal(await scalar('SELECT status FROM work_orders WHERE id=$1',[id]),'completed');
      assert.equal(Number(await scalar('SELECT count(*) FROM sales WHERE work_order_id=$1 AND NOT is_deposit',[id])),0);
    });
    let invoice:any;
    await t.test('final invoice uses registered advances once and scales labor lines to charged labor',async()=>{
      await db.query("INSERT INTO work_order_services(work_order_id,description,quantity,unit_price,total) VALUES($1,'Motor',1,60000,60000),($1,'Frenos',1,60000,60000)",[id]);
      const req=uuid(); invoice=await close(id,100000,[{inventoryItemId:product,quantity:1,price:80000}],req);
      assert.equal(Number(invoice.invoice_total),180000);assert.equal(Number(invoice.total),80000);assert.equal(Number(invoice.deposit_amount),100000);
      assert.equal(await scalar('SELECT status FROM work_orders WHERE id=$1',[id]),'delivered');
      assert.equal(Number(await scalar('SELECT sum(total) FROM sales WHERE work_order_id=$1',[id])),180000);
      assert.equal(Number(await scalar('SELECT quantity FROM inventory_item_stock WHERE item_id=$1',[product])),22);
      assert.equal((await close(id,100000,[],req)).id,invoice.id);
      assert.equal((await close(id,999999)).id,invoice.id);
      assert.equal(Number(await scalar("SELECT sum(total) FROM sale_items WHERE sale_id=$1 AND item_type='service'",[invoice.id])),100000);
      await assert.rejects(()=>db.query("UPDATE work_orders SET status='diagnosis' WHERE id=$1",[id]),/ya fue entregada/);
      await assert.rejects(()=>db.query("UPDATE sale_items SET total=1 WHERE sale_id=$1",[invoice.id]),/facturada/);
    });
    await t.test('payroll recomputes labor only and excludes already paid services across overlapping periods',async()=>{
      const work=await pending(); assert.equal(work.length,2);assert.equal(work.reduce((n,i)=>n+Number(i.total),0),100000);
      await assert.rejects(()=>settle([work[0].id]),/pendientes cambiaron/);
      const req=uuid(),payment=await settle(work.map(i=>i.id),req);
      assert.equal(Number(payment.total_services_amount),100000);assert.equal(Number(payment.total_paid),40000);assert.equal(payment.payment_method,'transfer');
      assert.equal((await pending()).length,0);
      assert.equal((await settle(work.map(i=>i.id),req)).id,payment.id);
      await assert.rejects(()=>settle(work.map(i=>i.id)),/No hay servicios/);
      await assert.rejects(()=>db.query('UPDATE payroll_payments SET total_paid=1 WHERE id=$1',[payment.id]),/no puede cambiar/);
      await db.query("UPDATE payroll_payments SET status='cancelled' WHERE id=$1",[payment.id]);
      assert.equal((await pending()).length,2);
      await settle(work.map(i=>i.id));
      await assert.rejects(()=>db.query("UPDATE payroll_payments SET status='paid' WHERE id=$1",[payment.id]),/duplicate key/);
    });
    await t.test('approved parts are not deducted again; remove/re-add and repeated approval reconcile stock',async()=>{
      const w=await order();
      await parts(w,'add',product,1);await parts(w,'quote',null,null,null,'approved');
      assert.equal(Number(await scalar('SELECT quantity FROM inventory_item_stock WHERE item_id=$1',[product])),21);
      await parts(w,'quote',null,null,null,'approved');
      assert.equal(Number(await scalar('SELECT quantity FROM inventory_item_stock WHERE item_id=$1',[product])),21);
      const line=await scalar('SELECT si.id FROM sale_items si JOIN sales s ON s.id=si.sale_id WHERE s.work_order_id=$1',[w]);
      await parts(w,'remove',null,null,line);
      assert.equal(Number(await scalar('SELECT quantity FROM inventory_item_stock WHERE item_id=$1',[product])),22);
      await parts(w,'add',product,1);await db.query("UPDATE work_orders SET status='completed' WHERE id=$1",[w]);
      await close(w,50000,[{inventoryItemId:product,quantity:1,price:80000}]);
      assert.equal(Number(await scalar('SELECT quantity FROM inventory_item_stock WHERE item_id=$1',[product])),21);
    });
    await t.test('an incomplete browser cart cannot omit parts already recorded in the order',async()=>{
      const w=await order();await parts(w,'add',product,1);
      await db.query("UPDATE work_orders SET status='completed' WHERE id=$1",[w]);
      await assert.rejects(()=>close(w,50000),/Faltan repuestos/);
      assert.equal(await scalar('SELECT status FROM work_orders WHERE id=$1',[w]),'completed');
    });
    await t.test('Wompi pending checkout delivers only when paid; inventory and service-only orders work',async()=>{
      const w=await order('completed');const sale=await close(w,50000,[],uuid(),'wompi');
      assert.equal(sale.status,'pending');assert.equal(await scalar('SELECT status FROM work_orders WHERE id=$1',[w]),'completed');
      assert.equal((await close(w,50000)).id,sale.id);
      await db.query("UPDATE sales SET status='paid' WHERE id=$1",[sale.id]);
      assert.equal(await scalar('SELECT status FROM work_orders WHERE id=$1',[w]),'delivered');
    });
    await t.test('cross-workshop items/orders and mechanic payroll actions are rejected',async()=>{
      const w=await order('completed');
      await assert.rejects(()=>close(w,100,[{inventoryItemId:foreignProduct,quantity:1,price:1}]),/no pertenece/);
      await assert.rejects(()=>scalar('SELECT record_work_order_advance($1,$2,10,\'add\',\'cash\',$3)',[otherOrg,w,uuid()]),/permiso/);
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[tech]);
      await assert.rejects(pending,/Acceso denegado/);
      await assert.rejects(()=>advance(w,10),/permiso/);
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);
    });
    await t.test('historical payments cover only old invoices; future work in the same period remains payable',async()=>{
      const before = await pending();
      const w=await order('completed');
      const sale=await scalar("INSERT INTO sales(organization_id,work_order_id,total) VALUES($1,$2,999) RETURNING id",[org,w]);
      await db.query("INSERT INTO sale_items(sale_id,item_type,description,quantity,unit_price,total) VALUES($1,'service','Legado',1,999,999)",[sale]);
      await db.query("UPDATE sales SET sale_number='VS-LEGACY',status='paid',created_at=$2 WHERE id=$1",[sale,date]);
      assert.equal((await pending()).length,before.length+1);
      await db.query("INSERT INTO payroll_payments(organization_id,technician_id,period_start,period_end,total_services_amount,commission_percentage,total_paid,status) VALUES($1,$2,$3,$4,999,10,99.9,'paid')",[org,tech,start,end]);
      assert.equal((await pending()).length,before.length);
    });
  } finally { await db.close(); }
});
