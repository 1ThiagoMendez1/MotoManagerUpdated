'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createRealtimeRefresh } from '@/lib/realtime-refresh';

export default function WorkOrdersRealtime({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const refresh = createRealtimeRefresh(() => router.refresh());
    let channel = supabase.channel(`work-orders-${organizationId}`);
    for (const table of ['work_orders', 'motorcycles', 'part_requests']) {
      channel = channel.on('postgres_changes', {
        event: '*', schema: 'public', table, filter: `organization_id=eq.${organizationId}`,
      }, refresh.schedule);
    }
    // These child tables have no organization_id. Their RLS policies scope access.
    for (const table of ['work_order_services', 'sale_items']) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh.schedule);
    }
    channel.subscribe();
    return () => { refresh.dispose(); void supabase.removeChannel(channel); };
  }, [router, organizationId]);
  return null;
}
