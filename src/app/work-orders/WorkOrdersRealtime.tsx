'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function WorkOrdersRealtime() {
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();
        
        const channel = supabase.channel('work-orders-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'work_orders'
                },
                (payload) => {
                    console.log('Realtime update on work_orders:', payload);
                    router.refresh();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'motorcycles'
                },
                (payload) => {
                    console.log('Realtime update on motorcycles:', payload);
                    router.refresh();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'part_requests'
                },
                (payload) => {
                    console.log('Realtime update on part_requests:', payload);
                    router.refresh();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'work_order_services'
                },
                (payload) => {
                    console.log('Realtime update on work_order_services:', payload);
                    router.refresh();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'sale_items'
                },
                (payload) => {
                    console.log('Realtime update on sale_items:', payload);
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [router]);

    return null; // This component doesn't render anything, it just listens for changes
}
