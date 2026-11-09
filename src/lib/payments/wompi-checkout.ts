export interface WompiCheckout {
  publicKey: string;
  signature: string;
  reference: string;
  amountInCents: number;
  currency: string;
  redirectUrl?: string;
  customerEmail?: string;
  customerName?: string;
}

export function openWompiCheckout(checkout: WompiCheckout) {
  const form = document.createElement('form');
  form.method = 'GET';
  form.action = 'https://checkout.wompi.co/p/';
  const params: Record<string, string> = {
    'public-key': checkout.publicKey,
    currency: checkout.currency,
    'amount-in-cents': String(checkout.amountInCents),
    reference: checkout.reference,
    'signature:integrity': checkout.signature,
  };
  if (checkout.redirectUrl) params['redirect-url'] = checkout.redirectUrl;
  if (checkout.customerEmail) params['customer-data:email'] = checkout.customerEmail;
  if (checkout.customerName) params['customer-data:full-name'] = checkout.customerName;
  for (const [name, value] of Object.entries(params)) {
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = name; input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
