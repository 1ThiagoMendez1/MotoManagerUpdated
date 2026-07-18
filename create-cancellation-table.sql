create table if not exists public.cancellation_feedback (
  id uuid primary key default uuid_generate_v4(),
  workshop_id uuid references public.workshops(id) on delete cascade not null,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  reason_code text not null,
  reason_label text not null,
  status text default 'pending',
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.cancellation_feedback enable row level security;

-- Policy to allow authenticated users to insert their own feedback
create policy "Users can insert their own feedback" on public.cancellation_feedback
  for insert with check (auth.uid() = user_id);

-- Policy to allow users to view their own feedback
create policy "Users can view own feedback" on public.cancellation_feedback
  for select using (auth.uid() = user_id);

-- Policy to allow super admins to view all feedback
create policy "Super Admins view all cancellations" on public.cancellation_feedback
  AS PERMISSIVE FOR ALL
  TO authenticated
  USING (public.is_super_admin());

