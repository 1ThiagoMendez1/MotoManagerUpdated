'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createRealtimeRefresh } from '@/lib/realtime-refresh';


export default function AdminRealtime() {
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();
        const refresh = createRealtimeRefresh(() => router.refresh());
        
        const channel = supabase.channel('admin-global-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'organizations'
                },
                (payload) => {
                    refresh.schedule();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload) => {
                    refresh.schedule();
                }
            )
            .subscribe();

        return () => {
            refresh.dispose();
            void supabase.removeChannel(channel);
        };
    }, [router]);

    return null; // This component doesn't render anything
}
