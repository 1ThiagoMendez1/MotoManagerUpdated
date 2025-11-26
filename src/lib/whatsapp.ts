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
  items: Array<{ name: string; quantity: number; price: number }>,
  subtotal?: number,
  discountPercentage?: number,
  discountAmount?: number
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

    const discountText = (discountPercentage && discountPercentage > 0) ? `\nDescuento: ${discountPercentage}% (-$${discountAmount?.toLocaleString('es-CO')})` : '';

    const message = `🛍️ *MotoManager - Nueva Venta*

¡Hola ${customerName}!

Tu compra ha sido procesada exitosamente.

📋 *Detalles de la venta:*
Número: ${saleNumber}
${subtotal ? `Subtotal: $${subtotal.toLocaleString('es-CO')}` : `Total: $${total.toLocaleString('es-CO')}`}${discountText}${subtotal ? `\nTotal: $${total.toLocaleString('es-CO')}` : ''}

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
  items?: Array<{ name: string; quantity: number; price: number }>,
  subtotal?: number,
  discountPercentage?: number,
  discountAmount?: number
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

    const discountText = (discountPercentage && discountPercentage > 0) ?
      `\nDescuento: ${discountPercentage}% (-$${discountAmount?.toLocaleString('es-CO')})` : '';

    const subtotalText = subtotal ? `\nSubtotal: $${subtotal.toLocaleString('es-CO')}` : '';

    const message = `🔧 *MotoManager - Servicio Completado*

¡Hola ${customerName}!

Tu motocicleta ${motorcycleInfo.make} ${motorcycleInfo.model} (${motorcycleInfo.plate}) ha sido reparada exitosamente.

📋 *Detalles del servicio:*
Número: ${saleNumber}
Técnico: ${technicianName}${subtotalText}${discountText}${laborText}${itemsText}
Total: $${total.toLocaleString('es-CO')}

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

export async function sendOrderItemAddedNotification(
  customerPhone: string,
  customerName: string,
  orderNumber: string,
  itemName: string,
  quantity: number,
  price: number,
  motorcycleMake: string,
  motorcycleModel: string,
  technicianName: string
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    // Format phone number for WhatsApp (remove + and add country code if needed)
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;

    const total = price * quantity;

    const message = `🔧 *MotoManager - Item Agregado a Orden*

¡Hola ${customerName}!

Se ha agregado un nuevo ítem a tu orden de trabajo.

📋 *Detalles:*
Orden: ${orderNumber}
Motocicleta: ${motorcycleMake} ${motorcycleModel}
Técnico: ${technicianName}

🛒 *Ítem agregado:*
• ${itemName} x${quantity} - $${price.toLocaleString('es-CO')} c/u
Total: $${total.toLocaleString('es-CO')}

Te mantendremos informado sobre el progreso de tu reparación.

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

    console.log('✅ WhatsApp item added notification sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp item added notification via Evolution API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export default {
  sendSaleNotification,
  sendServiceSaleNotification,
  sendOrderStatusUpdate,
  sendOrderItemAddedNotification
};