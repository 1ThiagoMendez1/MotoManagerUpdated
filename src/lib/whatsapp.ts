import axios from 'axios';

interface EvolutionAPIConfig {
  baseURL: string;
  apiKey: string;
  instanceName: string;
}

class EvolutionAPI {
  private config: EvolutionAPIConfig;

  constructor(config: EvolutionAPIConfig) {
    this.config = config;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.config.apiKey,
    };
  }

  private getBaseURL() {
    return `${this.config.baseURL}/message/sendText/${this.config.instanceName}`;
  }

  async sendTextMessage(phone: string, message: string): Promise<any> {
    try {
      console.log('📱 Attempting to send WhatsApp message to:', phone);

      const phoneNumber = phone.replace(/\D/g, ''); // Remove non-numeric characters
      console.log('📞 Cleaned phone number:', phoneNumber);

      const formattedPhone = phoneNumber.startsWith('57') ? phoneNumber : `57${phoneNumber}`;
      console.log('📱 Formatted phone number:', formattedPhone);

      const payload = {
        number: formattedPhone,
        text: message,
        delay: 1200, // 1.2 seconds delay
      };

      console.log('📤 Sending payload to Evolution API:', {
        url: this.getBaseURL(),
        payload: { ...payload, text: payload.text.substring(0, 50) + '...' }
      });

      const response = await axios.post(this.getBaseURL(), payload, {
        headers: this.getHeaders(),
      });

      console.log('✅ WhatsApp API Response:', response.data);

      return {
        success: true,
        data: response.data,
        messageId: response.data?.key?.id,
      };
    } catch (error: any) {
      console.error('❌ Error sending WhatsApp message:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: this.getBaseURL()
      });
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  async sendOrderStatusUpdate(phone: string, orderDetails: {
    orderNumber: string;
    status: string;
    customerName: string;
    motorcycleInfo: string;
    technicianName?: string;
  }): Promise<any> {
    console.log('📱 Sending order status update to:', phone, 'Order:', orderDetails.orderNumber);

    const statusMessages = {
      'Diagnosticando': '🔧 Estamos diagnosticando tu motocicleta',
      'Reparado': '✅ Tu motocicleta ha sido reparada',
      'Entregado': '🚀 Tu motocicleta está lista para recoger',
    };

    const message = `*Águilas de Asfalto - Actualización de Orden*

Hola ${orderDetails.customerName},

${statusMessages[orderDetails.status as keyof typeof statusMessages] || 'Estado actualizado'}

*Detalles de la orden:*
📋 Número: ${orderDetails.orderNumber}
🏍️ Vehículo: ${orderDetails.motorcycleInfo}
${orderDetails.technicianName ? `👨‍🔧 Técnico: ${orderDetails.technicianName}` : ''}

*Estado actual:* ${orderDetails.status}

Gracias por confiar en nosotros.
¡Nos vemos pronto!

*Águilas de Asfalto*
🏍️ Tu taller de confianza`;

    console.log('📝 Order status message:', message.substring(0, 100) + '...');
    return this.sendTextMessage(phone, message);
  }

  async sendSaleConfirmation(phone: string, saleDetails: {
    saleNumber: string;
    customerName: string;
    total: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    paymentMethod: string;
  }): Promise<any> {
    const itemsText = saleDetails.items.map(item =>
      `• ${item.name} x${item.quantity} - $${item.price.toLocaleString('es-CO')}`
    ).join('\n');

    const message = `*Águilas de Asfalto - Confirmación de Venta*

¡Gracias por tu compra, ${saleDetails.customerName}!

*Detalles de la venta:*
📄 Número: ${saleDetails.saleNumber}
💰 Total: $${saleDetails.total.toLocaleString('es-CO')}
💳 Método de pago: ${saleDetails.paymentMethod}

*Artículos comprados:*
${itemsText}

¡Gracias por elegirnos!

*Águilas de Asfalto*
🏍️ Tu taller de confianza`;

    return this.sendTextMessage(phone, message);
  }

  async sendLowStockAlert(phone: string, stockDetails: {
    itemName: string;
    currentStock: number;
    minimumStock: number;
  }): Promise<any> {
    const message = `*Águilas de Asfalto - Alerta de Stock Bajo*

⚠️ *ATENCIÓN: Stock Bajo*

*Producto:* ${stockDetails.itemName}
📦 Stock actual: ${stockDetails.currentStock}
🎯 Stock mínimo: ${stockDetails.minimumStock}

Es necesario reponer este artículo pronto.

*Sistema de Inventario*
Águilas de Asfalto`;

    return this.sendTextMessage(phone, message);
  }
}

// Initialize with environment variables
const evolutionAPI = new EvolutionAPI({
  baseURL: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
  apiKey: process.env.EVOLUTION_API_KEY || '',
  instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'default',
});

export default evolutionAPI;
export { EvolutionAPI };