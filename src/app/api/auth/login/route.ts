import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();
        const supabase = await createClient();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('is_super_admin, requires_password_change')
            .eq('id', data.user.id)
            .single();

        return NextResponse.json({
            user: data.user,
            token: data.session?.access_token,
            is_super_admin: profile?.is_super_admin || false,
            requires_password_change: profile?.requires_password_change || false
        });
    } catch (error: any) {
        console.error('API Login Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor al intentar conectar con Supabase' },
            { status: 500 }
        );
    }
}
