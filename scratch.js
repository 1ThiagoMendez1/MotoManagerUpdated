const axios = require('axios');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
const wpToken = lines.find(l => l.startsWith('WHATSAPP_API_TOKEN')).split('=')[1].trim().replace(/['"]/g, '');
const wpPhoneId = lines.find(l => l.startsWith('WHATSAPP_PHONE_NUMBER_ID')).split('=')[1].trim().replace(/['"]/g, '');

const toPhone = '573183101859';
const workshopName = 'Taller la 90';
const orderNumber = '1329';
const motorcycleInfo = 'Susuki Gixxer 150';
const plate = 'BHF764';
const formattedTotal = '400.000';
const formattedItemsList = '• Cambio de aceite ×1 — $80.000   • Filtro de aceite ×1 — $25.000   • Pastillas de freno ×1 — $95.000';
const motoAndPlate = `${motorcycleInfo} - ${plate}`;

async function testPayload(payload, index, langCode = 'es_CO') {
  try {
    const components = [];
    if (payload.header) {
      components.push({
        type: 'header',
        parameters: payload.header
      });
    }
    components.push({
      type: 'body',
      parameters: payload.body
    });

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: toPhone,
        type: 'template',
        template: {
          name: 'venta_por_orden',
          language: { code: langCode },
          components
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${wpToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`✅ Success for option ${index} (lang=${langCode}):`, response.data);
    return true;
  } catch (err) {
    console.log(`❌ Option ${index} (lang=${langCode}) failed:`, JSON.stringify(err.response?.data || err.message));
    return false;
  }
}

const customerName = 'Diego Mendez';

async function run() {
  const payloads = [
    // Variant 1: Header (1), Body (7) - with $ in total
    {
      header: [{ type: 'text', text: workshopName }],
      body: [
        { type: 'text', text: customerName },
        { type: 'text', text: orderNumber },
        { type: 'text', text: motorcycleInfo },
        { type: 'text', text: plate },
        { type: 'text', text: `$${formattedTotal}` },
        { type: 'text', text: formattedItemsList },
        { type: 'text', text: workshopName }
      ]
    },
    // Variant 2: Header (1), Body (7) - without $ in total
    {
      header: [{ type: 'text', text: workshopName }],
      body: [
        { type: 'text', text: customerName },
        { type: 'text', text: orderNumber },
        { type: 'text', text: motorcycleInfo },
        { type: 'text', text: plate },
        { type: 'text', text: formattedTotal },
        { type: 'text', text: formattedItemsList },
        { type: 'text', text: workshopName }
      ]
    }
  ];

  for (const lang of ['es_CO']) {
    for (let i = 0; i < payloads.length; i++) {
      const success = await testPayload(payloads[i], i + 1, lang);
      if (success) return;
    }
  }
}

run();
