
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const sql = \
    CREATE TABLE IF NOT EXISTS public.cancellation_feedback (
      id uuid default gen_random_uuid() primary key,
      workshop_id uuid not null references public.organizations(id) on delete cascade,
      user_id uuid not null references public.profiles(id) on delete cascade,
      reason_code text not null,
      reason_label text not null,
      status text not null default 'pending',
      admin_notes text,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
    );
  \;
  
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('Error (might be expected if no rpc):', error.message);
  } else {
    console.log('Success:', data);
  }
}
run();

