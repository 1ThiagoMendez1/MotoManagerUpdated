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
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;

    const orderText = orderNumber ? ` (Orden: *${orderNumber}*)` : '';
    const techText = technicianName ? ` por el técnico ${technicianName}` : '';

    const message = `👋 Hola, ${customerName}.
Gracias por confiar en ${workshopName || 'nosotros'}
Hemos revisado tu motocicleta y hemos preparado la cotización del servicio${orderText}.

A continuación, podrás consultar:

• 🛠️ El detalle de los repuestos.
• 📋 La solución propuesta${techText}
• ✅ La opción para aprobar o rechazar la cotización.

🔗 Consulta tu cotización aquí:
${portalUrl}

Agradecemos que revises la información y nos indiques tu decisión cuando te sea posible.

Quedamos atentos a cualquier consulta.

Saludos cordiales,
${workshopName || ''}

🏍️ Equipo MotoManager`;

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

    console.log('✅ WhatsApp quote notification sent via Evolution API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp quote notification via Evolution API:', error.response?.data || error.message);
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
  tempPassword: string
) {
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
    const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;

    const message = `🎉 *¡Bienvenido a MotoManager!*

¡Hola ${customerName}!

Tu registro para el taller *${workshopName}* ha sido exitoso. Hemos generado tus credenciales de acceso automáticamente para que puedas comenzar a gestionar tu negocio.

🔑 *Tus Credenciales de Acceso:*
URL de acceso: https://${workshopSlug}.motomanager.com.co
Usuario (Email): ${email}
Contraseña temporal: ${tempPassword}

⚠️ *Importante:* Te recomendamos cambiar esta contraseña temporal una vez ingreses al sistema por primera vez.

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
  sendQuoteNotification
};