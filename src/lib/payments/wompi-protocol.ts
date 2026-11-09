import { createHash, timingSafeEqual } from 'node:crypto';

export interface WompiTransaction {
  id: string;
  reference: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED';
  currency: string;
  amount_in_cents: number;
  customer_email: string;
  payment_method_type?: string;
}

export const subscriptionReferencePattern = /^MM-SUB-[a-f0-9]{32}$/;

export function wompiIntegrity(reference: string, amountInCents: number, secret: string) {
  return createHash('sha256').update(`${reference}${amountInCents}COP${secret}`).digest('hex');
}

// Wompi specifies the signed properties in each event; their order can change.
export function validWompiEvent(payload: any, secret: string, headerChecksum?: string | null) {
  const properties = payload?.signature?.properties;
  const checksum = headerChecksum || payload?.signature?.checksum;
  if (!secret || !Array.isArray(properties) || !properties.length || properties.length > 30 ||
      !Number.isSafeInteger(payload?.timestamp) || typeof checksum !== 'string' || !/^[a-f0-9]{64}$/i.test(checksum)) return false;
  const values: string[] = [];
  for (const property of properties) {
    if (typeof property !== 'string' || !/^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*$/.test(property)) return false;
    let value = payload.data;
    for (const part of property.split('.')) {
      if (!value || !Object.hasOwn(value, part)) return false;
      value = value[part];
    }
    if (typeof value !== 'string' && typeof value !== 'number') return false;
    values.push(String(value));
  }
  const expected = createHash('sha256').update(values.join('') + payload.timestamp + secret).digest();
  return timingSafeEqual(expected, Buffer.from(checksum, 'hex'));
}

export function matchesSubscriptionCheckout(transaction: WompiTransaction, checkout: {
  reference: string; amount_in_cents: number; customer_email: string;
}) {
  return transaction.reference === checkout.reference && transaction.currency === 'COP' &&
    transaction.amount_in_cents === Number(checkout.amount_in_cents) &&
    transaction.customer_email?.trim().toLowerCase() === checkout.customer_email.trim().toLowerCase();
}
