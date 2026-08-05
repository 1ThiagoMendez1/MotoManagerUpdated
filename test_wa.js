const axios = require('axios');
const token = 'EAASiM1cWnToBSOwZBe1zG9rVIo56UlWIDR9lB4ey3vTO37Vb4F45NcC3uLJHk3Uh9LMHJELXcghBbUyiHJpOMiZATDseZCi1N7QK2NTdBz01hcnYny5yafZAkb31KVgJzrwTZAICp7QvGvddgNy7kxrwIoTsOSwqrIq6yGUHBKDtwtSSY2oiq9Qfto0ws6FilRgZDZD';
const phoneId = '1165753569963531';
const phone = '573000000000';

async function run() {
  const baseParams = [
    { type: 'text', text: 'Juan' },
    { type: 'text', text: 'Moto' },
    { type: 'text', text: 'AAA123' },
    { type: 'text', text: 'Taller' },
    { type: 'text', text: 'Cambio aceite' },
    { type: 'text', text: '2026' },
    { type: 'text', text: 'Mantenimiento' },
    { type: 'text', text: 'Calle 1' },
    { type: 'text', text: 'Taller' },
    { type: 'text', text: 'Extra param 10' }
  ];
  try {
    const url = 'https://graph.facebook.com/v19.0/' + phoneId + '/messages';
    const res = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: 'recordatorio_clientes',
          language: { code: 'es_CO' },
          components: [
            {
              type: 'header',
              parameters: [ { type: 'text', text: 'header text' } ]
            },
            {
              type: 'body',
              parameters: baseParams
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(res.data);
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
