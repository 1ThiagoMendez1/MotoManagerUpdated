import 'server-only';
import { configuration, serviceRpc, type Connection } from './server';
import { digest, extractMessages, seal } from './core';

export async function persistWebhook(body: any) {
  const config = configuration();
  if (body.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) return;
    for (const entry of body.entry) {
      for (const change of Array.isArray(entry.changes) ? entry.changes : []) {
        if (!['messages', 'smb_message_echoes', 'smb_app_state_sync', 'history', 'account_update'].includes(change.field)) continue;
        const value = change.value || {};
        const waba = change.field === 'account_update' ? (value.waba_info?.waba_id || entry.id) : entry.id;
        if (typeof waba !== 'string') continue;
        const connection = await serviceRpc<Connection | null>('find', { waba });
        if (!connection) continue; // Shared app: unrelated Mivra business traffic must be ignored.
        if (change.field !== 'account_update' && value.metadata?.phone_number_id !== connection.phone_id) continue;
        const org = connection.organization_id;
        const messages = extractMessages(value, connection.display_phone).map(message => ({ id: message.id, timestamp: message.timestamp, payload: seal(JSON.stringify(message), org, config.encryptionKey) }));
        const histories = Array.isArray(value.history) ? value.history : [];
        const declined = histories.some((h: any) => h.errors?.some((e: any) => e.code === 2593109));
        const progress = Math.max(0, ...histories.map((h: any) => Number(h.metadata?.progress) || 0));
        await serviceRpc('ingest', { org, phone: connection.phone_id, hash: digest(JSON.stringify(change)), field: change.field,
          payload: seal(JSON.stringify(value), org, config.encryptionKey), messages,
          progress: Math.min(progress, 100), declined,
          disconnected: change.field === 'account_update' && ['PARTNER_REMOVED', 'ACCOUNT_OFFBOARDED'].includes(value.event),
        });
      }
    }
}
