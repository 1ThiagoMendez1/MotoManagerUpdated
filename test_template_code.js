import 'dotenv/config';
import axios from 'axios';

async function test() {
  const wpToken = process.env.WHATSAPP_API_TOKEN;
  const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const phone = '573138379207';
  const tempPassword = '123456';

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'codigo_de_acceso',
      language: { code: 'es_CO' },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: tempPassword }]
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: tempPassword }]
        }
      ]
    }
  };

  try {
    const res = await axios.post('https://graph.facebook.com/v19.0/' + wpPhoneId + '/messages', payload, {
      headers: {
        Authorization: 'Bearer ' + wpToken,
        'Content-Type': 'application/json'
      }
    });
    console.log('SUCCESS:', res.data);
  } catch(e) {
    console.log('ERROR:', JSON.stringify(e.response?.data || e.message, null, 2));
  }
}
test();
