import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fmvnbolaowazqyzmkccv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtdm5ib2xhb3dhenF5em1rY2N2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzYwOTI1MSwiZXhwIjoyMDk5MTg1MjUxfQ.KCYDD4UShe79LAdNA9fvnCnpCRHEw0NFfPM89wpN3n0';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function check() {
  const { data: workshops } = await supabaseAdmin.from('workshops').select('id, name').ilike('name', '%motas%');
  console.log('Workshops:', workshops);

  if (workshops && workshops.length > 0) {
    const workshopId = workshops[0].id;
    const { count: workOrdersCount } = await supabaseAdmin.from('work_orders').select('*', { count: 'exact' }).eq('workshop_id', workshopId);
    console.log('Total work orders:', workOrdersCount);
    
    const { count: salesCount } = await supabaseAdmin.from('sales').select('*', { count: 'exact' }).eq('workshop_id', workshopId);
    console.log('Total sales:', salesCount);

    const { count: activeWorkOrders } = await supabaseAdmin.from('work_orders').select('*', { count: 'exact' }).eq('workshop_id', workshopId).neq('status', 'Entregado');
    console.log('Active work orders (not Entregado):', activeWorkOrders);
  }
}

check().catch(console.error);
