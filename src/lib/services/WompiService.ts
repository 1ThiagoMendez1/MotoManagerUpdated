/**
 * WompiService - Servicio para integración con la API de Wompi Colombia.
 *
 * FLUJO CORRECTO para pagos recurrentes en Wompi Colombia:
 * 1. Frontend tokeniza la tarjeta → POST /tokens/cards → obtiene card_token
 * 2. Frontend obtiene acceptance_token → GET /merchants/:pub_key
 * 3. Backend crea una Payment Source → POST /payment_sources (una vez por usuario)
 * 4. Backend crea transacciones usando el payment_source_id
 *
 * NOTA: Wompi Colombia NO tiene endpoints /customers ni /subscriptions.
 */
export class WompiService {
  private readonly baseUrl: string;
  private readonly privateKey: string;
  private readonly publicKey: string;
  private readonly eventsSecret: string;

  constructor() {
    this.baseUrl =
      process.env.WOMPI_ENVIRONMENT === 'production'
        ? 'https://production.wompi.co/v1'
        : 'https://sandbox.wompi.co/v1';

    this.privateKey = process.env.WOMPI_PRIVATE_KEY || '';
    this.publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '';
    this.eventsSecret = process.env.WOMPI_EVENTS_SECRET || '';

    if (!this.privateKey) {
      console.warn('[WompiService] WOMPI_PRIVATE_KEY no está configurada. Las llamadas al backend fallarán.');
    }
  }

  private async fetchWompi(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.privateKey}`,
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[WompiService] Error ${response.status} en ${endpoint}:`, errorBody);
      throw new Error(`Wompi API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Obtiene el acceptance_token del merchant.
   * Necesario para crear Payment Sources y Transacciones.
   * Se llama con la PUBLIC KEY (no private).
   */
  async getMerchantAcceptanceToken(): Promise<string> {
    const url = `${this.baseUrl}/merchants/${this.publicKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      console.error('[WompiService] No se pudo obtener merchant info:', body);
      throw new Error('No se pudo obtener el acceptance_token del merchant de Wompi.');
    }
    const data = await response.json();
    return data.data.presigned_acceptance.acceptance_token;
  }

  /**
   * Crea una Payment Source (Fuente de Pago) en Wompi.
   * Esto vincula un token de tarjeta con un email para cobros futuros.
   * Requiere: card_token (del frontend), acceptance_token (del merchant), userEmail.
   * 
   * @returns El objeto payment_source con su ID para cobros futuros.
   */
  async createPaymentSource(cardToken: string, acceptanceToken: string, userEmail: string) {
    const body = {
      type: 'CARD',
      token: cardToken,
      customer_email: userEmail,
      acceptance_token: acceptanceToken,
    };

    const data = await this.fetchWompi('/payment_sources', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return data.data; // { id, type, status, ... }
  }

  /**
   * Crea una transacción con una Payment Source existente.
   * Usado para el cobro inicial y los cobros recurrentes.
   *
   * @param paymentSourceId - ID de la Payment Source creada previamente.
   * @param amountInCents - Monto en centavos (e.g., 50000 = $500 COP).
   * @param customerEmail - Email del cliente.
   * @param reference - Referencia única de la transacción.
   * @param acceptanceToken - Token de aceptación del merchant.
   */
  async createTransaction(
    paymentSourceId: number,
    amountInCents: number,
    customerEmail: string,
    reference: string,
    acceptanceToken: string,
  ) {
    const body = {
      amount_in_cents: amountInCents,
      currency: 'COP',
      customer_email: customerEmail,
      reference,
      acceptance_token: acceptanceToken,
      payment_method: {
        installments: 1,
      },
      payment_source_id: paymentSourceId,
    };

    const data = await this.fetchWompi('/transactions', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return data.data; // { id, status, amount_in_cents, ... }
  }

  /**
   * Obtiene los detalles de una transacción por su ID.
   */
  async getTransaction(transactionId: string) {
    const data = await this.fetchWompi(`/transactions/${transactionId}`);
    return data.data;
  }

  /**
   * Valida la firma del Webhook de Wompi.
   */
  validateWebhookSignature(payload: any, signatureStr: string, timestamp: string): boolean {
    const crypto = require('crypto');

    if (payload && payload.data && payload.data.transaction) {
      const tx = payload.data.transaction;
      const amount = tx.amount_in_cents;
      const id = tx.id;
      const status = tx.status;
      const envTimestamp = payload.timestamp;

      const concatenatedStr = `${id}${status}${amount}${envTimestamp}${this.eventsSecret}`;
      const expectedChecksum = crypto.createHash('sha256').update(concatenatedStr).digest('hex');

      if (payload.signature && payload.signature.checksum) {
        return payload.signature.checksum === expectedChecksum;
      }

      return signatureStr === expectedChecksum;
    }

    return false;
  }
}

export const wompiService = new WompiService();
