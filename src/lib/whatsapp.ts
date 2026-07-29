import axios from 'axios';
import { ai } from '@/ai/genkit';

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
  discountAmount?: number,
  workshopName?: string
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

🏍️ *${workshopName || 'MotoManager'}*`;

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
  discountAmount?: number,
  workshopName?: string
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

🏍️ *${workshopName || 'MotoManager'}*`;

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
    items?: Array<{ name: string; quantity: number; price: number }>;
    workshopName?: string;
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

    let itemsText = '';
    if (orderData.status === 'Reparado' && orderData.items && orderData.items.length > 0) {
      itemsText = '\n\n🛒 *Repuestos utilizados:*\n' +
        orderData.items.map(item =>
          `• ${item.name} x${item.quantity}`
        ).join('\n');
    }

    const message = `${statusEmojis[orderData.status]} *MotoManager - Actualización de Orden*

¡Hola ${orderData.customerName}!

Tu motocicleta ${orderData.motorcycleInfo} ${statusMessages[orderData.status]}.

📋 *Detalles:*
Orden: ${orderData.orderNumber}
Estado: ${orderData.status}
Técnico: ${orderData.technicianName}${itemsText}

Te mantendremos informado sobre cualquier actualización.

🏍️ *${orderData.workshopName || 'MotoManager'}*`;

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

export async function sendQuoteNotification(
  customerPhone: string,
  customerName: string,
  workshopName: string,
  workOrderId: string,
  portalUrl: string,
  orderNumber?: string,
  technicianName?: string
) {
  const wpToken = process.env.WHATSAPP_API_TOKEN;
  const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Si no están configuradas las variables de Meta, intentamos usar Evolution API como fallback
  if (!wpToken || !wpPhoneId) {
    console.log('WhatsApp Cloud API no configurada, se requiere WHATSAPP_API_TOKEN y WHATSAPP_PHONE_NUMBER_ID.');
    return { success: false, error: 'WhatsApp API no configurada' };
  }

  try {
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'resultado_de_diagnostico',
          language: {
            code: 'es_CO' // Asegúrate de que este código coincida con el de tu plantilla (ej. es_MX, es_CO, es)
          },
          components: [
            {
              type: 'header',
              parameters: [
                { type: 'text', text: '🎉' }
              ]
            },
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName || 'Cliente' },
                { type: 'text', text: workshopName || 'nuestro taller' },
                { type: 'text', text: orderNumber || workOrderId.substring(0, 8) }
              ]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: "0",
              parameters: [
                {
                  type: 'text',
                  text: `/${workOrderId}`
                }
              ]
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${wpToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ WhatsApp quote notification sent via Meta API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp quote notification via Meta API:', error.response?.data || error.message);
    
    // Si el error es por el botón (a veces la plantilla no tiene variable en la URL configurada)
    if (error.response?.data?.error?.message?.includes('button')) {
      console.log('Reintentando sin el componente del botón...');
      try {
        const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;
        const retryResponse = await axios.post(
          `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'template',
            template: {
              name: 'resultado_de_diagnostico',
              language: { code: 'es_CO' },
              components: [
                {
                  type: 'header',
                  parameters: [
                    { type: 'text', text: '🎉' }
                  ]
                },
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: customerName || 'Cliente' },
                    { type: 'text', text: workshopName || 'nuestro taller' },
                    { type: 'text', text: orderNumber || workOrderId.substring(0, 8) }
                  ]
                }
              ]
            }
          },
          {
            headers: { 'Authorization': `Bearer ${wpToken}`, 'Content-Type': 'application/json' }
          }
        );
        return { success: true, data: retryResponse.data };
      } catch (retryError: any) {
        return { success: false, error: retryError.response?.data || retryError.message };
      }
    }

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
  technicianName: string,
  workshopName?: string
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

🏍️ *${workshopName || 'MotoManager'}*`;

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

export async function sendMaintenanceReminderNotification(
  customerPhone: string,
  customerName: string,
  motorcycleMake: string,
  motorcycleModel: string,
  motorcyclePlate: string,
  serviceType: string,
  workshopName?: string
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;

    const wsName = workshopName || 'MotoManager';

    const aiPrompt = `Actúa como alguien del equipo de atención al cliente del taller de motocicletas "${wsName}".
Le estás escribiendo un mensaje de WhatsApp a un cliente de forma personal y muy humana para recordarle un mantenimiento o servicio. El tono DEBE ser cálido, cercano, conversacional y para nada robótico o automatizado. Imagina que le estás escribiendo a un amigo o cliente de mucha confianza.

Información del cliente:
- Nombre: ${customerName}
- Motocicleta: ${motorcycleMake} ${motorcycleModel} (${motorcyclePlate})

Lo que hay que recordarle (contexto):
"${serviceType}"

Reglas para el mensaje:
1. Saluda al cliente por su nombre de forma casual y amable (ej: ¡Hola Juan!, ¿Cómo vas?).
2. Menciona su moto de forma natural, sin parecer que lees una base de datos.
3. Cuéntale por qué le escribes basándote en el contexto del recordatorio de una forma muy coloquial y orientada a cuidarlo.
4. Anímalo a pasarse por el taller o agendar una cita, dejando la puerta abierta ("cuando te quede fácil", "avísame y te sacamos el espacio").
5. Despídete cálidamente de parte del equipo de "${wsName}".
6. Usa emojis pero de manera sutil y natural.
7. OMITIR CUALQUIER INTRODUCCIÓN, EXPLICACIÓN O TEXTO EXTRA. Devuelve SOLAMENTE el texto exacto que se le enviará al cliente. No pongas comillas al inicio ni al final.`;

    let message = '';
    try {
      const { text } = await ai.generate({ prompt: aiPrompt });
      message = text;
    } catch (aiError) {
      console.error('Error generating AI message, falling back to default:', aiError);
      message = `🔔 *MotoManager - Recordatorio de Mantenimiento*

¡Hola ${customerName}!

Te escribimos de tu taller de confianza para recordarte que es tiempo del mantenimiento sugerido para tu motocicleta:

🏍️ *Vehículo:* ${motorcycleMake} ${motorcycleModel} (${motorcyclePlate})
🛠️ *Servicio Sugerido:* ${serviceType}

Mantener tu moto al día es vital para tu seguridad y prolongar su vida útil. 
¿Te gustaría agendar una cita con nosotros o indicarnos si ya lo realizaste?

¡Esperamos verte pronto!

🏍️ *${wsName}*`;
    }

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

    console.log('✅ WhatsApp reminder sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp reminder via Evolution API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendCredentialsNotification(
  customerPhone: string,
  customerName: string,
  workshopName: string,
  workshopSlug: string,
  email: string,
  setupUrl: string,
  tempPassword?: string
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;

    const message = `🎉 *¡Bienvenido a MotoManager!*

¡Hola ${customerName}!

Tu registro para el taller *${workshopName}* ha sido exitoso. Hemos preparado todo para que puedas comenzar a gestionar tu negocio de inmediato.

📋 *Tus Datos Importantes:*
Taller: ${workshopName}
Usuario (Email): ${email}

🔑 *Configura tu acceso:*
Para ingresar por primera vez y crear tu contraseña segura, haz clic en el siguiente enlace único:
🔗 ${setupUrl}

${tempPassword ? `(Alternativamente, puedes ingresar en https://${workshopSlug}.motomanager.com.co con tu email y la contraseña temporal: ${tempPassword})` : ''}

¡Si tienes alguna duda, nuestro equipo de soporte está aquí para ayudarte!

🏍️ *MotoManager Team*`;

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

    console.log('✅ WhatsApp credentials notification sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp credentials notification via Evolution API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendPasswordResetNotification(
  customerPhone: string,
  customerName: string,
  email: string,
  newPassword: string
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;

    const message = `🔐 *MotoManager - Restablecimiento de Contraseña*

¡Hola ${customerName}!

Tu contraseña ha sido restablecida por un administrador.

🔑 *Tus Nuevas Credenciales:*
Usuario (Email): ${email}
Nueva Contraseña: ${newPassword}

⚠️ *Importante:* Te recomendamos cambiar esta contraseña temporal una vez ingreses al sistema.

¡Si tienes alguna duda, nuestro equipo de soporte está aquí para ayudarte!

🏍️ *MotoManager Team*`;

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

    console.log('✅ WhatsApp password reset notification sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp password reset notification via Evolution API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendLowStockNotification(
  ownerPhone: string,
  ownerName: string,
  technicianName: string,
  lowStockItemsText: string
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    const formattedPhone = ownerPhone.replace('+', '').startsWith('57') ? ownerPhone.replace('+', '') : `57${ownerPhone.replace('+', '')}`;

    const message = `👋 *¡Hola ${ownerName}!*

Soy ${technicianName}. Quería avisarte que estaba revisando el inventario y noté que algunos productos se están agotando. 

Sería genial si pudieras revisarlo para que no nos quedemos sin stock:

🛒 *Productos por agotarse:*
${lowStockItemsText}

¡Gracias!
🏍️ *MotoManager*`;

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

    console.log('✅ WhatsApp low stock notification sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp low stock notification via Evolution API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendSuperAdminWelcomeNotification(
  phone: string,
  name: string,
  email: string,
  tempPassword: string
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    const formattedPhone = phone.replace('+', '').startsWith('57') ? phone.replace('+', '') : `57${phone.replace('+', '')}`;

    const message = `🎉 *¡Bienvenido al equipo MotoManager!*

¡Hola ${name}!

Has sido registrado como Administrador (Personal MotoManager) en nuestra plataforma.

🔑 *Tus Credenciales de Acceso:*
Usuario (Email): ${email}
Contraseña: ${tempPassword}

⚠️ *Importante:* Te recomendamos guardar esta contraseña o cambiarla una vez ingreses al sistema.

¡Bienvenido a bordo!

🏍️ *MotoManager Team*`;

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

    console.log('✅ WhatsApp super admin welcome notification sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp super admin welcome notification via Evolution API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendSubscriptionRenewalReminder(
  ownerPhone: string,
  ownerName: string,
  workshopName: string,
  paymentLink: string
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    const formattedPhone = ownerPhone.replace('+', '').startsWith('57') ? ownerPhone.replace('+', '') : `57${ownerPhone.replace('+', '')}`;

    const message = `⚠️ *Aviso Importante: Renovación MotoManager*

¡Hola ${ownerName}!

Te recordamos que la suscripción de tu taller *${workshopName}* vence en **2 días**. 

Como realizas tus pagos de forma manual (PSE/Nequi/Efecty), te enviamos el enlace directo para que renueves a tiempo y no te quedes sin servicio:

🔗 *Enlace de Pago Seguro:*
${paymentLink}

*(Si ya realizaste el pago y activaste el débito automático, por favor ignora este mensaje).*

Si tienes alguna duda, responde a este chat y te ayudaremos.

🏍️ *Equipo MotoManager*`;

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

    console.log('✅ WhatsApp subscription renewal reminder sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp subscription renewal reminder via Evolution API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendSubscriptionSuspendedNotification(
  ownerPhone: string,
  ownerName: string,
  workshopName: string,
  paymentLink: string
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    const formattedPhone = ownerPhone.replace('+', '').startsWith('57') ? ownerPhone.replace('+', '') : `57${ownerPhone.replace('+', '')}`;

    const message = `⛔ *Servicio Suspendido - MotoManager*

¡Hola ${ownerName}!

Te informamos que tu suscripción para el taller *${workshopName}* ha vencido al no registrarse el pago correspondiente. 

Por este motivo, tu acceso a la plataforma ha sido **suspendido temporalmente**. No te preocupes, toda tu información y la de tus clientes está segura y guardada.

Para reactivar el servicio inmediatamente, realiza el pago aquí:
🔗 *Enlace de Pago Seguro:*
${paymentLink}

Tan pronto como el pago sea confirmado, tu cuenta se reactivará automáticamente.

Si necesitas ayuda, responde a este mensaje.

🏍️ *Equipo MotoManager*`;

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

    console.log('✅ WhatsApp subscription suspended notification sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp subscription suspended notification via Evolution API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendOwnerWelcomeNotification(
  phone: string,
  fullName: string,
  workshopName: string,
  planName: string,
  startDate: Date,
  endDate: Date,
  tempPassword?: string
) {
  const wpToken = process.env.WHATSAPP_API_TOKEN;
  const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!wpToken || !wpPhoneId) {
    console.log('WhatsApp Cloud API no configurada para bienvenida del dueño.');
    return { success: false, error: 'WhatsApp API no configurada' };
  }

  try {
    const formattedPhone = phone.replace('+', '').startsWith('57') ? phone.replace('+', '') : `57${phone.replace('+', '')}`;

    // Format dates as DD-MM-YYYY
    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    // Map plan key to user friendly name
    const planFriendlyMap: Record<string, string> = {
      'monthly': 'basico',
      'demo': 'demo',
      'biannual': 'semestral',
      'yearly': 'anual'
    };
    const planFriendlyName = planFriendlyMap[planName] || planName;

    // Payload helper for bienvenida_motomanager
    const postPayload = (includeButton: boolean, includeHeader: boolean) => {
      const components: any[] = [];

      if (includeHeader) {
        components.push({
          type: 'header',
          parameters: [
            { type: 'text', text: fullName }
          ]
        });
      }

      components.push({
        type: 'body',
        parameters: [
          { type: 'text', text: workshopName },
          { type: 'text', text: workshopName },
          { type: 'text', text: startStr },
          { type: 'text', text: endStr },
          { type: 'text', text: planFriendlyName }
        ]
      });

      if (includeButton) {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            {
              type: 'text',
              text: 'login'
            }
          ]
        });
      }

      return {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'bienvenida_motomanager',
          language: {
            code: 'es_CO'
          },
          components
        }
      };
    };

    console.log(`Sending template 'bienvenida_motomanager' to ${formattedPhone}...`);

    const payloadsToTry = [
      { includeHeader: true, includeButton: false },
      { includeHeader: true, includeButton: true },
      { includeHeader: false, includeButton: false },
      { includeHeader: false, includeButton: true }
    ];

    let responseWelcome = null;
    let lastError = null;

    for (const config of payloadsToTry) {
      try {
        console.log(`Trying to send welcome template with config: header=${config.includeHeader}, button=${config.includeButton}`);
        responseWelcome = await axios.post(
          `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
          postPayload(config.includeButton, config.includeHeader),
          {
            headers: {
              'Authorization': `Bearer ${wpToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`✅ Welcome template sent successfully with config: header=${config.includeHeader}, button=${config.includeButton}`);
        break; // Success! Exit loop.
      } catch (err: any) {
        lastError = err;
        const errMsg = err.response?.data?.error?.message || err.message;
        console.log(`Config failed (header=${config.includeHeader}, button=${config.includeButton}):`, errMsg);
        // Continue to the next configuration...
      }
    }

    if (!responseWelcome) {
      throw lastError || new Error("Failed to send welcome template with all payload variations");
    }

    console.log('✅ WhatsApp welcome template sent successfully.');

    // 2. If temporary password exists, send "codigo_de_acceso"
    if (tempPassword) {
      // Delay slightly to ensure welcome message arrives first
      await new Promise(resolve => setTimeout(resolve, 1500));
      const resCode = await sendAccessCodeNotification(phone, tempPassword);
      return { success: true, data: { welcome: responseWelcome.data, code: resCode.data } };
    }

    return { success: true, data: { welcome: responseWelcome.data } };

  } catch (error: any) {
    console.error('❌ Error sending WhatsApp owner welcome notifications via Meta API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendAccessCodeNotification(
  phone: string,
  tempPassword: string
) {
  const wpToken = process.env.WHATSAPP_API_TOKEN;
  const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!wpToken || !wpPhoneId) {
    console.log('WhatsApp Cloud API no configurada para código de acceso.');
    return { success: false, error: 'WhatsApp API no configurada' };
  }

  try {
    const formattedPhone = phone.replace('+', '').startsWith('57') ? phone.replace('+', '') : `57${phone.replace('+', '')}`;

    const postCodePayload = (includeButtonParam: boolean, buttonType: string) => {
      const components: any[] = [
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
      { includeButtonParam: true, buttonType: 'url' },
      { includeButtonParam: false, buttonType: 'none' },
      { includeButtonParam: true, buttonType: 'otp' }
    ];

    let responseCode = null;
    let lastCodeError = null;

    for (const config of codePayloadsToTry) {
      try {
        console.log(`Trying to send code template with config: buttonParam=${config.includeButtonParam}, type=${config.buttonType}`);
        responseCode = await axios.post(
          `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
          postCodePayload(config.includeButtonParam, config.buttonType),
          {
            headers: {
              'Authorization': `Bearer ${wpToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`✅ Code template sent successfully with config: buttonParam=${config.includeButtonParam}, type=${config.buttonType}`);
        break; // Success! Exit loop.
      } catch (err: any) {
        lastCodeError = err;
        const errMsg = err.response?.data?.error?.message || err.message;
        console.log(`Code config failed (buttonParam=${config.includeButtonParam}, type=${config.buttonType}):`, errMsg);
      }
    }

    if (!responseCode) {
      throw lastCodeError || new Error("Failed to send code template with all payload variations");
    }

    console.log('✅ WhatsApp access code template sent successfully.');
    return { success: true, data: responseCode.data };

  } catch (error: any) {
    console.error('❌ Error sending WhatsApp access code notification via Meta API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendMotoIngresoNotification(
  customerPhone: string,
  customerName: string,
  workshopName: string,
  brand: string,
  model: string,
  plate: string,
  intakeDate: Date | string,
  orderNumber: string,
  workshopBrand: string = 'Motomanager'
) {
  const wpToken = process.env.WHATSAPP_API_TOKEN;
  const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!wpToken || !wpPhoneId) {
    console.log('WhatsApp Cloud API no configurada para ingreso de moto.');
    return { success: false, error: 'WhatsApp API no configurada' };
  }

  try {
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;

    let dateStr = '';
    if (intakeDate instanceof Date) {
      const day = String(intakeDate.getDate()).padStart(2, '0');
      const month = String(intakeDate.getMonth() + 1).padStart(2, '0');
      const year = intakeDate.getFullYear();
      const hours = String(intakeDate.getHours()).padStart(2, '0');
      const minutes = String(intakeDate.getMinutes()).padStart(2, '0');
      dateStr = `${day}-${month}-${year} ${hours}:${minutes}`;
    } else {
      try {
        const dateObj = new Date(intakeDate);
        if (!isNaN(dateObj.getTime())) {
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          const hours = String(dateObj.getHours()).padStart(2, '0');
          const minutes = String(dateObj.getMinutes()).padStart(2, '0');
          dateStr = `${day}-${month}-${year} ${hours}:${minutes}`;
        } else {
          dateStr = intakeDate;
        }
      } catch {
        dateStr = intakeDate;
      }
    }

    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'plantilla_ingreso_moto',
          language: {
            code: 'es_CO'
          },
          components: [
            {
              type: 'header',
              parameters: [
                { type: 'text', text: `${brand} ${model}`.trim() }  // {{1}} of header (e.g. brand + model)
              ]
            },
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName }, // {{1}}
                { type: 'text', text: workshopName }, // {{2}}
                { type: 'text', text: brand },        // {{3}}
                { type: 'text', text: model },        // {{4}}
                { type: 'text', text: plate },        // {{5}}
                { type: 'text', text: dateStr },      // {{6}}
                { type: 'text', text: orderNumber },  // {{7}}
                { type: 'text', text: workshopName }  // {{8}}
              ]
            }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${wpToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ WhatsApp moto ingreso template sent successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp moto ingreso notification via Meta API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export async function sendDiagnosticadoReparadoNotification(
  customerPhone: string,
  customerName: string,
  workshopName: string,
  motorcycleInfo: string,
  plate: string,
  orderNumber: string,
  workshopAddress: string,
  weekdaysSchedule: string = '09:00 a.m. a 13:00 p.m. y 15:00 a.m. a 19:00 p.m.',
  saturdaySchedule: string = '09:00 a.m. a 14:00 p.m.'
) {
  const wpToken = process.env.WHATSAPP_API_TOKEN;
  const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!wpToken || !wpPhoneId) {
    console.log('WhatsApp Cloud API no configurada para diagnosticado_reparado.');
    return { success: false, error: 'WhatsApp API no configurada' };
  }

  try {
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;
    const addressText = workshopAddress || 'Dirección del taller';

    const payloadsToTry = [
      // 1. Header (1 param) + Body (7 params with repeating workshopName)
      {
        header: [{ type: 'text', text: motorcycleInfo }],
        body: [
          { type: 'text', text: customerName },
          { type: 'text', text: workshopName },
          { type: 'text', text: motorcycleInfo },
          { type: 'text', text: plate },
          { type: 'text', text: orderNumber },
          { type: 'text', text: addressText },
          { type: 'text', text: workshopName }
        ]
      },
      // 2. Header (1 param) + Body (7 params with schedule)
      {
        header: [{ type: 'text', text: motorcycleInfo }],
        body: [
          { type: 'text', text: customerName },
          { type: 'text', text: workshopName },
          { type: 'text', text: motorcycleInfo },
          { type: 'text', text: plate },
          { type: 'text', text: orderNumber },
          { type: 'text', text: weekdaysSchedule },
          { type: 'text', text: saturdaySchedule }
        ]
      },
      // 3. Just Body (7 params with repeating workshopName)
      {
        header: null,
        body: [
          { type: 'text', text: customerName },
          { type: 'text', text: workshopName },
          { type: 'text', text: motorcycleInfo },
          { type: 'text', text: plate },
          { type: 'text', text: orderNumber },
          { type: 'text', text: addressText },
          { type: 'text', text: workshopName }
        ]
      },
      // 4. Just Body (7 params with schedule)
      {
        header: null,
        body: [
          { type: 'text', text: customerName },
          { type: 'text', text: workshopName },
          { type: 'text', text: motorcycleInfo },
          { type: 'text', text: plate },
          { type: 'text', text: orderNumber },
          { type: 'text', text: weekdaysSchedule },
          { type: 'text', text: saturdaySchedule }
        ]
      },
      // 5. Header (1 param) + Body (6 params)
      {
        header: [{ type: 'text', text: motorcycleInfo }],
        body: [
          { type: 'text', text: customerName },
          { type: 'text', text: workshopName },
          { type: 'text', text: motorcycleInfo },
          { type: 'text', text: plate },
          { type: 'text', text: orderNumber },
          { type: 'text', text: addressText }
        ]
      },
      // 6. Just Body (6 params)
      {
        header: null,
        body: [
          { type: 'text', text: customerName },
          { type: 'text', text: workshopName },
          { type: 'text', text: motorcycleInfo },
          { type: 'text', text: plate },
          { type: 'text', text: orderNumber },
          { type: 'text', text: addressText }
        ]
      },
      // 7. Header (1 param) + Body (8 params)
      {
        header: [{ type: 'text', text: motorcycleInfo }],
        body: [
          { type: 'text', text: customerName },
          { type: 'text', text: workshopName },
          { type: 'text', text: motorcycleInfo },
          { type: 'text', text: plate },
          { type: 'text', text: orderNumber },
          { type: 'text', text: addressText },
          { type: 'text', text: weekdaysSchedule },
          { type: 'text', text: saturdaySchedule }
        ]
      },
      // 8. Header (1 param) + Body (9 params)
      {
        header: [{ type: 'text', text: motorcycleInfo }],
        body: [
          { type: 'text', text: customerName },
          { type: 'text', text: workshopName },
          { type: 'text', text: motorcycleInfo },
          { type: 'text', text: plate },
          { type: 'text', text: orderNumber },
          { type: 'text', text: addressText },
          { type: 'text', text: weekdaysSchedule },
          { type: 'text', text: saturdaySchedule },
          { type: 'text', text: workshopName }
        ]
      }
    ];

    console.log(`Sending template 'diagnosticado_reparado' to ${formattedPhone}...`);

    let lastError = null;
    let successResponse = null;

    for (let i = 0; i < payloadsToTry.length; i++) {
      const config = payloadsToTry[i];
      try {
        const components: any[] = [];
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

        console.log(`Trying to send diagnosticado_reparado template payload option ${i + 1}...`);
        const response = await axios.post(
          `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'template',
            template: {
              name: 'diagnosticado_reparado',
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
        console.log(`✅ diagnosticado_reparado template sent successfully using payload option ${i + 1}.`);
        successResponse = response.data;
        break; // Exit loop on success
      } catch (err: any) {
        lastError = err;
        const errMsg = err.response?.data?.error?.message || err.message;
        const errDetails = err.response?.data?.error?.error_data?.details || '';
        console.log(`Payload option ${i + 1} failed: ${errMsg}. Details: ${errDetails}`);
      }
    }

    if (!successResponse) {
      throw lastError || new Error("Failed to send diagnosticado_reparado template with all payload variations");
    }

    return { success: true, data: successResponse };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp diagnosticado_reparado notification via Meta API:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

export default {
  sendSaleNotification,
  sendServiceSaleNotification,
  sendOrderStatusUpdate,
  sendOrderItemAddedNotification,
  sendMaintenanceReminderNotification,
  sendCredentialsNotification,
  sendPasswordResetNotification,
  sendLowStockNotification,
  sendSuperAdminWelcomeNotification,
  sendSubscriptionRenewalReminder,
  sendSubscriptionSuspendedNotification,
  sendQuoteNotification,
  sendOwnerWelcomeNotification,
  sendAccessCodeNotification,
  sendMotoIngresoNotification,
  sendDiagnosticadoReparadoNotification
};