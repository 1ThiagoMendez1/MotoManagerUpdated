import 'server-only';

// Read runtime variables as well as the optional public key baked into old images.
// A standalone build can be made before production credentials are injected.
export function wompiConfig() {
  const env = process.env;
  const publicKey = (env.WOMPI_PUBLIC_KEY || env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || '').trim();
  const privateKey = (env.WOMPI_PRIVATE_KEY || '').trim();
  const integritySecret = (env.WOMPI_INTEGRITY_SECRET || '').trim();
  const eventsSecret = (env.WOMPI_EVENTS_SECRET || '').trim();
  const production = publicKey.startsWith('pub_prod_') || privateKey.startsWith('prv_prod_') || env.WOMPI_ENVIRONMENT === 'production';
  return { publicKey, privateKey, integritySecret, eventsSecret, production,
    apiUrl: `https://${production ? 'production' : 'sandbox'}.wompi.co/v1` };
}

export function subscriptionCheckoutReady() {
  const { publicKey, privateKey, integritySecret, production } = wompiConfig();
  const environment = production ? 'prod' : 'test';
  return publicKey.startsWith(`pub_${environment}_`) && privateKey.startsWith(`prv_${environment}_`) &&
    integritySecret.startsWith(`${environment}_integrity_`);
}

export async function fetchWompiTransaction(transactionId: string) {
  if (!/^[a-zA-Z0-9-]{1,150}$/.test(transactionId)) throw new Error('Falta el identificador de la transacción de Wompi.');
  const { privateKey, apiUrl } = wompiConfig();
  if (!privateKey) throw new Error('El pago en línea no está disponible temporalmente. Intenta nuevamente en unos minutos.');
  const response = await fetch(`${apiUrl}/transactions/${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${privateKey}` }, cache: 'no-store', signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('No pudimos consultar tu pago con Wompi. Puedes volver a verificar sin pagar otra vez.');
  const { data } = await response.json();
  if (!data || data.id !== transactionId) throw new Error('La respuesta de Wompi no corresponde a esta transacción.');
  return data as import('./wompi-protocol').WompiTransaction;
}
