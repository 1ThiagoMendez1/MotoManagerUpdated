'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';


export default function AdminRealtime() {
    const router = useRouter();

    useEffect(() => {
        const supabase = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'then') return (resolve) => resolve({ data: [], count: 0, error: null });
    return () => supabase;
  }
}) as any;
        
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
