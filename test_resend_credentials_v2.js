const axios = require('axios');
const fs = require('fs');

// Cargar variables de entorno del archivo .env
const env = fs.readFileSync('.env', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/['"]/g, '');
    if (key && !key.startsWith('#')) {
      envVars[key] = val;
    }
  }
});

const wpToken = envVars['WHATSAPP_API_TOKEN'];
const wpPhoneId = envVars['WHATSAPP_PHONE_NUMBER_ID'];

async function sendCredentialsNotification(
  customerPhone,
  customerName,
  workshopName,
  workshopSlug,
  email,
  setupUrl,
  tempPassword,
  role
) {
  const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;
  
  const roleLabels = {
    owner: 'Dueño',
    admin: 'Administrador',
    mechanic: 'Tecnico',
    service_advisor: 'Recepcionista',
    receptionist: 'Recepcionista'
  };
  const roleDisplay = roleLabels[role || 'mechanic'] || 'Tecnico';
  
  const dateObj = new Date();
  const formattedDate = `${dateObj.getDate()}-${dateObj.getMonth() + 1}-${dateObj.getFullYear()}`;

  if (wpToken && wpPhoneId) {
    try {
      console.log(`Sending template 'registros_manuales_de_talleres' to ${formattedPhone} via Meta Cloud API (5 params)...`);
      
      const components = [
        {
          type: 'header',
          parameters: [{ type: 'text', text: 'MotoManager' }]
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: roleDisplay },        // {{1}} -> Rol (ej. "Tecnico")
            { type: 'text', text: workshopName },       // {{2}} -> Taller
            { type: 'text', text: roleDisplay },        // {{3}} -> Rol (ej. "Tecnico")
            { type: 'text', text: formattedDate },      // {{4}} -> Inicio de acceso (ej. "27-7-2026")
            { type: 'text', text: workshopName }        // {{5}} -> Taller
          ]
        }
      ];

      const response = await axios.post(
        `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: 'registros_manuales_de_talleres',
            language: { code: 'es_CO' },
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
      console.log(`✅ registros_manuales_de_talleres template sent successfully (Meta).`);
      return { success: true, provider: 'meta', data: response.data };
    } catch (metaErr) {
      const lastMetaError = metaErr.response?.data?.error?.message || metaErr.message;
      console.error('❌ Error sending WhatsApp credentials notification via Meta API:', lastMetaError);
      return { success: false, error: lastMetaError };
    }
  }
  return { success: false, error: 'WP credentials not configured' };
}

async function execute() {
  const result = await sendCredentialsNotification(
    '3183101859', // Teléfono de prueba
    'Carlos Contreras',
    'Aguilas Doradas',
    'gold-aguilas',
    'Contreras@gmail.com',
    'http://localhost:3000/login',
    '469414',
    'mechanic'
  );
  console.log('Result:', JSON.stringify(result, null, 2));
}

execute();
