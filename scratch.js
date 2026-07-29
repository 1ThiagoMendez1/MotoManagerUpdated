const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
const supabaseUrl = lines.find(l => l.startsWith('NEXT_PUBLIC_SUPABASE_URL')).split('=')[1].trim().replace(/['"]/g, '');
const supabaseKey = lines.find(l => l.startsWith('SUPABASE_SERVICE_ROLE_KEY')).split('=')[1].trim().replace(/['"]/g, '');

const supabase = createClient(supabaseUrl, supabaseKey);

async function getMotorcycles() {
  const { data } = await supabase.from('motorcycles').select('*, customers(*)');
  return data.map((m) => ({
    id: m.id,
    make: m.brand || '',
    model: m.model || '',
    plate: m.license_plate || '',
    intakeDate: m.created_at,
    customer: { name: m.customers ? `${m.customers.first_name} ${m.customers.last_name}` : 'Unknown' }
  }));
}

async function getWorkOrders() {
  const { data } = await supabase.from('work_orders').select('*, motorcycles(*), customers(*), sales(id, status)');
  return data.map((wo) => {
    const hasCompletedSale = wo.sales && wo.sales.some((s) => s.status === 'paid');
    return {
      id: wo.id,
      motorcycle: wo.motorcycles ? { id: wo.motorcycles.id } : null,
      createdDate: wo.created_at,
      status: hasCompletedSale || wo.status === 'delivered' ? 'Entregado' : 'Reparado',
    };
  });
}

async function run() {
  const motorcycles = await getMotorcycles();
  const workOrders = await getWorkOrders();

  // Simulate registering a new motorcycle (Case A)
  motorcycles.push({
    id: 'new-moto-id',
    make: 'Yamaha',
    model: 'R6',
    plate: 'YAM123',
    intakeDate: new Date().toISOString(),
    customer: { name: 'New Customer' }
  });

  // Simulate re-registering an existing motorcycle (Case D)
  // Let's modify Auteco Mu82 (GBH432) intakeDate to now
  const mu82 = motorcycles.find(m => m.plate === 'GBH432');
  if (mu82) {
    mu82.intakeDate = new Date().toISOString();
  }

  const activeWorkOrders = workOrders.filter((wo) => wo.status !== 'Entregado');

  const filtered = motorcycles.filter((moto) => {
    const hasActive = activeWorkOrders.some((wo) => wo.motorcycle?.id === moto.id);
    if (hasActive) return false;

    const motoWorkOrders = workOrders.filter((wo) => wo.motorcycle?.id === moto.id);
    if (motoWorkOrders.length === 0) return true;

    const latestWoDate = new Date(Math.max(...motoWorkOrders.map(wo => new Date(wo.createdDate).getTime())));
    return new Date(moto.intakeDate).getTime() > latestWoDate.getTime();
  });

  console.log('--- Motorcycles in Dropdown under Simulation ---');
  for (const m of filtered) {
    console.log(`- ${m.make} ${m.model} (${m.plate})`);
  }
}

run();
