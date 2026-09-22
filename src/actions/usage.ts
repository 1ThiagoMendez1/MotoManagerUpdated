'use server';

import { createAdminClient, getCurrentUserServer } from '@/lib/auth-server';

export async function getPlanUsage() {
  try {
    const user = await getCurrentUserServer();
    const workshopId = user?.workshopId;
    if (!workshopId) {
      return { success: false, data: null };
    }

    const adminClient = await createAdminClient();

    const [
      users,
      clients,
      motorcycles,
      work_orders,
      inventory,
      services,
      sales,
      orgData
    ] = await Promise.all([
      adminClient.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_id', workshopId),
      adminClient.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', workshopId),
      adminClient.from('motorcycles').select('*', { count: 'exact', head: true }).eq('organization_id', workshopId),
      adminClient.from('work_orders').select('*', { count: 'exact', head: true }).eq('organization_id', workshopId),
      adminClient.from('inventory_items').select('*', { count: 'exact', head: true }).eq('organization_id', workshopId),
      adminClient.from('service_catalog').select('*', { count: 'exact', head: true }).eq('organization_id', workshopId),
      adminClient.from('sales').select('*', { count: 'exact', head: true }).eq('organization_id', workshopId),
      adminClient.from('organizations').select('settings').eq('id', workshopId).single()
    ]);

    const settings = orgData.data?.settings || {};
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const msgCountKey = `whatsapp_count_${currentMonth}`;
    const messages = settings[msgCountKey] || 0;

    return {
      success: true,
      data: {
        messages: messages,
        users: users.count || 0,
        clients: clients.count || 0,
        motorcycles: motorcycles.count || 0,
        work_orders: work_orders.count || 0,
        inventory: inventory.count || 0,
        services: services.count || 0,
        sales: sales.count || 0,
      }
    };
  } catch (err) {
    console.error("Error fetching plan usage:", err);
    return { success: false, data: null };
  }
}
