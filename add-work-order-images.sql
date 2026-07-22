-- 1. Create table for work order images (evidences)
create table if not exists public.work_order_images (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  work_order_id uuid references public.work_orders(id) on delete cascade not null,
  image_url text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.work_order_images enable row level security;

-- 3. Create Tenant Isolation Policy
drop policy if exists "Tenant isolation for work_order_images" on public.work_order_images;
create policy "Tenant isolation for work_order_images" on public.work_order_images
  for all using (workshop_id in (select public.get_my_workshop_ids()));

-- Note: In Supabase Storage, create a public bucket named "evidences".
-- You can run the following SQL to insert the bucket if the storage schema exists:
insert into storage.buckets (id, name, public)
values ('evidences', 'evidences', true)
on conflict (id) do nothing;

-- Create basic access policies for the bucket (public read, authenticated insert)
-- Anyone can view the images
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'evidences' );

-- Authenticated users can insert
create policy "Auth Insert" 
on storage.objects for insert 
with check ( bucket_id = 'evidences' and auth.role() = 'authenticated' );

-- Authenticated users can update/delete their uploads
create policy "Auth Update Delete" 
on storage.objects for all 
using ( bucket_id = 'evidences' and auth.role() = 'authenticated' );
