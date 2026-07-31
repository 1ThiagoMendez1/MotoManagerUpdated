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
    mechanic: 'Técnico',
    service_advisor: 'Recepcionista',
    receptionist: 'Recepcionista'
  };
  const roleDisplay = roleLabels[role || 'mechanic'] || 'Técnico';
  
  const dateObj = new Date();
  const formattedDate = `${dateObj.getDate()}-${dateObj.getMonth() + 1}-${dateObj.getFullYear()}`;

  const payloadsToTry = [
    // Opción 2 corregida: Con header (workshopName), y los 6 parámetros del cuerpo en orden correcto
    {
      description: "Con header (workshopName), 6 params en body ordenados",
      header: [{ type: 'text', text: workshopName }],
      body: [
        { type: 'text', text: roleDisplay },        // {{1}} -> Rol (ej. "Técnico")
        { type: 'text', text: workshopName },       // {{2}} -> Taller (ej. "Camila motors")
        { type: 'text', text: workshopName },       // {{3}} -> Taller
        { type: 'text', text: roleDisplay },        // {{4}} -> Rol
        { type: 'text', text: formattedDate },      // {{5}} -> Fecha
        { type: 'text', text: workshopName }        // {{6}} -> Taller
      ]
    }
  ];

  if (wpToken && wpPhoneId) {
    for (const config of payloadsToTry) {
      try {
        console.log(`Intentando: ${config.description}...`);
        const components = [];
        if (config.header) {
          components.push({
            type: 'header',
            parameters: config.header
          });
        }
        components.push({
          type: 'body',
          parameters: config.body
        });

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
        console.log(`✅ ¡ÉXITO! Funciona con la configuración: ${config.description}`);
        return { success: true, provider: 'meta', config: config.description, data: response.data };
      } catch (metaErr) {
        const lastMetaError = metaErr.response?.data?.error?.message || metaErr.message;
        console.error(`❌ Falló con ${config.description}:`, lastMetaError);
      }
    }
    return { success: false, error: 'Todas las combinaciones fallaron' };
  }
  return { success: false, error: 'WP credentials not configured' };
}

async function sendAccessCodeNotification(
  phone,
  tempPassword
) {
  const formattedPhone = phone.replace('+', '').startsWith('57') ? phone.replace('+', '') : `57${phone.replace('+', '')}`;

  const postCodePayload = (includeButtonParam, buttonType) => {
    const components = [
      {
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: tempPassword
          }
        ]
      }
    ];

    if (includeButtonParam) {
      if (buttonType === 'url') {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            {
              type: 'text',
              text: tempPassword
            }
          ]
        });
      } else if (buttonType === 'otp') {
        components.push({
          type: 'button',
          sub_type: 'copy_code',
          index: '0',
          parameters: [
            {
              type: 'coupon_code',
              coupon_code: tempPassword
            }
          ]
        });
      }
    }

    return {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'codigo_de_acceso',
        language: {
          code: 'es_CO'
        },
        components
      }
    };
  };

  const codePayloadsToTry = [
    { includeButtonParam: true, buttonType: 'otp', description: "OTP copy_code button" },
    { includeButtonParam: true, buttonType: 'url', description: "URL button" },
    { includeButtonParam: false, buttonType: 'none', description: "No button param" }
  ];

  for (const config of codePayloadsToTry) {
    try {
      console.log(`Intentando código con: ${config.description}...`);
      const response = await axios.post(
        `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
        postCodePayload(config.includeButtonParam, config.buttonType),
        {
          headers: {
            'Authorization': `Bearer ${wpToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`✅ ¡ÉXITO CÓDIGO! Funciona con: ${config.description}`);
      return { success: true, config: config.description, data: response.data };
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      console.error(`❌ Falló código con ${config.description}:`, errMsg);
    }
  }
  return { success: false, error: 'Todas las combinaciones de código fallaron' };
}

async function execute() {
  console.log("--- PROBANDO CREDENCIALES ---");
  const resultCreds = await sendCredentialsNotification(
    '3183101859',
    'Carlos Contreras',
    'Aguilas Doradas',
    'gold-aguilas',
    'Contreras@gmail.com',
    'http://localhost:3000/login',
    '469414',
    'mechanic'
  );
  
  console.log("\n--- PROBANDO CÓDIGO DE ACCESO ---");
  const resultCode = await sendAccessCodeNotification('3183101859', '469414');
}

execute();
