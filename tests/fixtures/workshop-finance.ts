// Disposable PostgreSQL fixture shared by financial integration tests.
export const schema = `
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
