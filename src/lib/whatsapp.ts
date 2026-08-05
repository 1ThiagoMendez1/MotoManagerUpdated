import axios from 'axios';
import { ai } from '@/ai/genkit';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getPlanLimits } from '@/lib/constants/plans';

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
  console.log(`Redirecting sendServiceSaleNotification to sendVentaPorOrdenNotification...`);
  return sendVentaPorOrdenNotification(
    customerPhone,
    customerName,
    workshopName || 'MotoManager',
    saleNumber,
    `${motorcycleInfo.make} ${motorcycleInfo.model}`.trim(),
    motorcycleInfo.plate || 'Sin Placa',
    total,
    items || [],
    laborCost,
    undefined // depositAmount
  );
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
    const errorMsg = error.response?.data?.error?.message || '';
    const errorDetails = error.response?.data?.error?.error_data?.details || '';
    if (errorMsg.includes('button') || errorDetails.includes('button')) {
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
  tempPassword?: string,
  role?: string
) {
  const wpToken = process.env.WHATSAPP_API_TOKEN;
  const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const cleanPhone = customerPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;

  // 1. Intentar con Meta Cloud API si está configurada
  if (wpToken && wpPhoneId) {
    try {
      const roleLabels: Record<string, string> = {
        owner: 'Dueño',
        admin: 'Administrador',
        mechanic: 'Técnico',
        service_advisor: 'Recepcionista',
        receptionist: 'Recepcionista'
      };
      const roleDisplay = roleLabels[role || 'mechanic'] || 'Técnico';
      
      const dateObj = new Date();
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;

      console.log(`Sending credentials to ${formattedPhone} via Meta Cloud API...`);

      // 1. Intentar enviar la plantilla de bienvenida PRIMERO
      let templateSent = false;
      const postPayload = (includeHeader: boolean, includeButton: boolean, numBodyParams: number = 7) => {
        const components: any[] = [];

        if (includeHeader) {
          components.push({
            type: 'header',
            parameters: [{ type: 'text', text: workshopName }]
          });
        }

        // Creamos un array de parametros seguro para diferentes versiones de la plantilla
        const baseParams = [
          { type: 'text', text: roleDisplay },   // {{1}} Ej: Tecnico
          { type: 'text', text: workshopName },  // {{2}} Ej: Taller
          { type: 'text', text: workshopName },  // {{3}} Ej: Taller
          { type: 'text', text: roleDisplay },   // {{4}} Ej: Tecnico
          { type: 'text', text: formattedDate }, // {{5}} Ej: Fecha
          { type: 'text', text: workshopName },  // {{6}} Ej: Taller
          { type: 'text', text: workshopName },  // {{7}} Extra
          { type: 'text', text: roleDisplay }    // {{8}} Extra
        ];

        components.push({
          type: 'body',
          parameters: baseParams.slice(0, numBodyParams)
        });

        if (includeButton) {
          components.push({
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: 'login' }]
          });
        }

        return {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: 'bienvenida_miembros_del_taller',
            language: { code: 'es_CO' },
            components
          }
        };
      };

      const payloadsToTry = [
        // Variaciones probables de cantidad de parametros
        { includeHeader: false, includeButton: false, numBodyParams: 7 },
        { includeHeader: true, includeButton: false, numBodyParams: 7 },
        { includeHeader: false, includeButton: false, numBodyParams: 6 },
        { includeHeader: true, includeButton: false, numBodyParams: 6 },
        { includeHeader: false, includeButton: false, numBodyParams: 8 },
        { includeHeader: false, includeButton: true, numBodyParams: 7 },
        { includeHeader: false, includeButton: false, numBodyParams: 5 },
        { includeHeader: false, includeButton: false, numBodyParams: 4 },
        { includeHeader: false, includeButton: false, numBodyParams: 3 },
      ];

      for (const config of payloadsToTry) {
        try {
          const templateResponse = await axios.post(
            `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
            postPayload(config.includeHeader, config.includeButton, config.numBodyParams),
            {
              headers: {
                'Authorization': `Bearer ${wpToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          console.log(`✅ Template bienvenida_miembros_del_taller accepted (header: ${config.includeHeader}, button: ${config.includeButton}, params: ${config.numBodyParams}):`, templateResponse.data);
          templateSent = true;
          break; // Rompe el ciclo si tuvo éxito
        } catch (templateError: any) {
          console.warn(`⚠️ Template attempt failed (header: ${config.includeHeader}, button: ${config.includeButton}, params: ${config.numBodyParams}):`, templateError.response?.data?.error?.message || templateError.message);
        }
      }

      // 2. Enviar el código de acceso DESPUES de la bienvenida
      if (tempPassword) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        try {
          await sendAccessCodeNotification(customerPhone, tempPassword);
        } catch (codeErr: any) {
          console.warn('⚠️ Falló el envío de codigo_de_acceso en sendCredentialsNotification:', codeErr.message);
        }
      }

      // 3. Enviar mensaje de texto de bienvenida como respaldo
      //    (la plantilla tiene estado "calidad pendiente" en Meta y puede no entregarse)
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const welcomeText = `¡Bienvenido a MotoManager! 🏍️\n\n🎉 Nos alegra darte la bienvenida. Tu cuenta como ${roleDisplay} ha sido creada exitosamente para el taller ${workshopName}. Ya puedes ingresar a consultar tus apartados disponibles.\n\n🏍️ Taller: ${workshopName}\n🔧 Tu rol asignado: ${roleDisplay}\n📅 Inicio de acceso: ${formattedDate}\n\n🔑 ¿Cómo ingresar?\n📧 Usuario: Tu correo electrónico registrado.\n🌐 Ingresa a la plataforma y asigna tu contraseña en tu primer acceso.\n\n💭 Si tienes alguna duda o necesitas ayuda, estaremos encantados de apoyarte.\n\n¡Bienvenido a ${workshopName}! 🏍️ 🛣️🛣️\nEquipo MotoManager`;

        const textResponse = await axios.post(
          `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: formattedPhone,
            type: 'text',
            text: { body: welcomeText }
          },
          {
            headers: {
              'Authorization': `Bearer ${wpToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('✅ Welcome text message sent:', textResponse.data);
      } catch (textError: any) {
        console.warn('⚠️ Welcome text fallback also failed:', textError.response?.data?.error?.message || textError.message);
      }

      return { success: true, provider: 'meta' };
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp credentials template via Meta Cloud API:', error.response?.data || error.message);
      // Fallback a Evolution API si falla
    }
  }

  // 2. Fallback o uso directo de Evolution API
  if (!evolutionApiUrl || !evolutionApiKey || !whatsappInstance) {
    console.log('Evolution API not configured, skipping WhatsApp notification');
    return { success: false, error: 'Evolution API not configured' };
  }

  try {
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
    return { success: true, provider: 'evolution', data: response.data };
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

export async function sendTemplateReminderNotification(
  customerPhone: string,
  customerName: string,
  motorcycleMakeModel: string,
  motorcyclePlate: string,
  workshopName: string,
  lastServiceDate: string,
  serviceType: string,
  workshopAddress: string
) {
  const wpToken = process.env.WHATSAPP_API_TOKEN;
  const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

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
          name: 'recordatorio_clientes',
          language: {
            code: 'es_CO'
          },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName }, // {{1}} Juan Urian
                { type: 'text', text: motorcycleMakeModel }, // {{2}} Suzuki Gixxer 150
                { type: 'text', text: motorcyclePlate }, // {{3}} GHK098
                { type: 'text', text: workshopName }, // {{4}} Aguilas doradas
                { type: 'text', text: 'mantenimiento o servicio' }, // {{5}} "cambio de aceite en tu moto" -> we can just pass generic or maybe omit if not parameterized
                { type: 'text', text: lastServiceDate }, // {{6}} 25-06-2026
                { type: 'text', text: serviceType }, // {{7}} Mantenimiento general
                { type: 'text', text: workshopAddress }, // {{8}} Carrera 64 #73-67b
                { type: 'text', text: workshopName } // {{9}} Aguilas Doradas (at the end)
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

    console.log('✅ WhatsApp template reminder sent via Meta API:', response.data);
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('❌ Error sending WhatsApp template reminder via Meta API:', error.response?.data || error.message);
    
    // Si la plantilla espera otra cantidad de parametros, podemos intentar un fallback
    if (error.response?.data?.error?.message) {
      console.log('Error detallado de Meta:', error.response.data.error.message);
    }
    
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
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;

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
  const evolutionApiUrl = process.env.EVOLUTION_API_URL;
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;
  const whatsappInstance = process.env.EVOLUTION_INSTANCE_NAME;

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

  let sentSuccessfully = false;
  let successResponse = null;
  let lastMetaError = null;

  if (wpToken && wpPhoneId) {
    try {
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
                  { type: 'text', text: `${brand} ${model}`.trim() }
                ]
              },
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: customerName },
                  { type: 'text', text: workshopName },
                  { type: 'text', text: brand },
                  { type: 'text', text: model },
                  { type: 'text', text: plate },
                  { type: 'text', text: dateStr },
                  { type: 'text', text: orderNumber },
                  { type: 'text', text: workshopName }
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
      console.log('✅ WhatsApp moto ingreso template sent successfully via Meta:', response.data);
      successResponse = response.data;
      sentSuccessfully = true;
    } catch (error: any) {
      lastMetaError = error;
      console.error('❌ Error sending WhatsApp moto ingreso notification via Meta API:', error.response?.data || error.message);
    }
  }

  if (sentSuccessfully) {
    return { success: true, provider: 'meta', data: successResponse };
  }

  // Fallback to Evolution API
  if (evolutionApiUrl && evolutionApiKey && whatsappInstance) {
    try {
      const message = `🔧 *Ingreso a Revisión - ${workshopName}*
      
¡Hola ${customerName}!

Te confirmamos que tu motocicleta ha ingresado exitosamente a nuestro taller.

📋 *Detalles del Ingreso:*
Vehículo: ${brand} ${model}
Placa: ${plate}
Fecha: ${dateStr}
Orden de trabajo: #${orderNumber}

Estaremos revisando tu motocicleta y te notificaremos cuando el diagnóstico esté listo.

Gracias por confiar en *${workshopName}*.
🏍️ MotoManager`;

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

      console.log('✅ WhatsApp moto ingreso notification sent via Evolution API fallback:', response.data);
      return { success: true, provider: 'evolution', data: response.data };
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp moto ingreso notification via Evolution API fallback:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  const finalErrorMsg = lastMetaError?.response?.data?.error?.message || lastMetaError?.message || 'Ningún servicio de WhatsApp está configurado o ambos fallaron.';
  return { success: false, error: finalErrorMsg };
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

export async function sendVentaPorOrdenNotification(
  customerPhone: string,
  customerName: string,
  workshopName: string,
  orderNumber: string,
  motorcycleInfo: string,
  plate: string,
  total: number,
  items: Array<{ name: string; quantity: number; price: number }>,
  laborCost?: number,
  depositAmount?: number
) {
  const wpToken = process.env.WHATSAPP_API_TOKEN;
  const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const evolutionApiUrl = process.env.EVOLUTION_API_URL;
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;
  const whatsappInstance = process.env.EVOLUTION_INSTANCE_NAME;

  const formattedPhone = customerPhone.replace('+', '').startsWith('57') ? customerPhone.replace('+', '') : `57${customerPhone.replace('+', '')}`;
  
  const formattedTotal = total.toLocaleString('es-CO');

  const formattedItemsList = items && items.length > 0
    ? [
        ...items.map(item => `• ${item.name} ×${item.quantity} — $${item.price.toLocaleString('es-CO')}`),
        ...(laborCost && laborCost > 0 ? [`• Mano de Obra ×1 — $${laborCost.toLocaleString('es-CO')}`] : [])
      ].join('   ')
    : 'Servicios de taller';

  // Get formatted date as DD-MM-YYYY
  const dateObj = new Date();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${day}-${month}-${year}`;

  let sentSuccessfully = false;
  let successResponse = null;
  let lastMetaError = null;

  // 1. Intentar enviar con Meta Cloud API (si está configurada)
  if (wpToken && wpPhoneId) {
    try {
      const payloadsToTry = [
        // Working layout: Header (1: workshopName), Body (7: customerName, orderNumber, motorcycleInfo, plate, total, items, workshopName)
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
        // Fallback layout: Header (1: workshopName), Body (7: customerName, orderNumber, motorcycleInfo, plate, total without $, items, workshopName)
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

      console.log(`Sending template 'venta_por_orden' to ${formattedPhone} via Meta Cloud API...`);

      const languages = [{ code: 'es_CO' }, { code: 'es' }];

      for (const lang of languages) {
        if (sentSuccessfully) break;
        console.log(`Attempting language: ${lang.code}`);
        
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

            console.log(`Trying Meta payload option ${i + 1} (${config.body.length} body params) using language ${lang.code}...`);
            const response = await axios.post(
              `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
              {
                messaging_product: 'whatsapp',
                to: formattedPhone,
                type: 'template',
                template: {
                  name: 'venta_por_orden',
                  language: lang,
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
            console.log(`✅ venta_por_orden template sent successfully using payload option ${i + 1} with language ${lang.code} via Meta.`);
            successResponse = response.data;
            sentSuccessfully = true;
            break; // Exit loop on success
          } catch (err: any) {
            lastMetaError = err;
            const errMsg = err.response?.data?.error?.message || err.message;
            console.log(`Meta payload option ${i + 1} with language ${lang.code} failed: ${errMsg}`);
          }
        }
      }

      if (sentSuccessfully) {
        return { success: true, provider: 'meta', data: successResponse };
      }
    } catch (metaErr: any) {
      console.error('❌ Error general en Meta Cloud API:', metaErr.message);
    }
  }

  // 2. Fallback: Evolution API (si Meta no está configurada o falló)
  if (evolutionApiUrl && evolutionApiKey && whatsappInstance) {
    try {
      const textMessage = `!Resumen de tu compra con servicio en: ${workshopName} ✅¡
________________________

😀Te informamos que los servicios y/o repuestos asociados a la reparación de tu moto han sido registrados correctamente.

📋 Resumen de la orden de servicio
🔖 Orden de servicio: #${orderNumber}
🛵 Moto: ${motorcycleInfo} - ${plate}
💵 Total:$${formattedTotal}
🛠️ Servicios y productos registrados:

${formattedItemsList}

💭Si tienes alguna inquietud sobre los servicios realizados o los repuestos instalados, no dudes en comunicarte con nosotros *${workshopName}*.

¡Gracias por confiar el cuidado de tu moto con nosotros! 🏍️🛣️
________________________
MotoManager - CRM`;

      console.log(`Sending venta_por_orden text via Evolution API fallback to ${formattedPhone}...`);
      const response = await axios.post(
        `${evolutionApiUrl}/message/sendText/${whatsappInstance}`,
        {
          number: formattedPhone,
          text: textMessage,
          delay: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey
          }
        }
      );

      console.log('✅ WhatsApp message sent successfully via Evolution API fallback:', response.data);
      return { success: true, provider: 'evolution', data: response.data };
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp notification via Evolution API fallback:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  const finalErrorMsg = lastMetaError?.response?.data?.error?.message || lastMetaError?.message || 'Ningún servicio de WhatsApp está configurado o ambos fallaron.';
  return { success: false, error: finalErrorMsg };
}

export async function sendDirectSalePaidNotification(
  customerPhone: string,
  customerName: string,
  workshopName: string,
  saleNumber: string,
  total: number,
  paymentMethod: string = 'Wompi',
  items: Array<{ name: string; quantity: number; price: number }> = []
) {
  const wpToken = process.env.WHATSAPP_API_TOKEN;
  const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const evolutionApiUrl = process.env.EVOLUTION_API_URL;
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;
  const whatsappInstance = process.env.EVOLUTION_INSTANCE_NAME;

  const formattedPhone = customerPhone.replace('+', '').startsWith('57') 
    ? customerPhone.replace('+', '') 
    : `57${customerPhone.replace('+', '')}`;

  const formattedTotal = total.toLocaleString('es-CO');

  // Format 1: Bullet and × symbol (e.g., • Producto A ×1  $2.000.000)
  const itemsTextWithBullet = items.length > 0 
    ? items.map((item: any) => `• ${item.name} ×${item.quantity}  $${(item.price * item.quantity).toLocaleString('es-CO')}`).join('\n')
    : '';

  // Format 2: No bullet (e.g., Producto A ×1  $2.000.000)
  const itemsTextNoBullet = items.length > 0 
    ? items.map((item: any) => `${item.name} ×${item.quantity}  $${(item.price * item.quantity).toLocaleString('es-CO')}`).join('\n')
    : '';

  // Format 3: Legacy format fallback
  const itemsTextLegacy = items.length > 0 
    ? items.map((item: any) => `${item.name} Cantidad: ${item.quantity} $${(item.price * item.quantity).toLocaleString('es-CO')} $${item.price.toLocaleString('es-CO')} c/u`).join('\n')
    : '';

  let sentSuccessfully = false;
  let successResponse = null;
  let lastMetaError = null;

  // 1. Intentar enviar con Meta Cloud API
  if (wpToken && wpPhoneId) {
    try {
      const payloadsToTry = [
        // A1. Body-only: 6 params (Format 1: With bullet, with dollar sign) - SWAPPED (items then payment)
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: itemsTextWithBullet },
            { type: 'text', text: paymentMethod }
          ]
        },
        // A2. Body-only: 6 params (Format 1: With bullet, without dollar sign) - SWAPPED (items then payment)
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: formattedTotal },
            { type: 'text', text: itemsTextWithBullet },
            { type: 'text', text: paymentMethod }
          ]
        },
        // A3. Body-only: 6 params (Format 2: No bullet, with dollar sign) - SWAPPED (items then payment)
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: itemsTextNoBullet },
            { type: 'text', text: paymentMethod }
          ]
        },
        // A4. Body-only: 6 params (Format 2: No bullet, without dollar sign) - SWAPPED (items then payment)
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: formattedTotal },
            { type: 'text', text: itemsTextNoBullet },
            { type: 'text', text: paymentMethod }
          ]
        },
        // A5. Body-only: 6 params (Format 3: Legacy, with dollar sign) - SWAPPED (items then payment)
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: itemsTextLegacy },
            { type: 'text', text: paymentMethod }
          ]
        },
        // B. Body-only: 5 params (with dollar sign)
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: paymentMethod }
          ]
        },
        // C. Body-only: 4 params
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` }
          ]
        },
        // D. Body-only: 3 params
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` }
          ]
        },
        // E. Body-only: 2 params
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: `$${formattedTotal}` }
          ]
        },
        // F. Body-only: 1 param
        {
          header: null,
          body: [
            { type: 'text', text: customerName }
          ]
        },
        // G. Body-only: 6 params (old/legacy 6 params)
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: paymentMethod },
            { type: 'text', text: workshopName }
          ]
        },
        // H. Body-only: 7 params
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: paymentMethod },
            { type: 'text', text: workshopName },
            { type: 'text', text: customerName }
          ]
        },
        // I. Body-only: 8 params
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: paymentMethod },
            { type: 'text', text: workshopName },
            { type: 'text', text: customerName },
            { type: 'text', text: saleNumber }
          ]
        },
        // J. Header (1 param) + Body: 4 params
        {
          header: [{ type: 'text', text: workshopName }],
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: paymentMethod }
          ]
        },
        // K. Header (1 param) + Body: 3 params
        {
          header: [{ type: 'text', text: workshopName }],
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` }
          ]
        },
        // L. Header (1 param) + Body: 2 params
        {
          header: [{ type: 'text', text: workshopName }],
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: `$${formattedTotal}` }
          ]
        },
        // M. Header (1 param) + Body: 5 params
        {
          header: [{ type: 'text', text: workshopName }],
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: paymentMethod }
          ]
        },
        // N. Header (1 param) + Body: 6 params (With bullet) - SWAPPED
        {
          header: [{ type: 'text', text: '¡Compra realizada con éxito!💳' }],
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: itemsTextWithBullet },
            { type: 'text', text: paymentMethod }
          ]
        },
        // O. Header (1 param) + Body: 6 params (No bullet) - SWAPPED
        {
          header: [{ type: 'text', text: '¡Compra realizada con éxito!💳' }],
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: itemsTextNoBullet },
            { type: 'text', text: paymentMethod }
          ]
        },
        // P1. Original (Not Swapped) Option for fallback: 6 params Body-only (Format 1: With bullet, with dollar sign)
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: `$${formattedTotal}` },
            { type: 'text', text: paymentMethod },
            { type: 'text', text: itemsTextWithBullet }
          ]
        },
        // P2. Original (Not Swapped) Option: 6 params Body-only (Format 1: With bullet, without dollar sign)
        {
          header: null,
          body: [
            { type: 'text', text: customerName },
            { type: 'text', text: workshopName },
            { type: 'text', text: saleNumber },
            { type: 'text', text: formattedTotal },
            { type: 'text', text: paymentMethod },
            { type: 'text', text: itemsTextWithBullet }
          ]
        }
      ];

      console.log(`Sending template 'compra_realizada_venta_directa' to ${formattedPhone} via Meta...`);
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

          console.log(`Trying Meta payload option ${i + 1} (${config.header ? 'Header + ' : ''}${config.body.length} body params)...`);
          const response = await axios.post(
            `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
            {
              messaging_product: 'whatsapp',
              to: formattedPhone,
              type: 'template',
              template: {
                name: 'compra_realizada_venta_directa',
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
          console.log(`✅ Template 'compra_realizada_venta_directa' sent successfully using option ${i + 1} via Meta.`);
          successResponse = response.data;
          sentSuccessfully = true;
          break; // Salir en caso de éxito
        } catch (err: any) {
          lastMetaError = err;
          console.log(`Meta payload option ${i + 1} failed:`, err.response?.data?.error?.message || err.message);
        }
      }

      if (sentSuccessfully) {
        return { success: true, provider: 'meta', data: successResponse };
      }
    } catch (metaErr: any) {
      console.error('❌ Error general en Meta Cloud API para venta directa:', metaErr.message);
    }
  }

  // 2. Fallback: Evolution API (Mensaje de texto plano)
  if (evolutionApiUrl && evolutionApiKey && whatsappInstance) {
    try {
      const textMessage = `¡Compra realizada con éxito!💳
Hola, ${customerName}.👋

✅Gracias por tu compra en ${workshopName}. Tu venta ha sido registrada exitosamente.

📋 Resumen de la compra
🧾 Número de venta: ${saleNumber}
💵 Total pagado: $${formattedTotal}
💳Métodos de pago: ${paymentMethod} 
🛒 Productos adquiridos:
${itemsTextWithBullet}

💭Si tienes alguna inquietud sobre tu compra o necesitas soporte, estaremos encantados de ayudarte.

¡Gracias por confiar en nosotros! 🏍️🛡️
Equipo Motomanager`;

      console.log(`Sending direct sale paid text via Evolution API fallback to ${formattedPhone}...`);
      const response = await axios.post(
        `${evolutionApiUrl}/message/sendText/${whatsappInstance}`,
        {
          number: formattedPhone,
          text: textMessage,
          delay: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionApiKey
          }
        }
      );

      console.log('✅ WhatsApp message sent successfully via Evolution API fallback:', response.data);
      return { success: true, provider: 'evolution', data: response.data };
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp notification via Evolution API fallback:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  const finalErr = lastMetaError?.response?.data?.error?.message || lastMetaError?.message || 'Ningún servicio de WhatsApp está configurado o ambos fallaron.';
  return { success: false, error: finalErr };
}

export async function sendCitaConfirmadaNotification(
  customerPhone: string,
  customerName: string,
  workshopName: string,
  appointmentDate: Date | string
) {
  const wpToken = process.env.WHATSAPP_API_TOKEN;
  const wpPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!wpToken || !wpPhoneId) {
    console.error('❌ citas_confirmadas: WHATSAPP_API_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados.');
    return { success: false, error: 'Meta WhatsApp API no configurada' };
  }

  const formattedPhone = customerPhone.replace('+', '').startsWith('57')
    ? customerPhone.replace('+', '')
    : `57${customerPhone.replace('+', '')}`;

  let dateStr = '';
  if (appointmentDate instanceof Date) {
    const day = String(appointmentDate.getDate()).padStart(2, '0');
    const month = String(appointmentDate.getMonth() + 1).padStart(2, '0');
    const year = appointmentDate.getFullYear();
    dateStr = `${day}-${month}-${year}`;
  } else {
    try {
      const dateObj = new Date(appointmentDate);
      if (!isNaN(dateObj.getTime())) {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        dateStr = `${day}-${month}-${year}`;
      } else {
        dateStr = appointmentDate;
      }
    } catch {
      dateStr = appointmentDate;
    }
  }

  // Ya sabemos por los logs que el idioma correcto es es_CO (es el único que da 132000 en vez de 132001)
  const langCode = 'es_CO';

  // Todas las combinaciones de parámetros posibles (Header y Body)
  const paramVariants: Array<{ label: string; components: any[] }> = [
    // Body only (1 a 6 params)
    { label: 'Body: 1 param', components: [{ type: 'body', parameters: [{ type: 'text', text: workshopName }] }] },
    { label: 'Body: 2 params', components: [{ type: 'body', parameters: [{ type: 'text', text: workshopName }, { type: 'text', text: dateStr }] }] },
    { label: 'Body: 3 params', components: [{ type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: workshopName }, { type: 'text', text: dateStr }] }] },
    { label: 'Body: 4 params', components: [{ type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: workshopName }, { type: 'text', text: dateStr }, { type: 'text', text: workshopName }] }] },
    { label: 'Body: 5 params', components: [{ type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: workshopName }, { type: 'text', text: dateStr }, { type: 'text', text: workshopName }, { type: 'text', text: customerName }] }] },
    { label: 'Body: 6 params', components: [{ type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: workshopName }, { type: 'text', text: dateStr }, { type: 'text', text: workshopName }, { type: 'text', text: customerName }, { type: 'text', text: dateStr }] }] },
    
    // Header (1 param) + Body (1 a 4 params)
    { 
      label: 'Header: 1, Body: 1', 
      components: [
        { type: 'header', parameters: [{ type: 'text', text: workshopName }] },
        { type: 'body', parameters: [{ type: 'text', text: dateStr }] }
      ] 
    },
    { 
      label: 'Header: 1, Body: 2', 
      components: [
        { type: 'header', parameters: [{ type: 'text', text: workshopName }] },
        { type: 'body', parameters: [{ type: 'text', text: workshopName }, { type: 'text', text: dateStr }] }
      ] 
    },
    { 
      label: 'Header: 1, Body: 3', 
      components: [
        { type: 'header', parameters: [{ type: 'text', text: workshopName }] },
        { type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: workshopName }, { type: 'text', text: dateStr }] }
      ] 
    },
    { 
      label: 'Header: 1, Body: 4', 
      components: [
        { type: 'header', parameters: [{ type: 'text', text: workshopName }] },
        { type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: workshopName }, { type: 'text', text: dateStr }, { type: 'text', text: workshopName }] }
      ] 
    },
    
    // Media Header: IMAGE sin parámetros (algunas plantillas requieren esto si tienen imagen fija)
    {
      label: 'Header: IMAGE, Body: 2',
      components: [
        { type: 'header', parameters: [{ type: 'image', image: { link: 'https://i.imgur.com/K3n8g6D.png' } }] },
        { type: 'body', parameters: [{ type: 'text', text: workshopName }, { type: 'text', text: dateStr }] }
      ]
    },
    {
      label: 'Header: IMAGE, Body: 3',
      components: [
        { type: 'header', parameters: [{ type: 'image', image: { link: 'https://i.imgur.com/K3n8g6D.png' } }] },
        { type: 'body', parameters: [{ type: 'text', text: customerName }, { type: 'text', text: workshopName }, { type: 'text', text: dateStr }] }
      ]
    }
  ];

  console.log(`Sending 'citas_confirmadas' to ${formattedPhone} for ${workshopName} on ${dateStr}...`);

  for (const variant of paramVariants) {
    try {
      const templatePayload: any = {
        name: 'citas_confirmadas',
        language: { code: langCode },
      };
      if (variant.components.length > 0) {
        templatePayload.components = variant.components;
      }

      const response = await axios.post(
        `https://graph.facebook.com/v19.0/${wpPhoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: templatePayload
        },
        {
          headers: {
            'Authorization': `Bearer ${wpToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Template 'citas_confirmadas' sent successfully via Meta [lang=${langCode}, ${variant.label}].`);
      return { success: true, provider: 'meta', data: response.data };
    } catch (err: any) {
      const metaErr = err.response?.data?.error;
      console.log(`❌ ${variant.label} failed — code: ${metaErr?.code}, msg: ${metaErr?.message || err.message}`);
    }
  }

  return { success: false, error: 'No se pudo enviar la plantilla citas_confirmadas por Meta tras probar todas las combinaciones.' };
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
  sendDiagnosticadoReparadoNotification,
  sendVentaPorOrdenNotification,
  sendDirectSalePaidNotification,
  sendCitaConfirmadaNotification
}

export async function checkAndUpdateWhatsAppLimit(workshopId: string): Promise<boolean> {
  if (!workshopId) return true;

  try {
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: org, error } = await supabaseAdmin
      .from('organizations')
      .select('settings')
      .eq('id', workshopId)
      .single();

    if (error || !org) return true;

    const settings = typeof org.settings === 'string' ? JSON.parse(org.settings) : (org.settings || {});
    const subPlan = settings.sub_plan || 'basic';
    const planLimits = getPlanLimits(subPlan);

    if (planLimits.whatsapp_limit === -1) return true;

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const msgCountKey = `whatsapp_count_${currentMonth}`;
    const currentCount = settings[msgCountKey] || 0;

    if (currentCount >= planLimits.whatsapp_limit) {
      console.warn(`WhatsApp limit reached for workshop ${workshopId}. Plan: ${subPlan}, Limit: ${planLimits.whatsapp_limit}`);
      return false;
    }

    settings[msgCountKey] = currentCount + 1;
    await supabaseAdmin
      .from('organizations')
      .update({ settings })
      .eq('id', workshopId);

    return true;
  } catch (err) {
    console.error('Error checking WhatsApp limit:', err);
    return true; // allow by default if db fails
  }
};