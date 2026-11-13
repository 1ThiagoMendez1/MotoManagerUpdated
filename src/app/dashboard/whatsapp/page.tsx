import { connectionOwner } from '@/lib/whatsapp-coexistence/authorization';
import WhatsAppConnection from './WhatsAppConnection';
export const dynamic = 'force-dynamic';
export default async function WhatsAppPage() {
  await connectionOwner();
  return <WhatsAppConnection />;
}
