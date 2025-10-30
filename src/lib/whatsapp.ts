import axios from 'axios';

const evolutionApiUrl = process.env.EVOLUTION_API_URL;
const evolutionApiKey = process.env.EVOLUTION_API_KEY;
const whatsappInstance = process.env.EVOLUTION_INSTANCE_NAME;

if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
  console.warn('Evolution API credentials not configured. WhatsApp notifications will be disabled.');
}

export async function sendSaleNotification(
  customerPhone: string,
  customerName: string,
  saleNumber: string,
  total: number,
  items: Array<{ name: string; quantity: number; price: number }>
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    // Format phone number for WhatsApp (remove + and add country code if needed)
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;

    const itemsText = items.map(item =>
      `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-CO')}`
    ).join('\n');

    const message = `🛍️ *MotoManager - Nueva Venta*

¡Hola ${customerName}!

Tu compra ha sido procesada exitosamente.

📋 *Detalles de la venta:*
Número: ${saleNumber}
Total: $${total.toLocaleString('es-CO')}

🛒 *Productos:*
${itemsText}

¡Gracias por tu preferencia! Si tienes alguna duda, no dudes en contactarnos.

🏍️ *Águilas de Asfalto*`;

    const response = await axios.post(
      `${evolutionApiUrl}/message/sendText/${whatsappInstance}`,
      {
        number: formattedPhone,
        text: message,
        delay: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey
        }
      }
    );

    console.log('✅ WhatsApp notification sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp notification via Evolution API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendServiceSaleNotification(
  customerPhone: string,
  customerName: string,
  saleNumber: string,
  total: number,
  motorcycleInfo: { make: string; model: string; plate: string },
  technicianName: string,
  laborCost?: number,
  items?: Array<{ name: string; quantity: number; price: number }>
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    // Format phone number for WhatsApp (remove + and add country code if needed)
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;

    let itemsText = '';
    if (items && items.length > 0) {
      itemsText = '\n\n🛒 *Repuestos utilizados:*\n' +
        items.map(item =>
          `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-CO')}`
        ).join('\n');
    }

    const laborText = laborCost ? `\nMano de obra: $${laborCost.toLocaleString('es-CO')}` : '';

    const message = `🔧 *MotoManager - Servicio Completado*

¡Hola ${customerName}!

Tu motocicleta ${motorcycleInfo.make} ${motorcycleInfo.model} (${motorcycleInfo.plate}) ha sido reparada exitosamente.

📋 *Detalles del servicio:*
Número: ${saleNumber}
Técnico: ${technicianName}
Total: $${total.toLocaleString('es-CO')}${laborText}${itemsText}

✅ *Estado:* Entregado

¡Gracias por confiar en nosotros! Tu motocicleta está lista para recoger.

🏍️ *Águilas de Asfalto*`;

    const response = await axios.post(
      `${evolutionApiUrl}/message/sendText/${whatsappInstance}`,
      {
        number: formattedPhone,
        text: message,
        delay: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey
        }
      }
    );

    console.log('✅ WhatsApp service notification sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp service notification via Evolution API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendOrderStatusUpdate(
  customerPhone: string,
  orderData: {
    orderNumber: string;
    status: 'Diagnosticando' | 'Reparado' | 'Entregado';
    customerName: string;
    motorcycleInfo: string;
    technicianName: string;
  }
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    // Format phone number for WhatsApp (remove + and add country code if needed)
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;

    const statusEmojis = {
      'Diagnosticando': '🔍',
      'Reparado': '🔧',
      'Entregado': '✅'
    };

    const statusMessages = {
      'Diagnosticando': 'está siendo diagnosticada',
      'Reparado': 'ha sido reparada',
      'Entregado': 'está lista para recoger'
    };

    const message = `${statusEmojis[orderData.status]} *MotoManager - Actualización de Orden*

¡Hola ${orderData.customerName}!

Tu motocicleta ${orderData.motorcycleInfo} ${statusMessages[orderData.status]}.

📋 *Detalles:*
Orden: ${orderData.orderNumber}
Estado: ${orderData.status}
Técnico: ${orderData.technicianName}

Te mantendremos informado sobre cualquier actualización.

🏍️ *Águilas de Asfalto*`;

    const response = await axios.post(
      `${evolutionApiUrl}/message/sendText/${whatsappInstance}`,
      {
        number: formattedPhone,
        text: message,
        delay: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey
        }
      }
    );

    console.log('✅ WhatsApp order status update sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp order status update via Evolution API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export default {
  sendSaleNotification,
  sendServiceSaleNotification,
  sendOrderStatusUpdate
};