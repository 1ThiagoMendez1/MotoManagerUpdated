
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const WOMPI_API_URL = 'https://sandbox.wompi.co/v1/plans';

const plans = [
  {
    name: "Plan Mensual - MotoManager",
    description: "Suscripción mensual al software MotoManager",
    amount_in_cents: 2990000, // Ajusta este valor (29,900 COP)
    currency: "COP",
    interval: "MONTH",
    interval_count: 1
  },
  {
    name: "Plan Semestral - MotoManager",
    description: "Suscripción semestral al software MotoManager",
    amount_in_cents: 16000000, // Ajusta este valor (160,000 COP)
    currency: "COP",
    interval: "MONTH",
    interval_count: 6
  },
  {
    name: "Plan Anual - MotoManager",
    description: "Suscripción anual al software MotoManager",
    amount_in_cents: 30000000, // Ajusta este valor (300,000 COP)
    currency: "COP",
    interval: "YEAR",
    interval_count: 1
  }
];

async function createPlan(plan, privateKey) {
  const response = await fetch(WOMPI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${privateKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(plan)
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error(`Error creando el plan ${plan.name}:`, data);
    return null;
  }
  
  return data.data.id;
}

rl.question('Por favor ingresa tu Llave Privada de Sandbox de Wompi (empieza con prv_test_...): ', async (privateKey) => {
  if (!privateKey || !privateKey.startsWith('prv_')) {
    console.log('Llave no válida. Asegúrate de copiar la Llave Privada de tu dashboard de Wompi.');
    rl.close();
    return;
  }

  console.log('\nCreando planes en Wompi (Sandbox)...\n');

  const monthlyId = await createPlan(plans[0], privateKey);
  const biannualId = await createPlan(plans[1], privateKey);
  const yearlyId = await createPlan(plans[2], privateKey);

  console.log('--------------------------------------------------');
  console.log('¡Planes creados con éxito! Copia y pega las siguientes variables en tu archivo .env:');
  console.log('--------------------------------------------------');
  console.log(`WOMPI_PRIVATE_KEY=${privateKey}`);
  console.log(`WOMPI_PLAN_MONTHLY_ID=${monthlyId || 'ERROR'}`);
  console.log(`WOMPI_PLAN_BIANNUAL_ID=${biannualId || 'ERROR'}`);
  console.log(`WOMPI_PLAN_YEARLY_ID=${yearlyId || 'ERROR'}`);
  console.log('--------------------------------------------------');
  
  rl.close();
});
