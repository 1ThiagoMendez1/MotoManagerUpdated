import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID as uuid} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {schema} from './fixtures/workshop-finance';

test('part profitability pins costs, allocates discounts, protects accounting data and reports stock rotation',async t=>{
  const db=new PGlite();const org=uuid(),foreignOrg=uuid(),owner=uuid(),mechanic=uuid(),outsider=uuid(),location=uuid();
  const product=uuid(),estimate=uuid(),unknown=uuid(),free=uuid(),idle=uuid();
  const scalar=async(sql:string,args:any[]=[])=>Object.values((await db.query<any>(sql,args)).rows[0])[0] as any;
  const report=(query='',estimates=false,sort='profit',page=1,limit=25)=>scalar('SELECT workshop_parts_profitability($1,$2,$3,$4,$5,$6,$7,$8)',[org,'2026-11-01','2026-11-30',query,sort,estimates,page,limit]);
  const sale=async(items:{item:string;qty:number;price:number;type?:string}[],discount=0,status='paid',date='2026-11-10T15:00:00Z',number=uuid())=>{
    const id=await scalar('INSERT INTO sales(organization_id,sale_number,status,discount_total,created_at,total) VALUES($1,$2,$3,$4,$5,0) RETURNING id',[org,number,status,discount,date]);
    for(const item of items)await db.query('INSERT INTO sale_items(sale_id,item_type,inventory_item_id,description,quantity,unit_price,total) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,item.type||'inventory',item.type==='service'?null:item.item,'Fixture',item.qty,item.price,item.qty*item.price]);
    return id;
  };
  const purchase=async(item:string,cost:number,date:string)=>{
    const id=uuid();await db.query("INSERT INTO purchases(id,organization_id,status,updated_at) VALUES($1,$2,'received',$3)",[id,org,date]);
    await db.query('INSERT INTO purchase_items(purchase_id,item_id,quantity,unit_cost) VALUES($1,$2,10,$3)',[id,item,cost]);
    await db.query("INSERT INTO inventory_movements(organization_id,item_id,to_location_id,quantity,movement_type,reference_id,created_at) VALUES($1,$2,$3,10,'purchase',$4,$5)",[org,item,location,id,date]);
  };
  try{
    await db.exec(schema+`CREATE SCHEMA motomanager_private;
      ALTER TABLE inventory_items ADD COLUMN last_cost numeric(12,2) DEFAULT 0, ADD COLUMN code text,ADD COLUMN category text,ADD COLUMN status text DEFAULT 'active',ADD COLUMN min_quantity numeric DEFAULT 0;
      ALTER TABLE inventory_movements ADD COLUMN created_at timestamptz DEFAULT now();
      CREATE TABLE purchases(id uuid PRIMARY KEY,organization_id uuid,status text,updated_at timestamptz);
      CREATE TABLE purchase_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),purchase_id uuid REFERENCES purchases(id),item_id uuid REFERENCES inventory_items(id),quantity numeric,unit_cost numeric);
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated,service_role;`);
    await db.query('INSERT INTO organizations VALUES($1),($2)',[org,foreignOrg]);
    await db.query('INSERT INTO profiles VALUES($1),($2),($3)',[owner,mechanic,outsider]);
    await db.query("INSERT INTO organization_members VALUES($1,$2,'owner','active',NULL),($1,$3,'mechanic','active',NULL),($4,$5,'owner','active',NULL)",[org,owner,mechanic,foreignOrg,outsider]);
    await db.query("INSERT INTO inventory_locations VALUES($1,$2,'storefront')",[location,org]);
    for(const [id,name,cost,stock] of [[product,'Filtro',70000,50],[estimate,'Bujía',30000,20],[unknown,'Sin costo',0,10],[free,'Bonificado',0,12],[idle,'Sin salida',20000,30]] as const){
      await db.query('INSERT INTO inventory_items(id,organization_id,name,code,unit_price,last_cost) VALUES($1,$2,$3,$3,80000,$4)',[id,org,name,cost]);
      await db.query('INSERT INTO inventory_item_stock(item_id,location_id,quantity) VALUES($1,$2,$3)',[id,location,stock]);
    }
    await db.exec(await readFile(new URL('../supabase/migrations/20261111042449_service_checkout_deposits_payroll.sql',import.meta.url),'utf8'));
    await purchase(product,50000,'2026-11-01T10:00:00Z');await purchase(product,70000,'2026-11-09T10:00:00Z');
    await purchase(free,0,'2026-11-01T10:00:00Z');
    const old=await sale([{item:product,qty:1,price:80000},{item:estimate,qty:1,price:50000},{item:unknown,qty:1,price:10000}],0,'paid','2026-11-04T15:00:00Z');
    const baseline=await scalar("SELECT jsonb_build_object('sales',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM sales s),'lines',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM sale_items s),'stock',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM inventory_item_stock s))");
    await db.exec(await readFile(new URL('../supabase/migrations/20261111193529_parts_profitability_cost_snapshots.sql',import.meta.url),'utf8'));
    await t.test('migration changes only private metadata and separates historical evidence, estimates and missing costs',async()=>{
      assert.deepEqual(await scalar("SELECT jsonb_build_object('sales',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM sales s),'lines',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM sale_items s),'stock',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM inventory_item_stock s))"),baseline);
      const rows=(await db.query<any>('SELECT c.unit_cost,c.source,si.inventory_item_id FROM motomanager_private.part_sale_costs c JOIN sale_items si ON si.id=c.sale_item_id')).rows;
      assert.equal(Number(rows.find(r=>r.inventory_item_id===product).unit_cost),50000);
      assert.equal(rows.find(r=>r.inventory_item_id===product).source,'purchase_history');
      assert.equal(rows.find(r=>r.inventory_item_id===estimate).source,'legacy_estimate');
      assert.equal(rows.find(r=>r.inventory_item_id===unknown).unit_cost,null);
    });
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('SET ROLE authenticated');
    await t.test('recorded costs and historical estimates are never silently combined',async()=>{
      const recorded=await report();assert.equal(recorded.summary.revenue,140000);assert.equal(recorded.summary.profit,30000);assert.equal(recorded.summary.costed_units,1);
      assert.equal(recorded.summary.estimated_units,1);assert.equal(recorded.summary.missing_units,1);
      assert.equal(recorded.rows.find((r:any)=>r.item_id===estimate).profit,null);
      const withEstimates=await report('',true);assert.equal(withEstimates.summary.profit,50000);assert.equal(withEstimates.summary.costed_units,2);
      assert.equal(withEstimates.rows.find((r:any)=>r.item_id===estimate).profit,20000);
    });
    await t.test('future direct sales allocate a header discount across inventory and labor; later costs do not rewrite profits',async()=>{
      await db.query('UPDATE inventory_items SET last_cost=50000 WHERE id=$1',[product]);
      const id=await sale([{item:product,qty:2,price:80000},{item:'',qty:1,price:40000,type:'service'}],20000);
      let row=(await report('Filtro')).rows[0];assert.equal(row.revenue,224000);assert.equal(row.cost_total,150000);assert.equal(row.profit,74000);
      await db.query('UPDATE inventory_items SET last_cost=100000 WHERE id=$1',[product]);
      row=(await report('Filtro')).rows[0];assert.equal(row.cost_total,150000);assert.equal(row.profit,74000);
      assert.equal(await scalar('SELECT count(*)::int FROM motomanager_private.part_sale_costs c JOIN sale_items si ON si.id=c.sale_item_id WHERE si.sale_id=$1',[id]),1);
    });
    await t.test('service checkout discounts only parts, preserves prepaid money and records costs atomically',async()=>{
      await db.query('UPDATE inventory_items SET last_cost=50000 WHERE id=$1',[product]);
      const w=uuid();await db.query("INSERT INTO work_orders(id,organization_id,order_number,status) VALUES($1,$2,160,'completed')",[w,org]);
      await scalar("SELECT record_work_order_advance($1,$2,50000,'add','cash',$3)",[org,w,uuid()]);
      const invoice=await scalar('SELECT finalize_work_order_service_sale($1,$2,40000,25,\'cash\',$3,$4,$5)',[org,w,'2026-11-10T15:00:00Z',JSON.stringify([{inventoryItemId:product,quantity:1,price:80000}]),uuid()]);
      assert.equal(Number(invoice.invoice_total),100000);assert.equal(Number(invoice.total),50000);
      const row=(await report('Filtro')).rows[0];assert.equal(row.units,4);assert.equal(row.revenue,284000);assert.equal(row.profit,84000);
      assert.equal(await scalar('SELECT count(*)::int FROM motomanager_private.part_sale_costs c JOIN sale_items si ON si.id=c.sale_item_id JOIN sales s ON s.id=si.sale_id WHERE s.is_deposit'),0);
    });
    await t.test('free documented inventory has a known zero cost; pending/refunded invoices and unissued drafts are excluded',async()=>{
      const id=await sale([{item:free,qty:1,price:10000}]);let row=(await report('Bonificado')).rows[0];assert.equal(row.cost_total,0);assert.equal(row.profit,10000);assert.equal(row.margin,100);
      await db.query("UPDATE sales SET status='refunded' WHERE id=$1",[id]);assert.equal((await report('Bonificado')).rows[0].units,0);
      await sale([{item:product,qty:10,price:80000}],0,'pending');assert.equal((await report('Filtro')).rows[0].units,4);
      await sale([{item:product,qty:20,price:80000}],0,'pending','2026-11-10T15:00:00Z',null as any);assert.equal((await report('Filtro')).rows[0].units,4);
    });
    await t.test('rotation includes units without costs and current stock; search, sorting and pagination are scoped',async()=>{
      await sale([{item:unknown,qty:8,price:10000}]);const r=await report('',false,'quantity',1,2);
      assert.equal(r.top_rotating[0].item_id,unknown);assert.equal(r.rows.length,2);assert.equal(r.total_pages,3);assert.equal(r.summary.idle_items,2);
      const row=(await report('Filtro')).rows[0];assert.equal(row.daily_units,0.13);assert.equal(row.coverage_days,367.5);assert.equal(row.stock,49);
      assert.equal((await report('SIN SALIDA')).rows[0].units,0);assert.equal((await report('does-not-exist')).rows.length,0);
      await assert.rejects(()=>scalar("SELECT workshop_parts_profitability($1,'2026-01-01','2027-02-01')",[org]),/366 días/);
      await assert.rejects(()=>report('',false,'drop table sales'),/Filtros inválidos/);
    });
    await t.test('accounting snapshots and reports cannot be read/rewritten by mechanics, outsiders or anonymous clients',async()=>{
      await assert.rejects(()=>db.query('UPDATE motomanager_private.part_sale_costs SET unit_cost=1'),/permission denied/);
      await assert.rejects(()=>scalar("SELECT workshop_parts_profitability($1,'2026-11-01','2026-11-30')",[foreignOrg]),/No tienes acceso/);
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[mechanic]);
      assert.equal(await scalar('SELECT count(*)::int FROM motomanager_private.part_sale_costs'),0);
      await assert.rejects(report,/No tienes acceso/);
      await assert.rejects(()=>scalar('SELECT motomanager_private.part_cost_basis($1,$2,now(),false)',[org,product]),/permission denied/);
      await db.exec('RESET ROLE; SET ROLE anon');await assert.rejects(report,/permission denied/);await db.exec('RESET ROLE');
    });
  }finally{await db.close();}
});
