import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const supabase = await createClient();

    // Sign out from Supabase (this invalidates the session on the server)
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Error signing out:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create response and clear any specific cookies if needed, 
    // though supabase.auth.signOut() handles the main auth cookie.
    const response = NextResponse.json({ success: true });

    return response;
}
