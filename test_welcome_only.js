const axios = require('axios');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/['"]/g, '');
    if (key && !key.startsWith('#')) envVars[key] = val;
  }
});

const wpToken = envVars['WHATSAPP_API_TOKEN'];
const wpPhoneId = envVars['WHATSAPP_PHONE_NUMBER_ID'];

async function main() {
  const phone = '573183101859';
  const workshopName = 'Aguilas Doradas';
  const roleDisplay = 'Técnico';
  const dateObj = new Date();
  const formattedDate = `${String(dateObj.getDate()).padStart(2,'0')}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${dateObj.getFullYear()}`;

  // 1. Enviar código primero (abre ventana de conversación)
  console.log('1. Enviando código de acceso...');
  try {
    const codeRes = await axios.post(
      `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: 'codigo_de_acceso',
          language: { code: 'es_CO' },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: '123456' }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: '123456' }] }
          ]
        }
      },
      { headers: { 'Authorization': `Bearer ${wpToken}`, 'Content-Type': 'application/json' } }
    );
    console.log('✅ Código enviado:', codeRes.data.messages[0].message_status);
  } catch (e) {
    console.error('❌ Código falló:', e.response?.data?.error?.message);
  }

  // 2. Esperar 2 seg para que se abra la ventana
  console.log('⏳ Esperando 2 segundos...');
  await new Promise(r => setTimeout(r, 2000));

  // 3. Enviar bienvenida como texto plano
  console.log('2. Enviando bienvenida como texto plano...');
  const welcomeText = `¡Bienvenido a MotoManager! 🏍️

🎉 Nos alegra darte la bienvenida. Tu cuenta como ${roleDisplay} ha sido creada exitosamente para el taller ${workshopName}. Ya puedes ingresar a consultar tus apartados disponibles.

🏍️ Taller: ${workshopName}
🔧 Tu rol asignado: ${roleDisplay}
📅 Inicio de acceso: ${formattedDate}

🔑 ¿Cómo ingresar?
📧 Usuario: Tu correo electrónico registrado.
🌐 Ingresa a la plataforma y asigna tu contraseña en tu primer acceso.

💭 Si tienes alguna duda o necesitas ayuda, estaremos encantados de apoyarte.

¡Bienvenido a ${workshopName}! 🏍️ 🛣️🛣️
Equipo MotoManager`;

  try {
    const textRes = await axios.post(
      `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: welcomeText }
      },
      { headers: { 'Authorization': `Bearer ${wpToken}`, 'Content-Type': 'application/json' } }
    );
    console.log('✅ BIENVENIDA enviada:', textRes.data.messages[0].message_status);
  } catch (e) {
    console.error('❌ Bienvenida falló:', e.response?.data?.error?.message);
  }

  console.log('\n>>> REVISA WHATSAPP - deben llegar AMBOS mensajes <<<');
}

main();
