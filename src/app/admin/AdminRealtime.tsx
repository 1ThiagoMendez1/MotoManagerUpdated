'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';


export default function AdminRealtime() {
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();
        
        const channel = supabase.channel('admin-global-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'workshops'
                },
                (payload) => {
                    console.log('Realtime update on workshops:', payload);
                    router.refresh();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_profiles'
                },
                (payload) => {
                    console.log('Realtime update on users:', payload);
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [router]);

    return null; // This component doesn't render anything
}
