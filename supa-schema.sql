-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 0. CLEANUP (For re-running script)
drop table if exists public.sale_items cascade;
drop table if exists public.sales cascade;
drop table if exists public.work_orders cascade;
drop table if exists public.tecnicos_activos cascade;
drop table if exists public.inventory_items cascade;
drop table if exists public.motorcycles cascade;
drop table if exists public.clientes cascade;
drop table if exists public.workshop_members cascade;
drop table if exists public.user_profiles cascade;
drop table if exists public.workshops cascade;

-- 1. WORKSHOPS & SUBSCRIPTIONS
drop type if exists subscription_plan cascade;
drop type if exists subscription_status cascade;
create type subscription_plan as enum ('free', 'pro', 'enterprise');
create type subscription_status as enum ('active', 'past_due', 'canceled', 'trialing');

create table public.workshops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  subscription_plan subscription_plan default 'free',
  subscription_status subscription_status default 'trialing',
  subscription_end_date timestamp with time zone
);

-- 2. USER PROFILES (Sync with auth.users via trigger)
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. WORKSHOP MEMBERS (Many-to-Many for Users <-> Workshops)
drop type if exists workshop_role cascade;
create type workshop_role as enum ('owner', 'admin', 'mechanic', 'receptionist');

create table public.workshop_members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  role workshop_role default 'mechanic',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, workshop_id)
);

-- 4. APP ENTITIES (Multi-tenant)

-- Enums
drop type if exists inventory_category cascade;
drop type if exists appointment_status cascade;
drop type if exists work_order_status cascade;
create type inventory_category as enum ('Lubricantes', 'Repuestos', 'Llantas', 'Accesorios');
create type appointment_status as enum ('Programada', 'Completada', 'Cancelada');
create type work_order_status as enum ('Diagnosticando', 'Reparado', 'Entregado');

-- Customers
create table public.clientes (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  email text,
  name text not null,
  phone text,
  cedula text,
  is_frequent boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workshop_id, email), 
  unique(workshop_id, cedula) 
);

-- Motorcycles
create table public.motorcycles (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  customer_id uuid references public.clientes(id) on delete cascade not null,
  make text not null,
  model text not null,
  year int not null,
  plate text not null,
  color text,
  vin text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workshop_id, plate)
);

-- Inventory
create table public.inventory_items (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  name text not null,
  sku text,
  quantity int default 0,
  price numeric(10,2) not null, 
  cost numeric(10,2) default 0, 
  min_quantity int default 5,
  location text,
  category inventory_category default 'Repuestos',
  supplier text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(workshop_id, sku)
);

-- Technicians
create table public.tecnicos_activos (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  name text not null,
  specialty text,
  avatar_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Work Orders
create table public.work_orders (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  work_order_number serial, 
  motorcycle_id uuid references public.motorcycles(id) on delete cascade not null,
  technician_id uuid references public.tecnicos_activos(id) on delete set null,
  issue_description text,
  solution_description text,
  deposit_amount numeric(10,2) default 0,
  status work_order_status default 'Diagnosticando',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- Sales
create table public.sales (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  sale_number text, -- Changed to text to support 'V' and 'VS' prefixes
  customer_id uuid references public.clientes(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  total numeric(10,2) not null,
  payment_method text default 'Efectivo',
  date timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sale Items
create table public.sale_items (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  sale_id uuid references public.sales(id) on delete cascade not null,
  inventory_item_id uuid references public.inventory_items(id) on delete restrict, 
  quantity int not null,
  price numeric(10,2) not null 
);


-- 5. FUNCTION & TRIGGER: Handle New User
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger could exist, drop if exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 6. RLS POLICIES (Multi-tenancy Magic)

-- Enable RLS
alter table public.workshops enable row level security;
alter table public.workshop_members enable row level security;
alter table public.user_profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.motorcycles enable row level security;
alter table public.inventory_items enable row level security;
alter table public.tecnicos_activos enable row level security;
alter table public.work_orders enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

-- Helper function
create or replace function get_my_workshop_ids()
returns setof uuid as $$
  select workshop_id from public.workshop_members where user_id = auth.uid()
$$ language sql security definer;

-- Policies

-- User Profiles
drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile" on public.user_profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile" on public.user_profiles
  for update using (auth.uid() = id);

-- Workshops
drop policy if exists "Members can view their workshops" on public.workshops;
create policy "Members can view their workshops" on public.workshops
  for select using (id in (select get_my_workshop_ids()));

-- Workshop Members
drop policy if exists "Members can view team" on public.workshop_members;
create policy "Members can view team" on public.workshop_members
  for select using (workshop_id in (select get_my_workshop_ids()));

-- Generic Policies

drop policy if exists "Tenant isolation for customers" on public.clientes;
create policy "Tenant isolation for customers" on public.clientes
  using (workshop_id in (select get_my_workshop_ids()));

drop policy if exists "Tenant isolation for motorcycles" on public.motorcycles;
create policy "Tenant isolation for motorcycles" on public.motorcycles
  using (workshop_id in (select get_my_workshop_ids()));

drop policy if exists "Tenant isolation for inventory" on public.inventory_items;
create policy "Tenant isolation for inventory" on public.inventory_items
  using (workshop_id in (select get_my_workshop_ids()));

drop policy if exists "Tenant isolation for technicians" on public.tecnicos_activos;
create policy "Tenant isolation for technicians" on public.tecnicos_activos
  using (workshop_id in (select get_my_workshop_ids()));

drop policy if exists "Tenant isolation for work_orders" on public.work_orders;
create policy "Tenant isolation for work_orders" on public.work_orders
  using (workshop_id in (select get_my_workshop_ids()));

drop policy if exists "Tenant isolation for sales" on public.sales;
create policy "Tenant isolation for sales" on public.sales
  using (workshop_id in (select get_my_workshop_ids()));

drop policy if exists "Tenant isolation for sale_items" on public.sale_items;
create policy "Tenant isolation for sale_items" on public.sale_items
  using (workshop_id in (select get_my_workshop_ids()));

-- 7. STORAGE (Manual Setup Required)
-- Note: Create a bucket named 'avatars' in the Supabase Dashboard -> Storage section.
-- Policies for storage are managed there or via API, but basic public access is typical.

