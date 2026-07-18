-- Migración: Módulo de Gestión de Tickets (Soporte Taller -> Super Admin)
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- Limpiar tablas si existen para evitar conflictos en la corrección
drop table if exists public.ticket_messages cascade;
drop table if exists public.tickets cascade;
drop type if exists ticket_status cascade;

create type ticket_status as enum ('Pendiente', 'En Revisión', 'Finalizado');

-- Tabla Principal de Tickets
create table if not exists public.tickets (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  created_by uuid references public.user_profiles(id) on delete set null,
  
  subject text not null,
  description text not null,
  status ticket_status default 'Pendiente',
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Historial/Mensajes del Ticket (Opcional, si queremos que Super Admin y Taller chateen)
create table if not exists public.ticket_messages (
  id uuid primary key default uuid_generate_v4(),
  ticket_id uuid references public.tickets(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete set null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;

-- Políticas de Seguridad (RLS) para Talleres (Solo ven/crean sus tickets)
drop policy if exists "Tenant isolation for tickets" on public.tickets;
create policy "Tenant isolation for tickets" on public.tickets 
  using (workshop_id in (select get_my_workshop_ids()));

drop policy if exists "Tenant isolation for ticket_messages" on public.ticket_messages;
create policy "Tenant isolation for ticket_messages" on public.ticket_messages 
  using (ticket_id in (select id from public.tickets));

-- Políticas para el Super Admin (Los admins pueden ver y modificar todo)
-- Asumimos que los Super Admins están en una tabla de roles o tienen RLS by-pass, 
-- pero añadimos políticas de lectura/escritura globales si el rol es admin.
-- Dado que la arquitectura base puede estar usando la Service Role Key para operaciones admin,
-- el RLS "Tenant isolation" es suficiente para los clientes del taller.
