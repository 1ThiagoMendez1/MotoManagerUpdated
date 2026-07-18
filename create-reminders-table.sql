-- Tabla para gestionar recordatorios automáticos
create table public.reminders (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete cascade not null,
  motorcycle_id uuid references public.motorcycles(id) on delete cascade not null,
  service_type text not null, -- Ej: "Mantenimiento General", "Cambio de Aceite"
  due_date timestamp with time zone not null,
  status text default 'pending', -- 'pending', 'sent', 'cancelled'
  sent_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.reminders enable row level security;

drop policy if exists "Tenant isolation for reminders" on public.reminders;
create policy "Tenant isolation for reminders" on public.reminders
  using (workshop_id in (select get_my_workshop_ids()));
