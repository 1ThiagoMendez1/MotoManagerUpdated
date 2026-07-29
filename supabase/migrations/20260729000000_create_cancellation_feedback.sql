CREATE TABLE public.cancellation_feedback (
  id uuid default gen_random_uuid() primary key,
  workshop_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason_code text not null,
  reason_label text not null,
  status text not null default 'pending',
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

ALTER TABLE public.cancellation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert for authenticated users" ON public.cancellation_feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow admin read all" ON public.cancellation_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin update all" ON public.cancellation_feedback FOR UPDATE TO authenticated USING (true);
