import { createAdminClient } from '@/lib/supabase/admin';
import { receiveWhatsAppWebhook, verifyWhatsAppWebhook } from '@/lib/whatsapp-webhook';
import { persistWebhook } from '@/lib/whatsapp-coexistence/webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  return verifyWhatsAppWebhook(request, process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '');
}

export function POST(request: Request) {
  return receiveWhatsAppWebhook(request, {
    appId: process.env.META_APP_ID,
    appSecret: process.env.META_APP_SECRET,
    encryptionKey: process.env.WHATSAPP_WEBHOOK_ENCRYPTION_KEY,
  }, async (receipt, payload) => {
    const { error } = await (createAdminClient() as any).rpc('record_whatsapp_webhook_receipt', {
      p_app_id: receipt.appId, p_payload_sha256: receipt.digest,
      p_payload_ciphertext: receipt.ciphertext, p_payload_bytes: receipt.bytes,
    });
    if (error) throw new Error('Webhook persistence failed');
    // Preserve the durable receipt while applying the tenant-scoped processor.
    // A processing failure returns 503 so Meta can retry; ingestion is idempotent.
    await persistWebhook(payload);
  });
}
